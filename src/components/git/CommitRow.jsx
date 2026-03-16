import React from 'react';
import AuthorAvatar from './AuthorAvatar';

export default function CommitRow({ commit, selected, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ height: 52, padding: '0 10px', cursor: 'pointer', boxSizing: 'border-box' }}
      className={`flex items-center gap-2 border-b border-slate-800/60 transition-colors ${
        selected
          ? 'bg-violet-600/15 border-l-2 border-l-violet-500'
          : 'hover:bg-slate-800/40 border-l-2 border-l-transparent'
      }`}
    >
      <AuthorAvatar name={commit.author} size={22} />
      <div className="flex-1 min-w-0">
        {/* Commit message */}
        <div className="text-[11px] font-medium text-slate-200 truncate leading-tight" title={commit.message}>
          {commit.message || '(no message)'}
        </div>
        {/* Meta: author · time · hash — all on one line */}
        <div className="flex items-center gap-1 mt-0.5 overflow-hidden">
          <span className="text-[10px] text-slate-500 truncate min-w-0 shrink">{commit.author}</span>
          <span className="text-slate-700 text-[9px] flex-shrink-0">·</span>
          <span className="text-[10px] text-slate-500 flex-shrink-0 whitespace-nowrap">{commit.dateRel}</span>
          <span className="text-slate-700 text-[9px] flex-shrink-0">·</span>
          <code className="text-[10px] text-violet-400 font-mono flex-shrink-0">{commit.hash.slice(0, 7)}</code>
        </div>
      </div>
    </div>
  );
}
