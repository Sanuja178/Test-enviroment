import { NextRequest, NextResponse } from 'next/server';
import { getSubmission, updateSubmission } from '@/lib/storage';
import { ArchetypeKey, ARCHETYPE_KEYS } from '@/lib/archetypes';

/**
 * Deploy a co-facilitator member: assign them a character and a target group.
 * The admin calls this after the main allocation to fill missing character
 * slots in regular groups with co-facilitator participants.
 *
 * Body: { key, submissionId, character, targetGroup }
 */
export async function POST(req: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'sesame';
  const body = await req.json().catch(() => ({}));

  if (body.key !== adminPassword) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { submissionId, character, targetGroup } = body as {
    submissionId?: string;
    character?: string;
    targetGroup?: string;
  };

  if (!submissionId || !character || !targetGroup) {
    return NextResponse.json({ error: 'submissionId, character, and targetGroup are required' }, { status: 400 });
  }

  if (!ARCHETYPE_KEYS.includes(character as ArchetypeKey)) {
    return NextResponse.json({ error: 'Invalid character' }, { status: 400 });
  }

  const submission = await getSubmission(submissionId);
  if (!submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  await updateSubmission(submissionId, {
    allocatedCharacter: character as ArchetypeKey,
    deployedToGroup: targetGroup.trim(),
  });

  return NextResponse.json({ success: true });
}
