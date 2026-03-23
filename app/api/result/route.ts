import { NextRequest, NextResponse } from 'next/server';
import { getSubmission, getSession } from '@/lib/storage';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const [submission, session] = await Promise.all([
    getSubmission(id),
    getSession(),
  ]);

  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ submission, session });
}
