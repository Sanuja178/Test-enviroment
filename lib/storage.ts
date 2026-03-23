import { ArchetypeKey, ARCHETYPE_KEYS } from './archetypes';

export interface Submission {
  id: string;
  name: string;
  facilitatorGroup?: string;  // self-reported group (e.g. "4")
  archetype: ArchetypeKey;
  scores: Record<ArchetypeKey, number>;
  allocatedCharacter?: ArchetypeKey;
  allocatedGroup?: string;
  deployedToGroup?: string;   // set when admin deploys a co-facilitator into a target group
  submittedAt: string;
}

export interface SessionState {
  status: 'open' | 'allocated';
  allocatedAt?: string;
  groups?: string[];           // defined when named-group mode is used
  coFacilitatorGroup?: string; // which facilitator group number is the co-facilitator pool
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

/**
 * Run computeEvenAllocation independently for each self-reported facilitator
 * group so that every group gets its own balanced character split.
 * Submissions without a facilitatorGroup are pooled together.
 */
export function computeAllocationsPerGroup(
  submissions: Submission[],
  disabled: ArchetypeKey[] = []
): Record<string, ArchetypeKey> {
  const byGroup: Record<string, Submission[]> = {};
  for (const sub of submissions) {
    const key = sub.facilitatorGroup?.trim() || '__ungrouped__';
    if (!byGroup[key]) byGroup[key] = [];
    byGroup[key].push(sub);
  }
  const result: Record<string, ArchetypeKey> = {};
  for (const subs of Object.values(byGroup)) {
    Object.assign(result, computeEvenAllocation(subs, disabled));
  }
  return result;
}

/**
 * Distribute participants into N named groups so that each group has
 * roughly 1 of each active character type.
 * Returns a map of submission id → { group, character }.
 */
export function computeGroupAllocation(
  submissions: Submission[],
  groupNames: string[],
  disabled: ArchetypeKey[] = []
): Record<string, { group: string; character: ArchetypeKey }> {
  const N = groupNames.length;
  const P = submissions.length;
  if (N === 0 || P === 0) return {};

  const activeKeys = ARCHETYPE_KEYS.filter((k) => !disabled.includes(k));
  const M = activeKeys.length;
  if (M === 0) return {};

  // Each (group, character) slot gets floor(P / N*M) or +1 people
  const totalSlots = N * M;
  const base = Math.floor(P / totalSlots);
  const extra = P % totalSlots;

  // cap[groupIndex][character] = max people for that slot
  const cap: number[][] = Array.from({ length: N }, () =>
    new Array(M).fill(base)
  );
  // Distribute the `extra` +1 slots evenly across groups first, then chars
  for (let i = 0; i < extra; i++) {
    const g = i % N;
    const c = Math.floor(i / N) % M;
    cap[g][c]++;
  }

  const used: number[][] = Array.from({ length: N }, () => new Array(M).fill(0));

  const result: Record<string, { group: string; character: ArchetypeKey }> = {};
  const unassigned: Submission[] = [];

  // Round-robin pointer per character so people are spread across groups
  const ptr: Record<string, number> = {};
  for (const c of activeKeys) ptr[c] = 0;

  // First pass: assign to natural archetype, round-robin across groups
  for (const sub of submissions) {
    const ci = activeKeys.indexOf(sub.archetype);
    if (ci === -1) { unassigned.push(sub); continue; }

    let assigned = false;
    for (let attempt = 0; attempt < N; attempt++) {
      const g = (ptr[sub.archetype] + attempt) % N;
      if (used[g][ci] < cap[g][ci]) {
        result[sub.id] = { group: groupNames[g], character: sub.archetype };
        used[g][ci]++;
        ptr[sub.archetype] = (g + 1) % N;
        assigned = true;
        break;
      }
    }
    if (!assigned) unassigned.push(sub);
  }

  // Second pass: assign unassigned by best secondary score
  for (const sub of unassigned) {
    const ranked = [...activeKeys].sort((a, b) => sub.scores[b] - sub.scores[a]);
    let assigned = false;
    outer: for (const c of ranked) {
      const ci = activeKeys.indexOf(c);
      for (let g = 0; g < N; g++) {
        if (used[g][ci] < cap[g][ci]) {
          result[sub.id] = { group: groupNames[g], character: c };
          used[g][ci]++;
          assigned = true;
          break outer;
        }
      }
    }
    // Safety fallback: fill into any slot with remaining room
    if (!assigned) {
      outer2: for (let g = 0; g < N; g++) {
        for (let ci = 0; ci < M; ci++) {
          if (used[g][ci] < cap[g][ci] + 1) {
            result[sub.id] = { group: groupNames[g], character: activeKeys[ci] };
            used[g][ci]++;
            break outer2;
          }
        }
      }
    }
  }

  return result;
}
