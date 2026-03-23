import { NextRequest, NextResponse } from 'next/server';
import {
  getAllSubmissions,
  setSession,
  updateSubmission,
  computeEvenAllocation,
} from '@/lib/storage';

export async function POST(req: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'sesame';
  const body = await req.json().catch(() => ({}));
  if (body.key !== adminPassword) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const submissions = await getAllSubmissions();
  const allocation = computeEvenAllocation(submissions);

  // Persist allocation to each submission
  await Promise.all(
    submissions.map((s) =>
      updateSubmission(s.id, { allocatedCharacter: allocation[s.id] })
    )
  );

  await setSession({
    status: 'allocated',
    allocatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: true, allocation });
}
