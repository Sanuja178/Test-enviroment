'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ARCHETYPES } from '@/lib/archetypes';
import type { Submission, SessionState } from '@/lib/storage';

interface ResultData {
  submission: Submission;
  session: SessionState;
}

export default function ResultPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const params = use(searchParams);
  const id = params.id;
  const [data, setData] = useState<ResultData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) { setError('No result ID found.'); return; }

    async function fetchResult() {
      const res = await fetch(`/api/result?id=${id}`);
      if (!res.ok) { setError('Result not found.'); return; }
      const json: ResultData = await res.json();
      setData(json);

      // If session is still open, keep polling until allocation happens
      if (json.session.status === 'open') {
        const interval = setInterval(async () => {
          const r = await fetch(`/api/result?id=${id}`);
          if (r.ok) {
            const d: ResultData = await r.json();
            setData(d);
            if (d.session.status === 'allocated') clearInterval(interval);
          }
        }, 5000);
        return () => clearInterval(interval);
      }
    }

    fetchResult();
  }, [id]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 text-lg">{error}</p>
          <Link href="/" className="text-orange-500 underline mt-4 block">Back to home</Link>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-yellow-50 to-orange-50">
        <div className="text-center">
          <div className="text-5xl animate-spin mb-4">🎡</div>
          <p className="text-gray-600 font-medium">Loading your result…</p>
        </div>
      </main>
    );
  }

  const { submission, session } = data;
  const archetype = ARCHETYPES[submission.archetype];
  const allocated = submission.allocatedCharacter
    ? ARCHETYPES[submission.allocatedCharacter]
    : null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-yellow-50 to-orange-50 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Natural result */}
        <div className={`rounded-3xl border-2 p-8 shadow-xl mb-6 ${archetype.bgColor}`}>
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-1">
            {submission.name}&apos;s Leadership Archetype
          </p>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-5xl">{archetype.emoji}</div>
            <div>
              <h1 className={`text-3xl font-extrabold ${archetype.color}`}>
                {archetype.character}
              </h1>
              <p className="text-lg font-semibold text-gray-700">{archetype.archetype}</p>
            </div>
          </div>
          <p className="text-gray-700 leading-relaxed mb-4">{archetype.description}</p>

          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="bg-white bg-opacity-70 rounded-xl p-3">
              <span className="font-semibold text-gray-700">Core Belief: </span>
              <span className="text-gray-600">{archetype.belief}</span>
            </div>
            <div className="bg-white bg-opacity-70 rounded-xl p-3">
              <span className="font-semibold text-gray-700">Your Question: </span>
              <span className={`font-medium ${archetype.color}`}>&ldquo;{archetype.question}&rdquo;</span>
            </div>
            <div className="bg-white bg-opacity-70 rounded-xl p-3">
              <span className="font-semibold text-gray-700">Strengths: </span>
              <span className="text-gray-600">{archetype.strengths}</span>
            </div>
            <div className="bg-white bg-opacity-70 rounded-xl p-3">
              <span className="font-semibold text-gray-700">Watch out for: </span>
              <span className="text-gray-600">{archetype.risks}</span>
            </div>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h3 className="font-bold text-gray-700 mb-3">Your Score Breakdown</h3>
          <div className="flex flex-col gap-2">
            {(Object.entries(submission.scores) as [string, number][])
              .sort(([, a], [, b]) => b - a)
              .map(([key, score]) => {
                const a = ARCHETYPES[key as keyof typeof ARCHETYPES];
                const pct = (score / 10) * 100;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-lg">{a.emoji}</span>
                    <span className="text-sm font-medium text-gray-600 w-28">{a.character}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-orange-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-6 text-right">{score}</span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Workshop allocation (shown after admin presses "next step") */}
        {session.status === 'allocated' && allocated ? (
          submission.allocatedGroup ? (
            // Group mode: show team name prominently, character as role
            <div className="rounded-3xl border-2 border-indigo-300 bg-indigo-50 p-8 shadow-xl">
              <div className="text-center">
                <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  Your Workshop Group
                </p>
                <div className="text-5xl mb-3">🏷️</div>
                <h2 className="text-3xl font-extrabold text-indigo-700">
                  {submission.allocatedGroup}
                </h2>
                <div className="mt-4 flex items-center justify-center gap-3 bg-white bg-opacity-70 rounded-2xl p-4">
                  <span className="text-3xl">{allocated.emoji}</span>
                  <div className="text-left">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Your role in this team</p>
                    <p className={`text-lg font-extrabold ${allocated.color}`}>{allocated.character}</p>
                    <p className="text-sm text-gray-500">{allocated.archetype}</p>
                  </div>
                </div>
                <p className="text-gray-500 text-sm mt-4">
                  Find your <strong className="text-indigo-600">{submission.allocatedGroup}</strong> team — you&apos;ll be working together in the next activity!
                </p>
              </div>
            </div>
          ) : (
            // Character mode: show character group (with optional facilitator group label)
            <div className={`rounded-3xl border-2 p-8 shadow-xl ${allocated.bgColor}`}>
              <div className="text-center">
                {submission.facilitatorGroup && (
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
                    Group {submission.facilitatorGroup}
                  </p>
                )}
                <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  Your Workshop Character
                </p>
                <div className="text-6xl mb-2">{allocated.emoji}</div>
                <h2 className={`text-2xl font-extrabold ${allocated.color}`}>
                  {allocated.character}
                </h2>
                <p className="text-gray-600 mt-2 font-medium">{allocated.archetype}</p>
                <p className="text-gray-500 text-sm mt-2">
                  {submission.facilitatorGroup
                    ? `Find the other ${allocated.character}s in Group ${submission.facilitatorGroup} — you'll be working together!`
                    : `Find the others in your group — you'll be working together in the next activity!`}
                </p>
              </div>
            </div>
          )
        ) : (
          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <div className="text-3xl mb-3">⏳</div>
            <h3 className="font-bold text-gray-700 mb-1">Waiting for the facilitator…</h3>
            <p className="text-gray-500 text-sm">
              Once everyone has completed the survey, the facilitator will reveal your workshop group.
              This page will update automatically.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
