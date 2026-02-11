import { NextResponse } from 'next/server';

// Import JSON files directly
import smartContractVulns from './smart_contract_vulnerabilities_fully_complete.json';
import webVulns from './all_web_vulnerabilities_complete.json';

export async function GET() {
  try {
    // Combine and format the data
    const combinedData = [
      ...smartContractVulns.map((vuln: any) => ({
        ...vuln,
        type: 'Smart Contract',
        severity: getSeverity(vuln),
      })),
      ...webVulns.map((vuln: any) => ({
        ...vuln,
        type: 'Web',
        severity: getSeverity(vuln),
      }))
    ];

    return NextResponse.json(combinedData);
  } catch (error) {
    console.error('Error processing vulnerability data:', error);
    return NextResponse.json({ error: 'Failed to load vulnerability data' }, { status: 500 });
  }
}

// Helper function to determine severity based on content
function getSeverity(vuln: any): string {
  const description = (vuln.detailed_description || '').toLowerCase();
  const name = (vuln.name || '').toLowerCase();
  
  if (
    description.includes('critical') ||
    description.includes('severe') ||
    name.includes('critical') ||
    description.includes('high risk') ||
    description.includes('dangerous')
  ) {
    return 'Critical';
  } else if (
    description.includes('high') ||
    description.includes('significant') ||
    description.includes('important')
  ) {
    return 'High';
  } else if (
    description.includes('medium') ||
    description.includes('moderate')
  ) {
    return 'Medium';
  } else {
    return 'Low';
  }
} 