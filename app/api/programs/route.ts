import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const programFiles = [
      'hackerone_programs_final.json',
      'bugcrowd_programs_final.json',
      'yeswehack_programs.json',
      'intigriti_programs.json'
    ];

    const allPrograms = [];
    let totalPrograms = 0;

    for (const file of programFiles) {
      const filePath = path.join(process.cwd(), 'app/api/programs', file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);
      
      // Extract platform name from filename
      const platform = file.split('_')[0];
      
      // Handle HackerOne data structure (object with id, name, url objects)
      if (platform === 'hackerone') {
        const programs = Object.keys(data.id).map(index => ({
          id: data.id[index],
          name: data.name[index],
          url: data.url[index],
          platform: 'HackerOne',
          max_bounty: null // HackerOne doesn't have max_bounty
        }));
        allPrograms.push(...programs);
        totalPrograms += programs.length;
      }
      // Handle Bugcrowd, YesWeHack, and Intigriti data structure (array of objects)
      else {
        const platformName = {
          'bugcrowd': 'Bugcrowd',
          'yeswehack': 'YesWeHack',
          'intigriti': 'Intigriti'
        }[platform];

        const programs = data.map((program: any, index: number) => {
          // Convert max_bounty to a number or null
          let maxBounty = null;
          if (program.max_bounty !== undefined && program.max_bounty !== null) {
            maxBounty = Number(program.max_bounty);
            // If conversion failed or resulted in NaN, set to null
            if (isNaN(maxBounty)) maxBounty = null;
          }

          return {
            id: index.toString(),
            name: program.name,
            url: program.url,
            platform: platformName,
            max_bounty: maxBounty
          };
        });
        allPrograms.push(...programs);
        totalPrograms += programs.length;
      }
    }

    return NextResponse.json({
      data: allPrograms,
      total_programs: totalPrograms,
      platforms: ['HackerOne', 'Bugcrowd', 'YesWeHack', 'Intigriti']
    });
  } catch (error) {
    console.error('Error processing program data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch program data' },
      { status: 500 }
    );
  }
} 