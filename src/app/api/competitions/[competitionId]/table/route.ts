import { NextResponse, NextRequest } from 'next/server';

// Define the expected structure for a team in the table
interface BundesligaTeam {
  tid: string;
  tn: string;
  il: boolean;
  mi: string;
  cp: number; // Current Points (Bundesliga)
  cpl: number; // Current Placement
  pcpl: number; // Previous Placement
  mc: number; // Matches Count
  gd: number; // Goal Difference
  sp: number; // Season Points (Kickbase?)
  tim: string; // Team Image path
}

// Removed fetchPublicApi - Now requires Authentication

export async function GET(
  request: NextRequest,
  { params }: { params: { competitionId: string } }
) {
  try {
    const competitionId = params.competitionId;
    const authHeader = request.headers.get('Authorization'); // Get token from incoming request

    if (!competitionId) {
      return NextResponse.json({ message: 'Competition ID fehlt' }, { status: 400 });
    }
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Authorization header fehlt' }, { status: 401 });
    }
    // No need to extract the token here, just pass the whole header

    console.log(`[API Route CompetitionTable] Authenticated request for Competition ${competitionId}`);

    const externalUrl = `https://api.kickbase.com/v4/competitions/${competitionId}/table`;
    const externalResponse = await fetch(externalUrl, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'User-Agent': 'KickbaseAnalyzer/1.0 (WebApp)', // Keep User-Agent
            'Authorization': authHeader // Forward the received Authorization header
        }
    });

    const responseText = await externalResponse.text();
    console.log(`[API Route CompetitionTable] External API Status: ${externalResponse.status}`);
    console.log(`[API Route CompetitionTable] External API Text (start): ${responseText.substring(0, 100)}...`);

    if (!externalResponse.ok) {
        let errorMsg = `Kickbase API Fehler: ${externalResponse.status}`;
        try {
            const errorData = JSON.parse(responseText); 
            errorMsg = errorData.message || errorData.errMsg || errorMsg;
        } catch {}
        throw new Error(errorMsg);
    }

    if (!responseText || responseText.includes('<!DOCTYPE')) { // Basic validation
         throw new Error('Ungültige Antwort von Kickbase erhalten');
    }

    const data = JSON.parse(responseText);

    if (!data || !Array.isArray(data.it)) {
        throw new Error("Ungültiges Datenformat von Kickbase API erhalten (fehlendes 'it'-Array).");
    }

    // Return the array of teams
    return NextResponse.json(data.it);

  } catch (error: any) {
    console.error(`[API Route CompetitionTable] Fehler:`, error);
    return NextResponse.json(
      { message: error.message || 'Interner Serverfehler' },
      { status: 500 }
    );
  }
} 