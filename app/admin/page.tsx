'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { ARCHETYPES, ARCHETYPE_KEYS, ArchetypeKey } from '@/lib/archetypes';
import type { Submission, SessionState } from '@/lib/storage';

interface ResponsesData {
  session: SessionState;
  total: number;
  stats: Record<ArchetypeKey, number>;
  submissions: Submission[];
}

export default function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const params = use(searchParams);
  const [key, setKey] = useState(params.key ?? '');
  const [inputKey, setInputKey] = useState('');
  const [data, setData] = useState<ResponsesData | null>(null);
  const [error, setError] = useState('');
  const [allocating, setAllocating] = useState(false);
  const [allocateMsg, setAllocateMsg] = useState('');
  const [clearing, setClearing] = useState(false);
  const [clearMsg, setClearMsg] = useState('');

  const load = useCallback(async (k: string) => {
    setError('');
    const res = await fetch(`/api/responses?key=${encodeURIComponent(k)}`);
    if (!res.ok) {
      setError('Wrong password or server error.');
      setData(null);
      return;
    }
    const json: ResponsesData = await res.json();
    setData(json);
  }, []);

  useEffect(() => {
    if (key) load(key);
  }, [key, load]);

  // Auto-refresh every 10 seconds when logged in
  useEffect(() => {
    if (!key) return;
    const interval = setInterval(() => load(key), 10000);
    return () => clearInterval(interval);
  }, [key, load]);

  async function handleAllocate(reallocate = false) {
    const msg = reallocate
      ? 'This will reassign all groups from scratch. Participants will see the new allocation. Continue?'
      : 'This will assign everyone to a workshop group with an even split. Continue?';
    if (!confirm(msg)) return;
    setAllocating(true);
    setAllocateMsg('');
    const res = await fetch('/api/allocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    const json = await res.json();
    setAllocating(false);
    if (!res.ok) {
      setAllocateMsg(`Error: ${json.error}`);
    } else {
      setAllocateMsg(reallocate ? 'Groups reallocated successfully!' : 'Groups allocated successfully! Participants will see their groups now.');
      await load(key);
    }
  }

  async function handleClear() {
    if (!confirm('This will permanently delete ALL responses and reset the session. This cannot be undone. Continue?')) return;
    setClearing(true);
    setClearMsg('');
    const res = await fetch('/api/responses', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    const json = await res.json();
    setClearing(false);
    if (!res.ok) {
      setClearMsg(`Error: ${json.error}`);
    } else {
      setClearMsg('All responses cleared.');
      await load(key);
    }
  }

  if (!key) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
          <div className="text-3xl text-center mb-4">🔐</div>
          <h1 className="text-xl font-bold text-center text-gray-900 mb-4">Admin Access</h1>
          <input
            type="password"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setKey(inputKey); }}
            placeholder="Admin password"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-orange-400"
            autoFocus
          />
          <button
            onClick={() => setKey(inputKey)}
            className="mt-3 w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Enter
          </button>
          {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-900">
        <p className="text-white">{error || 'Loading…'}</p>
      </main>
    );
  }

  const { session, total, stats, submissions } = data;

  return (
    <main className="min-h-screen bg-gray-900 text-white px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">🎪 Admin Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">
              {total} response{total !== 1 ? 's' : ''} · Session: {' '}
              <span className={session.status === 'allocated' ? 'text-green-400' : 'text-yellow-400'}>
                {session.status === 'allocated' ? '✅ Groups allocated' : '🔄 Open (collecting responses)'}
              </span>
            </p>
          </div>
          <button
            onClick={() => load(key)}
            className="bg-gray-700 hover:bg-gray-600 text-sm px-4 py-2 rounded-lg"
          >
            ↻ Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3 mb-8">
          {ARCHETYPE_KEYS.map((k) => {
            const a = ARCHETYPES[k];
            const count = stats[k] ?? 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={k} className="bg-gray-800 rounded-2xl p-4 text-center">
                <div className="text-3xl mb-1">{a.emoji}</div>
                <div className="font-bold text-lg">{count}</div>
                <div className="text-xs text-gray-400">{a.character}</div>
                <div className="text-xs text-gray-500">{pct}%</div>
                <div className="mt-2 bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-orange-400 h-1.5 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* What happens after allocation */}
        {session.status === 'open' && (
          <div className="bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-700">
            <h2 className="text-lg font-bold mb-2">📊 When you&apos;re ready…</h2>
            <p className="text-gray-400 text-sm mb-4">
              Once everyone has completed the survey, press <strong className="text-white">Allocate Workshop Groups</strong>.
              The algorithm will ensure an even split across all 5 characters, honouring
              natural archetypes where possible. Each participant&apos;s result page will update instantly.
            </p>
            {allocateMsg && (
              <div className={`rounded-xl p-3 text-sm mb-4 ${allocateMsg.startsWith('Error') ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'}`}>
                {allocateMsg}
              </div>
            )}
            <button
              onClick={handleAllocate}
              disabled={allocating || total === 0}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed font-bold px-6 py-3 rounded-xl transition-colors"
            >
              {allocating ? '⏳ Allocating…' : '▶ Allocate Workshop Groups'}
            </button>
            {total === 0 && (
              <p className="text-gray-500 text-xs mt-2">Waiting for at least one response first.</p>
            )}
          </div>
        )}

        {session.status === 'allocated' && (
          <div className="bg-green-900 border border-green-700 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-bold text-green-300 mb-2">✅ Groups Allocated</h2>
            <p className="text-green-200 text-sm mb-4">
              Participants can now see their workshop group on their result page.
              Allocated at: {session.allocatedAt ? new Date(session.allocatedAt).toLocaleString() : 'unknown'}
            </p>
            {allocateMsg && (
              <div className={`rounded-xl p-3 text-sm mb-4 ${allocateMsg.startsWith('Error') ? 'bg-red-900 text-red-200' : 'bg-green-800 text-green-100'}`}>
                {allocateMsg}
              </div>
            )}
            <button
              onClick={() => handleAllocate(true)}
              disabled={allocating || total === 0}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed font-bold px-6 py-3 rounded-xl transition-colors"
            >
              {allocating ? '⏳ Reallocating…' : '🔄 Reallocate Groups'}
            </button>
          </div>
        )}

        {/* Allocation breakdown if done */}
        {session.status === 'allocated' && (
          <div className="grid grid-cols-5 gap-3 mb-8">
            {ARCHETYPE_KEYS.map((k) => {
              const a = ARCHETYPES[k];
              const allocated = submissions.filter((s) => s.allocatedCharacter === k);
              return (
                <div key={k} className="bg-gray-800 rounded-2xl p-3">
                  <div className="text-center mb-2">
                    <div className="text-2xl">{a.emoji}</div>
                    <div className="text-xs font-bold text-gray-300">{a.character}</div>
                    <div className="text-xs text-gray-500">{allocated.length} person{allocated.length !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {allocated.map((s) => (
                      <div key={s.id} className="text-xs bg-gray-700 rounded px-2 py-1 flex items-center gap-1">
                        <span>{s.name}</span>
                        {s.allocatedCharacter !== s.archetype && (
                          <span className="text-gray-500 text-xs">
                            (was {ARCHETYPES[s.archetype].character})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Danger zone */}
        <div className="bg-gray-800 border border-red-900 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-red-400 mb-2">⚠ Danger Zone</h2>
          <p className="text-gray-400 text-sm mb-4">
            Permanently delete all responses and reset the session back to open. This cannot be undone.
          </p>
          {clearMsg && (
            <div className={`rounded-xl p-3 text-sm mb-4 ${clearMsg.startsWith('Error') ? 'bg-red-900 text-red-200' : 'bg-gray-700 text-gray-200'}`}>
              {clearMsg}
            </div>
          )}
          <button
            onClick={handleClear}
            disabled={clearing || total === 0}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed font-bold px-6 py-3 rounded-xl transition-colors"
          >
            {clearing ? '⏳ Clearing…' : '🗑 Clear All Responses'}
          </button>
          {total === 0 && <p className="text-gray-500 text-xs mt-2">No responses to clear.</p>}
        </div>

        {/* Submissions table */}
        <div className="bg-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="font-bold">All Responses</h2>
            <span className="text-gray-400 text-sm">{total} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase border-b border-gray-700">
                  <th className="px-5 py-3 text-left">Name</th>
                  <th className="px-5 py-3 text-left">Natural Archetype</th>
                  {session.status === 'allocated' && (
                    <th className="px-5 py-3 text-left">Assigned Group</th>
                  )}
                  <th className="px-5 py-3 text-left">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-gray-500">
                      No responses yet. Share the survey link with participants!
                    </td>
                  </tr>
                ) : (
                  submissions
                    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
                    .map((s) => {
                      const a = ARCHETYPES[s.archetype];
                      const alloc = s.allocatedCharacter ? ARCHETYPES[s.allocatedCharacter] : null;
                      return (
                        <tr key={s.id} className="border-b border-gray-700 hover:bg-gray-750">
                          <td className="px-5 py-3 font-medium">{s.name}</td>
                          <td className="px-5 py-3">
                            <span className="flex items-center gap-2">
                              {a.emoji} {a.character}
                              <span className="text-gray-500 text-xs">({a.archetype})</span>
                            </span>
                          </td>
                          {session.status === 'allocated' && (
                            <td className="px-5 py-3">
                              {alloc ? (
                                <span className={`font-medium ${alloc.color}`}>
                                  {alloc.emoji} {alloc.character}
                                </span>
                              ) : '—'}
                            </td>
                          )}
                          <td className="px-5 py-3 text-gray-500">
                            {new Date(s.submittedAt).toLocaleTimeString()}
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
