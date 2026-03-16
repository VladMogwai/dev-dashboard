import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getBranches, checkoutBranch, createBranch } from '../ipc';

// Git branch icon
function GitBranchIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z" />
    </svg>
  );
}

function ChevronDownIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
  );
}

function CheckIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
  );
}

function SpinnerIcon({ className }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function BranchSwitcher({ projectPath, currentBranch, onBranchChange }) {
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(null); // branch name being checked out

  // New branch form state
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [setUpstream, setSetUpstream] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const wrapperRef = useRef(null);
  const filterInputRef = useRef(null);
  const newBranchInputRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setFilter('');
        setShowNewBranch(false);
        setNewBranchName('');
        setCreateError('');
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Fetch branches when opened
  const handleOpen = useCallback(async () => {
    if (open) {
      setOpen(false);
      setFilter('');
      return;
    }

    setOpen(true);
    setLoading(true);
    setFilter('');
    setBranches([]);

    try {
      const result = await getBranches(projectPath);
      setBranches(result.branches || []);
    } catch {
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, [open, projectPath]);

  // Focus inputs when relevant panels open
  useEffect(() => {
    if (open && !showNewBranch && filterInputRef.current) {
      setTimeout(() => filterInputRef.current && filterInputRef.current.focus(), 50);
    }
    if (open && showNewBranch && newBranchInputRef.current) {
      setTimeout(() => newBranchInputRef.current && newBranchInputRef.current.focus(), 50);
    }
  }, [open, showNewBranch]);

  const handleCreateBranch = useCallback(async () => {
    const name = newBranchName.trim();
    if (!name || creating) return;
    setCreating(true);
    setCreateError('');
    const result = await createBranch(projectPath, name, setUpstream);
    setCreating(false);
    if (result.success) {
      setOpen(false);
      setShowNewBranch(false);
      setNewBranchName('');
      setCreateError('');
      if (onBranchChange) onBranchChange();
    } else {
      setCreateError(result.error || 'Failed to create branch');
    }
  }, [newBranchName, creating, projectPath, setUpstream, onBranchChange]);

  const handleCheckout = useCallback(async (branchName) => {
    if (branchName === currentBranch || switching) return;

    setSwitching(branchName);
    try {
      const result = await checkoutBranch(projectPath, branchName);
      if (result.success) {
        setOpen(false);
        setFilter('');
        if (onBranchChange) onBranchChange();
      } else {
        console.error('Checkout failed:', result.error);
      }
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setSwitching(null);
    }
  }, [currentBranch, switching, projectPath, onBranchChange]);

  // Filter branches
  const lowerFilter = filter.toLowerCase().trim();
  const filteredBranches = lowerFilter
    ? branches.filter((b) => b.name.toLowerCase().includes(lowerFilter))
    : branches;

  // Split into recent (first 6 non-current by date) and other
  const nonCurrent = filteredBranches.filter((b) => !b.isCurrent);
  const recentBranches = nonCurrent.slice(0, 6);
  const otherBranches = nonCurrent.slice(6);
  const currentBranchEntry = filteredBranches.find((b) => b.isCurrent);

  if (!currentBranch) {
    return null;
  }

  return (
    <div ref={wrapperRef} className="relative flex-shrink-0">
      {/* Trigger pill button */}
      <button
        onClick={handleOpen}
        className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 hover:border-slate-600/60 transition-colors text-slate-300 hover:text-slate-100 max-w-[180px]"
        title={currentBranch}
      >
        <GitBranchIcon className="w-3 h-3 text-slate-500 flex-shrink-0" />
        <span className="font-mono text-xs truncate">{currentBranch}</span>
        <ChevronDownIcon className={`w-3 h-3 text-slate-500 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-72 bg-[#1a2540] border border-slate-700/70 rounded-xl shadow-2xl overflow-hidden">

          {showNewBranch ? (
            /* ── New branch form ── */
            <div className="p-3 space-y-2.5">
              <div className="flex items-center gap-2 mb-1">
                <button
                  onClick={() => { setShowNewBranch(false); setCreateError(''); }}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-xs font-semibold text-slate-200">New Branch</span>
              </div>

              <input
                ref={newBranchInputRef}
                type="text"
                value={newBranchName}
                onChange={(e) => { setNewBranchName(e.target.value); setCreateError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateBranch(); if (e.key === 'Escape') setShowNewBranch(false); }}
                placeholder="branch-name"
                className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-violet-500/60 font-mono transition-colors"
              />

              <p className="text-[10px] text-slate-600">
                Branch from: <span className="text-slate-400 font-mono">{currentBranch}</span>
              </p>

              {/* Set upstream toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                <div
                  onClick={() => setSetUpstream((v) => !v)}
                  className={`w-8 h-4 rounded-full transition-colors flex-shrink-0 relative ${setUpstream ? 'bg-violet-600' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${setUpstream ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                  Push &amp; set upstream <span className="text-slate-600 font-mono">(origin/{newBranchName || 'branch-name'})</span>
                </span>
              </label>

              {createError && (
                <div className="text-[10px] text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-2 py-1.5 font-mono break-all">
                  {createError}
                </div>
              )}

              <button
                onClick={handleCreateBranch}
                disabled={!newBranchName.trim() || creating}
                className="w-full py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {creating ? (
                  <><SpinnerIcon className="w-3 h-3" /> Creating…</>
                ) : (
                  'Create Branch'
                )}
              </button>
            </div>
          ) : (
            <>
              {/* Filter input + New branch button */}
              <div className="px-3 pt-3 pb-2 flex gap-2">
                <input
                  ref={filterInputRef}
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter branches…"
                  className="flex-1 min-w-0 bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-colors"
                />
                <button
                  onClick={() => { setShowNewBranch(true); setNewBranchName(filter); setFilter(''); }}
                  title="Create new branch"
                  className="flex-shrink-0 px-2.5 py-1.5 bg-violet-600/20 hover:bg-violet-600/40 border border-violet-600/40 text-violet-400 text-xs rounded-lg transition-colors flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  New
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-6 text-slate-500">
                    <SpinnerIcon className="w-4 h-4 mr-2" />
                    <span className="text-xs">Loading branches…</span>
                  </div>
                ) : (
                  <>
                    {currentBranchEntry && (
                      <div className="px-2 pb-1">
                        <div className="px-2 py-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Current</span>
                        </div>
                        <BranchRow branch={currentBranchEntry} isCurrent switching={switching} onCheckout={handleCheckout} />
                      </div>
                    )}
                    {recentBranches.length > 0 && (
                      <div className="px-2 pb-1">
                        <div className="px-2 py-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Recent Branches</span>
                        </div>
                        {recentBranches.map((b) => (
                          <BranchRow key={b.name} branch={b} isCurrent={false} switching={switching} onCheckout={handleCheckout} />
                        ))}
                      </div>
                    )}
                    {otherBranches.length > 0 && (
                      <div className="px-2 pb-2">
                        <div className="px-2 py-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Other Branches</span>
                        </div>
                        {otherBranches.map((b) => (
                          <BranchRow key={b.name} branch={b} isCurrent={false} switching={switching} onCheckout={handleCheckout} />
                        ))}
                      </div>
                    )}
                    {filteredBranches.length === 0 && (
                      <div className="py-6 text-center text-xs text-slate-500">
                        {filter ? 'No branches match your filter' : 'No branches found'}
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function BranchRow({ branch, isCurrent, switching, onCheckout }) {
  const isBeingSwitched = switching === branch.name;

  return (
    <button
      onClick={() => onCheckout(branch.name)}
      disabled={isCurrent || !!switching}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors group
        ${isCurrent
          ? 'text-violet-300 cursor-default'
          : switching
          ? 'text-slate-500 cursor-not-allowed'
          : 'text-slate-300 hover:bg-slate-700/60 hover:text-slate-100 cursor-pointer'
        }`}
    >
      {/* Check / spinner */}
      <span className="w-3.5 flex-shrink-0 flex items-center justify-center">
        {isCurrent ? (
          <CheckIcon className="w-3.5 h-3.5 text-violet-400" />
        ) : isBeingSwitched ? (
          <SpinnerIcon className="w-3.5 h-3.5 text-violet-400" />
        ) : null}
      </span>

      {/* Branch name */}
      <span className="flex-1 min-w-0 font-mono text-xs truncate">{branch.name}</span>

      {/* Relative date */}
      {branch.date && (
        <span className="text-[10px] text-slate-600 flex-shrink-0 group-hover:text-slate-500 transition-colors">
          {branch.date}
        </span>
      )}
    </button>
  );
}
