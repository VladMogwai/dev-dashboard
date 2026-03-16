import { useState, useEffect, useCallback } from 'react';
import {
  getProjects,
  getGitInfo,
  addProject as ipcAddProject,
  removeProject as ipcRemoveProject,
  onProcessStatusUpdate,
  onGitUpdate,
} from '../ipc';

export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [gitInfo, setGitInfo] = useState({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await getProjects();
    setProjects(list);
    setLoading(false);

    // Eagerly fetch git info for all projects — don't wait for poll events
    for (const p of list) {
      getGitInfo(p.path)
        .then((info) => {
          setGitInfo((prev) => ({ ...prev, [p.id]: info }));
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    refresh();

    const unsubStatus = onProcessStatusUpdate(({ projectId, status }) => {
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, status } : p))
      );
    });

    // Live git updates from 5s polling
    const unsubGit = onGitUpdate(({ projectId, branch, lastCommit, isRepo }) => {
      setGitInfo((prev) => ({ ...prev, [projectId]: { branch, lastCommit, isRepo } }));
    });

    return () => {
      unsubStatus();
      unsubGit();
    };
  }, [refresh]);

  const addProject = useCallback(async (data) => {
    const project = await ipcAddProject(data);
    setProjects((prev) => [...prev, project]);
    // Fetch git info for the newly added project right away
    getGitInfo(project.path)
      .then((info) => setGitInfo((prev) => ({ ...prev, [project.id]: info })))
      .catch(() => {});
    return project;
  }, []);

  const removeProject = useCallback(async (id) => {
    await ipcRemoveProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setGitInfo((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const updateProjectStatus = useCallback((projectId, status) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, status } : p))
    );
  }, []);

  return { projects, gitInfo, loading, addProject, removeProject, updateProjectStatus, refresh };
}
