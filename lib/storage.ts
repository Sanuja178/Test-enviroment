import { ArchetypeKey, ARCHETYPE_KEYS } from './archetypes';

export interface Submission {
  id: string;
  name: string;
  archetype: ArchetypeKey;
  scores: Record<ArchetypeKey, number>;
  allocatedCharacter?: ArchetypeKey;
  submittedAt: string;
}

export interface SessionState {
  status: 'open' | 'allocated';
  allocatedAt?: string;
}

// ── In-memory fallback (development / when KV is not configured) ──────────────
const memStore: {
  submissions: Record<string, Submission>;
  session: SessionState;
} = {
  submissions: {},
  session: { status: 'open' },
};

function isKVAvailable() {
  return !!(
    process.env.KV_REST_API_URL &&
    process.env.KV_REST_API_TOKEN
  );
}

async function getKV() {
  const { kv } = await import('@vercel/kv');
  return kv;
}

// ── Submissions ───────────────────────────────────────────────────────────────

export async function saveSubmission(submission: Submission): Promise<void> {
  if (isKVAvailable()) {
    const kv = await getKV();
    await kv.hset('submissions', { [submission.id]: JSON.stringify(submission) });
  } else {
    memStore.submissions[submission.id] = submission;
  }
}

export async function getSubmission(id: string): Promise<Submission | null> {
  if (isKVAvailable()) {
    const kv = await getKV();
    const raw = await kv.hget<string>('submissions', id);
    return raw ? JSON.parse(raw) : null;
  }
  return memStore.submissions[id] ?? null;
}

export async function getAllSubmissions(): Promise<Submission[]> {
  if (isKVAvailable()) {
    const kv = await getKV();
    const all = await kv.hgetall<Record<string, string>>('submissions');
    if (!all) return [];
    return Object.values(all).map((v) => JSON.parse(v));
  }
  return Object.values(memStore.submissions);
}

export async function updateSubmission(id: string, patch: Partial<Submission>): Promise<void> {
  const existing = await getSubmission(id);
  if (!existing) return;
  const updated = { ...existing, ...patch };
  if (isKVAvailable()) {
    const kv = await getKV();
    await kv.hset('submissions', { [id]: JSON.stringify(updated) });
  } else {
    memStore.submissions[id] = updated;
  }
}

// ── Session state ─────────────────────────────────────────────────────────────

export async function getSession(): Promise<SessionState> {
  if (isKVAvailable()) {
    const kv = await getKV();
    const raw = await kv.get<string>('session');
    return raw ? JSON.parse(raw) : { status: 'open' };
  }
  return memStore.session;
}

export async function setSession(state: SessionState): Promise<void> {
  if (isKVAvailable()) {
    const kv = await getKV();
    await kv.set('session', JSON.stringify(state));
  } else {
    memStore.session = state;
  }
}

// ── Allocation algorithm ──────────────────────────────────────────────────────

export function computeEvenAllocation(
  submissions: Submission[]
): Record<string, ArchetypeKey> {
  const n = submissions.length;
  if (n === 0) return {};

  const numChars = ARCHETYPE_KEYS.length; // 5
  const base = Math.floor(n / numChars);
  const extra = n % numChars;

  // Characters sorted by how many people naturally chose them (ascending)
  // so over-represented characters are more likely to give up extras.
  const naturalCounts: Record<ArchetypeKey, number> = {
    elmo: 0, bigbird: 0, bert: 0, cookie: 0, oscar: 0,
  };
  for (const s of submissions) naturalCounts[s.archetype]++;

  // Quota: first `extra` characters (by natural popularity desc) get base+1
  const sortedByPopularity = [...ARCHETYPE_KEYS].sort(
    (a, b) => naturalCounts[b] - naturalCounts[a]
  );
  const quotas: Record<ArchetypeKey, number> = {} as Record<ArchetypeKey, number>;
  sortedByPopularity.forEach((k, i) => {
    quotas[k] = base + (i < extra ? 1 : 0);
  });

  const allocation: Record<string, ArchetypeKey> = {};
  const used: Record<ArchetypeKey, number> = {
    elmo: 0, bigbird: 0, bert: 0, cookie: 0, oscar: 0,
  };
  const unassigned: Submission[] = [];

  // First pass: give everyone their natural archetype if quota allows
  for (const sub of submissions) {
    if (used[sub.archetype] < quotas[sub.archetype]) {
      allocation[sub.id] = sub.archetype;
      used[sub.archetype]++;
    } else {
      unassigned.push(sub);
    }
  }

  // Second pass: assign remaining by best secondary score
  for (const sub of unassigned) {
    const ranked = [...ARCHETYPE_KEYS].sort(
      (a, b) => sub.scores[b] - sub.scores[a]
    );
    for (const char of ranked) {
      if (used[char] < quotas[char]) {
        allocation[sub.id] = char;
        used[char]++;
        break;
      }
    }
  }

  return allocation;
}
