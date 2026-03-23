import { NextRequest, NextResponse } from 'next/server';
import {
  getAllSubmissions,
  setSession,
  updateSubmission,
  computeEvenAllocation,
  computeAllocationsPerGroup,
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

  const coFacilitatorGroup: string =
    typeof body.coFacilitatorGroup === 'string' ? body.coFacilitatorGroup.trim() : '';

  const submissions = await getAllSubmissions();
  const hasFacilitatorGroups = submissions.some((s) => s.facilitatorGroup?.trim());

  if (hasFacilitatorGroups) {
    // Facilitator-group mode: even character split independently per regular group.
    // Co-facilitator group members are excluded from automatic allocation so the
    // admin can manually deploy them into target groups afterwards.
    const participantSubs = coFacilitatorGroup
      ? submissions.filter((s) => s.facilitatorGroup?.trim() !== coFacilitatorGroup)
      : submissions;
    const coFacSubs = coFacilitatorGroup
      ? submissions.filter((s) => s.facilitatorGroup?.trim() === coFacilitatorGroup)
      : [];

    const allocation = computeAllocationsPerGroup(participantSubs, disabled);

    await Promise.all([
      // Assign characters to regular participants
      ...participantSubs.map((s) =>
        updateSubmission(s.id, { allocatedCharacter: allocation[s.id], allocatedGroup: undefined, deployedToGroup: undefined })
      ),
      // Clear any previous deployment for co-facilitators (fresh re-allocation)
      ...coFacSubs.map((s) =>
        updateSubmission(s.id, { allocatedCharacter: undefined, allocatedGroup: undefined, deployedToGroup: undefined })
      ),
    ]);

    await setSession({
      status: 'allocated',
      allocatedAt: new Date().toISOString(),
      coFacilitatorGroup: coFacilitatorGroup || undefined,
    });
    return NextResponse.json({ success: true, mode: 'facilitator-groups', coFacilitatorGroup: coFacilitatorGroup || null });
  }

  if (groups.length > 0) {
    // Named-group mode: distribute into admin-defined mixed-character teams
    const groupAlloc = computeGroupAllocation(submissions, groups, disabled);
    await Promise.all(
      submissions.map((s) => {
        const slot = groupAlloc[s.id];
        return updateSubmission(s.id, {
          allocatedCharacter: slot?.character,
          allocatedGroup: slot?.group ?? undefined,
          deployedToGroup: undefined,
        });
      })
    );
    await setSession({ status: 'allocated', allocatedAt: new Date().toISOString(), groups });
    return NextResponse.json({ success: true, mode: 'named-groups', groups });
  }

  // Character mode: even split across character buckets (default)
  const allocation = computeEvenAllocation(submissions, disabled);
  await Promise.all(
    submissions.map((s) =>
      updateSubmission(s.id, {
        allocatedCharacter: allocation[s.id],
        allocatedGroup: undefined,
        deployedToGroup: undefined,
      })
    )
  );
  await setSession({ status: 'allocated', allocatedAt: new Date().toISOString() });
  return NextResponse.json({ success: true, mode: 'characters' });
}
