import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: 'No email provided' }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), 'subscribers.txt');
  const line = `${email}\n`;

  try {
    await fs.appendFile(filePath, line, 'utf8');
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save email' }, { status: 500 });
  }
} 