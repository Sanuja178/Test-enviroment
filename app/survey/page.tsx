'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QUESTIONS } from '@/lib/questions';
import { ArchetypeKey } from '@/lib/archetypes';

export default function SurveyPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [facilitatorGroup, setFacilitatorGroup] = useState('');
  const [step, setStep] = useState<'name' | 'questions'>('name');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<ArchetypeKey[]>([]);
  const [selected, setSelected] = useState<ArchetypeKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const progress = (currentQ / QUESTIONS.length) * 100;

  async function handleAnswer(archetype: ArchetypeKey) {
    setSelected(archetype);
    const newAnswers = [...answers, archetype];

    setTimeout(async () => {
      if (currentQ < QUESTIONS.length - 1) {
        setAnswers(newAnswers);
        setCurrentQ(currentQ + 1);
        setSelected(null);
      } else {
        // Last question — submit
        setAnswers(newAnswers);
        setSubmitting(true);
        try {
          const res = await fetch('/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, facilitatorGroup: facilitatorGroup.trim() || undefined, answers: newAnswers }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          router.push(`/result?id=${data.id}`);
        } catch {
          setError('Something went wrong. Please try again.');
          setSubmitting(false);
          setSelected(null);
        }
      }
    }, 300);
  }

  if (step === 'name') {
    const canStart = name.trim().length >= 2;
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-yellow-50 to-orange-50 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8">
          <div className="text-4xl text-center mb-4">👋</div>
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Welcome to the Survey
          </h1>
          <p className="text-gray-500 text-center mb-6">
            Tell us a little about yourself to get started.
          </p>

          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Your name or nickname
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canStart) setStep('questions');
            }}
            placeholder="e.g. Sanuja"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-lg focus:outline-none focus:border-orange-400"
            autoFocus
          />

          <label className="block text-sm font-semibold text-gray-700 mt-4 mb-1">
            Your group number <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={facilitatorGroup}
            onChange={(e) => setFacilitatorGroup(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canStart) setStep('questions');
            }}
            placeholder="e.g. 4"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-lg focus:outline-none focus:border-orange-400"
          />

          <button
            onClick={() => setStep('questions')}
            disabled={!canStart}
            className="mt-5 w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-lg py-3 rounded-xl transition-colors"
          >
            Start →
          </button>
        </div>
      </main>
    );
  }

  if (submitting) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-yellow-50 to-orange-50">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🎪</div>
          <p className="text-xl font-semibold text-gray-700">Calculating your archetype…</p>
        </div>
      </main>
    );
  }

  const question = QUESTIONS[currentQ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-yellow-50 to-orange-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>Question {currentQ + 1} of {QUESTIONS.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question card */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <p className="text-sm font-semibold text-orange-500 uppercase tracking-wide mb-3">
            {name}&apos;s Survey
          </p>
          <h2 className="text-xl font-bold text-gray-900 mb-6 leading-snug">
            {question.text}
          </h2>

          {error && (
            <p className="text-red-500 text-sm mb-4">{error}</p>
          )}

          <div className="flex flex-col gap-3">
            {question.options.map((option, i) => (
              <button
                key={i}
                onClick={() => !selected && handleAnswer(option.archetype)}
                disabled={!!selected}
                className={`w-full text-left px-5 py-4 rounded-xl border-2 font-medium transition-all
                  ${selected === option.archetype
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : selected
                    ? 'border-gray-100 bg-gray-50 text-gray-400'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50'
                  }`}
              >
                <span className="mr-3 text-gray-400 font-mono text-sm">
                  {String.fromCharCode(65 + i)}.
                </span>
                {option.text}
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Choose the option that feels most like you — there are no right or wrong answers.
        </p>
      </div>
    </main>
  );
}
