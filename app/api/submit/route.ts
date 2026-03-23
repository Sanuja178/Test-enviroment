import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { saveSubmission } from '@/lib/storage';
import { calculateArchetype } from '@/lib/questions';
import { ArchetypeKey } from '@/lib/archetypes';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, answers } = body as { name: string; answers: ArchetypeKey[] };

    if (!name || !answers || answers.length !== 10) {
      return NextResponse.json({ error: 'Invalid submission' }, { status: 400 });
    }

    const { archetype, scores } = calculateArchetype(answers);
    const id = uuidv4();

    await saveSubmission({
      id,
      name: name.trim(),
      archetype,
      scores,
      submittedAt: new Date().toISOString(),
    });

    return NextResponse.json({ id, archetype, scores });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
