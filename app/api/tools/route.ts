import { NextResponse } from 'next/server';
import smartTools from './smart_contract.json';
import web2Tools from './web2_security_tools.json';

export async function GET() {
  try {
    const combined = [...smartTools, ...web2Tools];
    return NextResponse.json(combined);
  } catch (error) {
    console.error('Error processing tools data:', error);
    return NextResponse.json({ error: 'Failed to load tools data' }, { status: 500 });
  }
} 