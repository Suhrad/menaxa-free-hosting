import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'idor';

    const filePath = path.join(process.cwd(), 'app/api/vulnerabilities/checklist', `${type}.md`);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { content } = matter(fileContent);

    return NextResponse.json({
      content,
      type
    });
  } catch (error) {
    console.error('Error processing checklist data:', error);
    return NextResponse.json(
      { error: 'Failed to load checklist data' },
      { status: 500 }
    );
  }
} 