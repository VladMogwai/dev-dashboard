import React, { useState, useEffect, useRef, useCallback } from 'react';
import Terminal from './Terminal';
import { checkClaude, destroyPty } from '../ipc';

/**
 * ClaudeTab — owns the full lifecycle of the Claude terminal pane.
 *
 * Props:
 *   projectId    string  — used as PTY session key
 *   projectPath  string  — project root (reserved for future use)
 *   active       bool    — whether this tab is currently visible
 */
export default function ClaudeTab({ projectId, projectPath, active }) {
  const [claudeStatus, setClaudeStatus] = useState('checking');
  // Increment this key to force-remount the Terminal (new PTY session)
  const [sessionKey, setSessionKey] = useState(0);
  const sendInputRef = useRef(null);

  // ── Check whether Claude Code is installed ────────────────────────────────

  useEffect(() => {
    setClaudeStatus('checking');
    checkClaude().then((available) => {
      setClaudeStatus(available ? 'available' : 'not-installed');
    }).catch(() => {
      setClaudeStatus('not-installed');
    });
  }, []);

  // ── Retry button — re-check and, if now available, remount terminal ───────

  const handleRetry = useCallback(() => {
    setClaudeStatus('checking');
    checkClaude().then((available) => {
      if (available) {
        setClaudeStatus('available');
        // Bump key so Terminal remounts with a fresh PTY
        setSessionKey((k) => k + 1);
      } else {
        setClaudeStatus('not-installed');
      }
    }).catch(() => {
      setClaudeStatus('not-installed');
    });
  }, []);

  // ── Terminal ready — send `claude\n` after a short delay ─────────────────

  const handleReady = useCallback(({ sendInput }) => {
    sendInputRef.current = sendInput;
    setTimeout(() => {
      sendInput('claude\n');
    }, 300);
  }, []);

  // ── New Session — destroy existing PTY and remount ────────────────────────

  const handleNewSession = useCallback(() => {
    // Destroy the current PTY session (Terminal will have already created it)
    const sessionId = `${projectId}-claude`;
    destroyPty(sessionId);
    sendInputRef.current = null;
    // Bump key to remount the Terminal component → new PTY + new shell
    setSessionKey((k) => k + 1);
  }, [projectId]);

  // ── Render: checking ─────────────────────────────────────────────────────

  if (claudeStatus === 'checking') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0d1117',
        }}
      >
        <svg
          style={{ width: 20, height: 20, color: '#58a6ff' }}
          className="animate-spin"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  // ── Render: not installed ────────────────────────────────────────────────

  if (claudeStatus === 'not-installed') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0d1117',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '32px 24px',
        }}
      >
        <div
          style={{
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: 10,
            padding: '20px 24px',
            maxWidth: 380,
            width: '100%',
          }}
        >
          <p style={{ color: '#e6edf3', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            Claude Code is not installed.
          </p>
          <p style={{ color: '#8b949e', fontSize: 12, marginBottom: 12 }}>
            To install, run:
          </p>
          <code
            style={{
              display: 'block',
              background: '#0d1117',
              border: '1px solid #30363d',
              borderRadius: 6,
              padding: '8px 12px',
              fontFamily: 'Menlo, Monaco, "Courier New", monospace',
              fontSize: 12,
              color: '#bc8cff',
              marginBottom: 16,
              wordBreak: 'break-all',
            }}
          >
            npm install -g @anthropic-ai/claude-code
          </code>
          <button
            onClick={handleRetry}
            style={{
              padding: '6px 14px',
              background: '#21262d',
              border: '1px solid #30363d',
              borderRadius: 6,
              color: '#e6edf3',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'background 120ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#30363d')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#21262d')}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Render: available ────────────────────────────────────────────────────

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#0d1117' }}>
      {/* Toolbar */}
      <div
        style={{
          flexShrink: 0,
          padding: '6px 10px',
          borderBottom: '1px solid #21262d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          background: '#0d1117',
        }}
      >
        <button
          onClick={handleNewSession}
          style={{
            padding: '4px 10px',
            background: '#21262d',
            border: '1px solid #30363d',
            borderRadius: 5,
            color: '#8b949e',
            fontSize: 11,
            cursor: 'pointer',
            transition: 'background 120ms, color 120ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#30363d';
            e.currentTarget.style.color = '#e6edf3';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#21262d';
            e.currentTarget.style.color = '#8b949e';
          }}
        >
          New Session
        </button>
      </div>

      {/* Terminal */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Terminal
          key={`${projectId}-claude-${sessionKey}`}
          projectId={projectId}
          type="claude"
          active={active}
          onReady={handleReady}
        />
      </div>
    </div>
  );
}
