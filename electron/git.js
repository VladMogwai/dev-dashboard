"use strict";

const { exec, execFile } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

// When Electron launches it can have a stripped PATH — add all common locations
const GIT_ENV = {
  ...process.env,
  PATH: [
    "/usr/local/bin",
    "/opt/homebrew/bin",
    "/opt/homebrew/sbin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
    process.env.PATH || "",
  ].join(":"),
};

async function run(cmd, cwd) {
  const { stdout } = await execAsync(cmd, {
    cwd,
    env: GIT_ENV,
    timeout: 5000,
  });
  return stdout.trim();
}

// execFile-based helper — avoids any shell interpretation of arguments
async function runFile(args, cwd) {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    env: GIT_ENV,
    timeout: 8000,
  });
  return stdout.trim();
}

async function runFileLong(args, cwd) {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    env: GIT_ENV,
    timeout: 30000,
    maxBuffer: 50 * 1024 * 1024,
  });
  return stdout;
}

async function getInfo(projectPath) {
  // 1. Confirm it's inside a git repo
  try {
    await run("git rev-parse --git-dir", projectPath);
  } catch {
    return { branch: null, lastCommit: null, isRepo: false };
  }

  // 2. Get branch — symbolic-ref is what git uses internally (same as GitHub Desktop)
  let branch = null;
  try {
    branch = await run("git symbolic-ref --short HEAD", projectPath);
  } catch {
    // Detached HEAD → show short commit hash instead
    try {
      branch = await run("git rev-parse --short HEAD", projectPath);
    } catch {
      branch = null;
    }
  }

  // 3. Get last commit
  let lastCommit = null;
  try {
    // %x00 as separator to handle messages with | in them
    const raw = await run("git log -1 --format=%H%x00%s%x00%an%x00%ar", projectPath);
    const [hash, message, author, date] = raw.split("\x00");
    lastCommit = {
      hash: hash ? hash.slice(0, 7) : "",
      message: message || "",
      author: author || "",
      date: date || "",
    };
  } catch {
    // non-fatal
  }

  return { branch, lastCommit, isRepo: true };
}

async function getBranches(projectPath) {
  // Confirm it's inside a git repo first
  try {
    await run("git rev-parse --git-dir", projectPath);
  } catch {
    return { current: null, branches: [] };
  }

  // Get current branch
  let current = null;
  try {
    current = await run("git symbolic-ref --short HEAD", projectPath);
  } catch {
    try {
      current = await run("git rev-parse --short HEAD", projectPath);
    } catch {
      current = null;
    }
  }

  // Step 1: get branch names via `git branch` — simple, no format tricks
  let branches = [];
  try {
    const namesRaw = await runFile(["branch", "--sort=-committerdate"], projectPath);
    const names = namesRaw
      .split("\n")
      .map((l) => l.replace(/^\*\s*/, "").trim())
      .filter(Boolean);

    // Step 2: get relative dates for all branches in one call using for-each-ref
    // Use a tab separator — safe because git branch names cannot contain tabs
    let dateMap = {};
    try {
      const dateRaw = await runFile(
        [
          "for-each-ref",
          "--sort=-committerdate",
          "--format=%(refname:short)\t%(committerdate:relative)",
          "refs/heads/",
        ],
        projectPath,
      );
      for (const line of dateRaw.split("\n").filter(Boolean)) {
        const tab = line.indexOf("\t");
        if (tab >= 0) dateMap[line.slice(0, tab)] = line.slice(tab + 1).trim();
      }
    } catch {
      /* dates are optional */
    }

    branches = names.map((name) => ({
      name,
      date: dateMap[name] || "",
      isCurrent: name === current,
    }));
  } catch (err) {
    console.error("getBranches error:", err.message);
  }

  return { current, branches };
}

