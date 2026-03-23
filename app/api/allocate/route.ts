import { NextRequest, NextResponse } from 'next/server';
import {
  getAllSubmissions,
  setSession,
  updateSubmission,
  computeEvenAllocation,
  computeGroupAllocation,
} from '@/lib/storage';
import { ArchetypeKey, ARCHETYPE_KEYS } from '@/lib/archetypes';

export async function POST(req: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'sesame';
  const body = await req.json().catch(() => ({}));
  if (body.key !== adminPassword) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const disabled: ArchetypeKey[] = Array.isArray(body.disabled)
    ? body.disabled.filter((k: unknown) => ARCHETYPE_KEYS.includes(k as ArchetypeKey))
    : [];

  const groups: string[] = Array.isArray(body.groups)
    ? body.groups.map(String).filter(Boolean)
    : [];

  const submissions = await getAllSubmissions();

  if (groups.length > 0) {
    // Group mode: distribute into named groups with 1 of each character per group
    const groupAlloc = computeGroupAllocation(submissions, groups, disabled);
    await Promise.all(
      submissions.map((s) => {
        const slot = groupAlloc[s.id];
        return updateSubmission(s.id, {
          allocatedCharacter: slot?.character,
          allocatedGroup: slot?.group ?? undefined,
        });
      })
    );
    await setSession({
      status: 'allocated',
      allocatedAt: new Date().toISOString(),
      groups,
    });
    return NextResponse.json({ success: true, mode: 'groups', groups });
  }

  // Character mode: even split across character buckets (existing behaviour)
  const allocation = computeEvenAllocation(submissions, disabled);
  await Promise.all(
    submissions.map((s) =>
      updateSubmission(s.id, {
        allocatedCharacter: allocation[s.id],
        allocatedGroup: undefined,
      })
    )
  );
  await setSession({
    status: 'allocated',
    allocatedAt: new Date().toISOString(),
  });
  return NextResponse.json({ success: true, mode: 'characters', allocation });
}
