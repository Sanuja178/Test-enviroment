import { NextRequest, NextResponse } from 'next/server';
import { getAllSubmissions, getSession, clearAllSubmissions } from '@/lib/storage';
import { ARCHETYPE_KEYS, ArchetypeKey } from '@/lib/archetypes';

export async function GET(req: NextRequest) {
  // Simple admin password check via query param
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'sesame';
  const provided = req.nextUrl.searchParams.get('key');
  if (provided !== adminPassword) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const [submissions, session] = await Promise.all([
    getAllSubmissions(),
    getSession(),
  ]);

  const stats: Record<ArchetypeKey, number> = {
    elmo: 0, bigbird: 0, bert: 0, cookie: 0, oscar: 0,
  };
  for (const s of submissions) {
    stats[s.archetype]++;
  }

  return NextResponse.json({
    session,
    total: submissions.length,
    stats,
    submissions,
  });
}

export async function DELETE(req: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'sesame';
  const body = await req.json().catch(() => ({}));
  if (body.key !== adminPassword) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  await clearAllSubmissions();
  return NextResponse.json({ success: true });
}
