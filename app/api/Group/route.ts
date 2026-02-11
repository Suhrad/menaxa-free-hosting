import { NextResponse } from 'next/server';
import aptGroups from './APT_Group.json';

export async function GET() {
  return NextResponse.json(aptGroups);
} 