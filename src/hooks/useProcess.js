import { useState, useEffect, useRef, useCallback } from 'react';
import { startProcess, stopProcess, restartProcess, runCommand, killCommand, onLogOutput, onCommandStatus } from '../ipc';

const MAX_LOG_LINES = 5000;

export function useProcess(projectId) {
  const [logs, setLogs] = useState([]);
  const [runningCmd, setRunningCmd] = useState(null);
  const logsRef = useRef([]);

  useEffect(() => {
    if (!projectId) return;

    const unsubLog = onLogOutput(({ projectId: pid, type, data }) => {
      if (pid !== projectId) return;
      const lines = data.split('\n');
      const newEntries = lines.map((line) => ({ type, text: line }));
      logsRef.current = [...logsRef.current, ...newEntries].slice(-MAX_LOG_LINES);
      setLogs([...logsRef.current]);
    });

    const unsubStatus = onCommandStatus(({ projectId: pid, command, status }) => {
      if (pid !== projectId) return;
      setRunningCmd(status === 'running' ? command : null);
    });

    return () => {
      unsubLog();
      unsubStatus();
    };
  }, [projectId]);

  const clearLogs = useCallback(() => {
    logsRef.current = [];
    setLogs([]);
  }, []);

  const run = useCallback((cmd) => runCommand(projectId, cmd), [projectId]);

  const killCmd = useCallback((cmd) => {
    const target = cmd || runningCmd;
    if (target) killCommand(projectId, target);
  }, [projectId, runningCmd]);

  return { logs, clearLogs, run, killCmd, runningCmd };
}