async function checkoutBranch(projectPath, branchName) {
  // Use execFile to avoid shell injection — branchName is passed as a literal arg
  try {
    await execFileAsync("git", ["checkout", branchName], {
      cwd: projectPath,
      env: GIT_ENV,
      timeout: 10000,
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
}

async function getCommitLog(repoPath, limit = 100, skip = 0) {
  try {
    await run("git rev-parse --git-dir", repoPath);
  } catch {
    return { commits: [], isRepo: false };
  }
  try {
    const raw = await runFile(
      [
        "log",
        "-n",
        String(limit),
        `--skip=${skip}`,
        "--format=%x1e%H%x1f%s%x1f%an%x1f%ar%x1f%ae",
        "--no-decorate",
      ],
      repoPath,
    );
    if (!raw.trim()) return { commits: [], isRepo: true };
    const commits = raw
      .split("\x1e")
      .filter(Boolean)
      .map((block) => {
        const parts = block.trim().split("\x1f");
        return {
          hash: parts[0] || "",
          message: parts[1] || "",
          author: parts[2] || "",
          dateRel: parts[3] || "",
          email: parts[4] || "",
        };
      });
    return { commits, isRepo: true };
  } catch {
    return { commits: [], isRepo: true };
  }
}

async function getCommitFiles(repoPath, hash) {
  try {
    let parent;
    try {
      parent = (await runFile(["rev-parse", `${hash}^`], repoPath)).trim();
    } catch {
      parent = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
    }
    const [numstatRaw, nameStatusRaw] = await Promise.all([
      runFileLong(["diff", "--numstat", parent, hash], repoPath).catch(() => ""),
      runFile(["diff", "--name-status", "-M", parent, hash], repoPath).catch(() => ""),
    ]);
    const statsMap = {};
    for (const line of numstatRaw.split("\n").filter(Boolean)) {
      const parts = line.split("\t");
      if (parts.length >= 3) {
        const filename = parts.slice(2).join("\t");
        statsMap[filename] = {
          added: parts[0] === "-" ? 0 : parseInt(parts[0], 10) || 0,
          deleted: parts[1] === "-" ? 0 : parseInt(parts[1], 10) || 0,
        };
      }
    }
    const files = [];
    for (const line of nameStatusRaw.split("\n").filter(Boolean)) {
      const parts = line.split("\t");
      const type = parts[0][0];
      const isRename = type === "R" || type === "C";
      const oldPath = parts[1] || "";
      const newPath = isRename ? parts[2] || "" : "";
      const displayPath = newPath || oldPath;
      const st = statsMap[displayPath] || statsMap[oldPath] || { added: 0, deleted: 0 };
      files.push({
        type,
        path: displayPath,
        oldPath: isRename ? oldPath : null,
        added: st.added,
        deleted: st.deleted,
      });
    }
    return files;
  } catch {
    return [];
  }
}

async function getCommitDiff(repoPath, hash) {
  try {
    let parent;
    try {
      parent = (await runFile(["rev-parse", `${hash}^`], repoPath)).trim();
    } catch {
      parent = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
    }
    return await runFileLong(["diff", "--no-color", "-M", parent, hash], repoPath);
  } catch {
    return "";
  }
}

const DIFF_SIZE_LIMIT = 2 * 1024 * 1024; // 2 MB cap to keep IPC fast

async function getWorkingTreeDiff(repoPath) {
  try {
    await run("git rev-parse --git-dir", repoPath);
  } catch {
    return { isRepo: false, unstaged: "", staged: "" };
  }
  const tryDiff = async (...args) => runFileLong(args, repoPath).catch(() => "");
  const [unstaged, staged] = await Promise.all([
    tryDiff("diff", "HEAD", "--no-color").then((r) => r || tryDiff("diff", "--no-color")),
    tryDiff("diff", "--cached", "HEAD", "--no-color").then(
      (r) => r || tryDiff("diff", "--cached", "--no-color"),
    ),
  ]);
  // Truncate to avoid sending huge payloads over IPC
  const truncate = (s) =>
    s.length > DIFF_SIZE_LIMIT
      ? s.slice(0, DIFF_SIZE_LIMIT) + "\n\n[diff truncated — too large to display]\n"
      : s;
  return { isRepo: true, unstaged: truncate(unstaged), staged: truncate(staged) };
}

// Returns structured list of changed files with staging status
// Format: [{ path, x (staged status), y (unstaged status), isStaged, isUnstaged, isUntracked }]
async function getDefaultBranch(repoPath) {
  // 1. Try remote HEAD reference (most reliable)
  try {
    const ref = await runFile(["symbolic-ref", "refs/remotes/origin/HEAD"], repoPath);
    return ref.replace("refs/remotes/origin/", "").trim();
  } catch {}
  // 2. Check if 'main' exists locally
  try {
    await runFile(["rev-parse", "--verify", "main"], repoPath);
    return "main";
  } catch {}
  // 3. Fall back to master
  return "master";
}

async function createBranch(repoPath, branchName, setUpstream) {
  try {
    const base = await getDefaultBranch(repoPath);

    // Checkout base branch and pull latest before branching
    await runFile(["checkout", base], repoPath);
    try {
      await runFile(["pull"], repoPath);
    } catch {
      // pull failure is non-fatal (e.g. no remote) — continue
    }

    // Create and switch to new branch from base
    await runFile(["checkout", "-b", branchName], repoPath);

    if (setUpstream) {
      const { stderr } = await execFileAsync(
        "git",
        ["push", "-u", "origin", branchName],
        {
          cwd: repoPath,
          env: GIT_ENV,
          timeout: 30000,
        },
      ).catch((err) => ({ stderr: err.stderr || err.message }));
      void stderr;
    }
    return { success: true, baseBranch: base };
  } catch (err) {
    return { success: false, error: (err.stderr || err.message || String(err)).trim() };
  }
}

async function getStagingStatus(repoPath) {
  try {
    await run("git rev-parse --git-dir", repoPath);
  } catch {
    return { isRepo: false, files: [], branch: null };
  }

  let branch = null;
  try {
    branch = await run("git symbolic-ref --short HEAD", repoPath);
  } catch {}

  let files = [];
  try {
    const raw = await runFileLong(["status", "--porcelain=v1", "-u"], repoPath);

    for (const line of raw.split("\n")) {
      // Skip empty lines
      if (line.length < 3) continue;

      // porcelain v1 format is EXACTLY:
      // position 0: X = index (staged) status char
      // position 1: Y = working tree (unstaged) status char
      // position 2: space (always)
      // position 3+: file path
      const x = line[0];
      const y = line[1];
      // position 2 is always a literal space — skip it with substring(3)
      let filePath = line.substring(3);

      // Handle renames: "old -> new" — take the new path
      if (filePath.includes(" -> ")) {
        filePath = filePath.split(" -> ")[1];
      }

      // Remove any trailing whitespace or \r (Windows line endings)
      filePath = filePath.trim();

      if (!filePath) continue;

      const isUntracked = x === "?" && y === "?";
      const isIgnored = x === "!" && y === "!";
      if (isIgnored) continue;

      const isStaged = !isUntracked && x !== " " && x !== "?";
      const isUnstaged = !isUntracked && y !== " " && y !== "?";

      console.log(
        "[git] line:",
        JSON.stringify(line),
        "→ x:",
        JSON.stringify(x),
        "y:",
        JSON.stringify(y),
        "| staged:",
        isStaged,
        "unstaged:",
        isUnstaged,
        "untracked:",
        isUntracked,
      );
      files.push({ path: filePath, x, y, isStaged, isUnstaged, isUntracked });
    }
  } catch (err) {
    console.error("[git] getStagingStatus error:", err.message);
  }

  return { isRepo: true, files, branch };
}

async function stageFile(repoPath, filePath) {
  console.log("[git] stageFile:", repoPath, filePath);
  try {
    await runFile(["add", "--", filePath], repoPath);
    console.log("[git] stageFile: success");
    return { success: true };
  } catch (err) {
    const msg = (err.stderr || err.message || String(err)).trim();
    console.error("[git] stageFile failed:", msg);
    return { success: false, error: msg };
  }
}

async function unstageFile(repoPath, filePath) {
  console.log("[git] unstageFile:", repoPath, filePath);
  try {
    try {
      await runFile(["restore", "--staged", "--", filePath], repoPath);
    } catch (restoreErr) {
      console.error(
        "[polvoo] git restore --staged failed:",
        restoreErr.stderr || restoreErr.message,
      );
      try {
        await runFile(["reset", "HEAD", "--", filePath], repoPath);
      } catch (resetErr) {
        console.error(
          "[polvoo] git reset HEAD failed:",
          resetErr.stderr || resetErr.message,
        );
        throw resetErr;
      }
    }
    console.log("[git] unstageFile: success");
    return { success: true };
  } catch (err) {
    const msg = (err.stderr || err.message || String(err)).trim();
    console.error("[git] unstageFile failed:", repoPath, filePath, msg);
    return { success: false, error: msg };
  }
}

async function stageAll(repoPath) {
  console.log("[git] stageAll:", repoPath);
  try {
    await runFile(["add", "-A"], repoPath);
    console.log("[git] stageAll: success");
    return { success: true };
  } catch (err) {
    const msg = (err.stderr || err.message || String(err)).trim();
    console.error("[git] stageAll failed:", msg);
    return { success: false, error: msg };
  }
}

async function unstageAll(repoPath) {
  console.log("[git] unstageAll:", repoPath);

  // Check whether anything is actually staged before running
  let statusRaw = "";
  try {
    statusRaw = await runFile(["status", "--porcelain=v1"], repoPath);
  } catch {}
  const hasStaged = statusRaw
    .split("\n")
    .some((l) => l.length >= 2 && l[0] !== " " && l[0] !== "?" && l[0] !== "!");
  console.log(
    "[git] unstageAll: hasStaged =",
    hasStaged,
    "| raw:",
    JSON.stringify(statusRaw),
  );

  if (!hasStaged) {
    console.log("[git] unstageAll: nothing staged, skipping");
    return { success: true };
  }

  try {
    const out = await runFile(["restore", "--staged", "."], repoPath);
    console.log("[git] unstageAll restore --staged succeeded:", out);
    return { success: true };
  } catch (err1) {
    console.error("[git] restore --staged . failed:", err1.stderr || err1.message);
    try {
      const out2 = await runFile(["reset", "HEAD", "--", "."], repoPath);
      console.log("[git] unstageAll reset HEAD succeeded:", out2);
      return { success: true };
    } catch (err2) {
      const msg = (err2.stderr || err2.message || String(err2)).trim();
      console.error("[git] unstageAll reset HEAD also failed:", msg);
      return { success: false, error: msg };
    }
  }
}

async function commitChanges(repoPath, summary, description) {
  try {
    const message = description ? `${summary}\n\n${description}` : summary;
    await runFile(["commit", "-m", message], repoPath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function pushChanges(repoPath) {
  try {
    const { stdout, stderr } = await execFileAsync("git", ["push"], {
      cwd: repoPath,
      env: GIT_ENV,
      timeout: 30000,
    });
    return { success: true, output: stdout + stderr };
  } catch (err) {
    // git push sometimes writes progress to stderr but still succeeds
    const output = (err.stdout || "") + (err.stderr || "");
    return { success: false, error: err.message, output };
  }
}

async function pullChanges(repoPath, fromBranch) {
  try {
    // Use execFileAsync to prevent shell injection via fromBranch
    const args = fromBranch ? ["pull", "origin", fromBranch] : ["pull"];
    const { stdout, stderr } = await execFileAsync("git", args, {
      cwd: repoPath,
      env: GIT_ENV,
      timeout: 30000,
    });
    return { success: true, output: (stdout + stderr).trim() };
  } catch (err) {
    return { success: false, error: (err.stderr || err.message || String(err)).trim() };
  }
}

async function discardFile(repoPath, filePath) {
  console.log("[git] discardFile:", repoPath, filePath);
  try {
    try {
      await runFile(["restore", "--", filePath], repoPath);
    } catch {
      await runFile(["checkout", "--", filePath], repoPath);
    }
    console.log("[git] discardFile: success");
    return { success: true };
  } catch (err) {
    const msg = (err.stderr || err.message || String(err)).trim();
    console.error("[git] discardFile failed:", msg);
    return { success: false, error: msg };
  }
}

module.exports = {
  getInfo,
  getBranches,
  checkoutBranch,
  createBranch,
  getDefaultBranch,
  getCommitLog,
  getCommitFiles,
  getCommitDiff,
  getWorkingTreeDiff,
  getStagingStatus,
  stageFile,
  unstageFile,
  stageAll,
  unstageAll,
  commitChanges,
  pushChanges,
  pullChanges,
  discardFile,
};
