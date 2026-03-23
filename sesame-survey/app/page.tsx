import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-yellow-50 to-orange-50 px-4 py-12">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8">
          <div className="text-6xl mb-4">🎪</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Which Sesame Street Leader Are You?
          </h1>
          <p className="text-lg text-gray-600 mt-4">
            Most of us learnt our first lessons about fairness, sharing, and kindness
            before we ever heard the word <em>leadership</em>.
          </p>
          <p className="text-base text-gray-500 mt-3">
            Discover which Sesame Street character reflects your leadership archetype —
            and what that means for how you show up as a leader.
          </p>
        </div>

        <div className="grid grid-cols-5 gap-2 mb-8">
          {[
            { emoji: '❤️', name: 'Elmo', color: 'bg-red-100 border-red-300' },
            { emoji: '🌟', name: 'Big Bird', color: 'bg-yellow-100 border-yellow-300' },
            { emoji: '📋', name: 'Bert', color: 'bg-orange-100 border-orange-300' },
            { emoji: '🍪', name: 'Cookie Monster', color: 'bg-blue-100 border-blue-300' },
            { emoji: '🗑️', name: 'Oscar', color: 'bg-green-100 border-green-300' },
          ].map((c) => (
            <div
              key={c.name}
              className={`rounded-xl border-2 p-3 text-center ${c.color}`}
            >
              <div className="text-2xl">{c.emoji}</div>
              <div className="text-xs font-medium text-gray-700 mt-1 leading-tight">
                {c.name}
              </div>
            </div>
          ))}
        </div>

        <Link
          href="/survey"
          className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg px-10 py-4 rounded-2xl shadow-lg transition-colors"
        >
          Take the Survey →
        </Link>

        <p className="text-sm text-gray-400 mt-4">
          10 questions · takes about 3 minutes
        </p>
      </div>
    </main>
  );
}
