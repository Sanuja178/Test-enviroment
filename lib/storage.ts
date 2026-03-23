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
    await kv.hset('submissions', { [submission.id]: submission });
  } else {
    memStore.submissions[submission.id] = submission;
  }
}

export async function getSubmission(id: string): Promise<Submission | null> {
  if (isKVAvailable()) {
    const kv = await getKV();
    return await kv.hget<Submission>('submissions', id) ?? null;
  }
  return memStore.submissions[id] ?? null;
}

export async function getAllSubmissions(): Promise<Submission[]> {
  if (isKVAvailable()) {
    const kv = await getKV();
    const all = await kv.hgetall<Record<string, Submission>>('submissions');
    if (!all) return [];
    return Object.values(all);
  }
  return Object.values(memStore.submissions);
}

export async function updateSubmission(id: string, patch: Partial<Submission>): Promise<void> {
  const existing = await getSubmission(id);
  if (!existing) return;
  const updated = { ...existing, ...patch };
  if (isKVAvailable()) {
    const kv = await getKV();
    await kv.hset('submissions', { [id]: updated });
  } else {
    memStore.submissions[id] = updated;
  }
}

// ── Session state ─────────────────────────────────────────────────────────────

export async function getSession(): Promise<SessionState> {
  if (isKVAvailable()) {
    const kv = await getKV();
    return await kv.get<SessionState>('session') ?? { status: 'open' };
  }
  return memStore.session;
}

export async function setSession(state: SessionState): Promise<void> {
  if (isKVAvailable()) {
    const kv = await getKV();
    await kv.set('session', state);
  } else {
    memStore.session = state;
  }
}

export async function clearAllSubmissions(): Promise<void> {
  if (isKVAvailable()) {
    const kv = await getKV();
    await Promise.all([kv.del('submissions'), kv.del('session')]);
  } else {
    memStore.submissions = {};
    memStore.session = { status: 'open' };
  }
}

// ── Allocation algorithm ──────────────────────────────────────────────────────

export function computeEvenAllocation(
  submissions: Submission[],
  disabled: ArchetypeKey[] = []
): Record<string, ArchetypeKey> {
  const n = submissions.length;
  if (n === 0) return {};

  const activeKeys = ARCHETYPE_KEYS.filter((k) => !disabled.includes(k));
  if (activeKeys.length === 0) return {};

  const base = Math.floor(n / activeKeys.length);
  const extra = n % activeKeys.length;

  const naturalCounts: Record<ArchetypeKey, number> = {
    elmo: 0, bigbird: 0, bert: 0, cookie: 0, oscar: 0,
  };
  for (const s of submissions) naturalCounts[s.archetype]++;

  // Quota: only active keys get slots; disabled keys stay at 0
  const quotas: Record<ArchetypeKey, number> = {
    elmo: 0, bigbird: 0, bert: 0, cookie: 0, oscar: 0,
  };
  const sortedByPopularity = [...activeKeys].sort(
    (a, b) => naturalCounts[b] - naturalCounts[a]
  );
  sortedByPopularity.forEach((k, i) => {
    quotas[k] = base + (i < extra ? 1 : 0);
  });

  const allocation: Record<string, ArchetypeKey> = {};
  const used: Record<ArchetypeKey, number> = {
    elmo: 0, bigbird: 0, bert: 0, cookie: 0, oscar: 0,
  };
  const unassigned: Submission[] = [];

  // First pass: give everyone their natural archetype if it's active and has quota
  for (const sub of submissions) {
    if (!disabled.includes(sub.archetype) && used[sub.archetype] < quotas[sub.archetype]) {
      allocation[sub.id] = sub.archetype;
      used[sub.archetype]++;
    } else {
      unassigned.push(sub);
    }
  }

  // Second pass: assign unassigned by best secondary score among active keys
  for (const sub of unassigned) {
    const ranked = [...activeKeys].sort(
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
