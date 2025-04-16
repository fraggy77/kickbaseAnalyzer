import { NextResponse, NextRequest } from 'next/server';

// Simple error handler
function handleError(message: string, status: number = 500) {
  console.error(`[API Route TeamProfile] Error: ${message}`);
  return NextResponse.json({ message }, { status });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { competitionId: string; teamId: string } }
) {
  try {
    const competitionId = params.competitionId;
    const teamId = params.teamId;
    const authHeader = request.headers.get('Authorization');

    if (!competitionId || !teamId) {
      return handleError('Competition ID oder Team ID fehlt', 400);
    }
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return handleError('Authorization header fehlt', 401);
    }

    console.log(`[API Route TeamProfile] Request for Competition ${competitionId}, Team ${teamId}`);

    const externalUrl = `https://api.kickbase.com/v4/competitions/${competitionId}/teams/${teamId}/teamprofile`;
    const externalResponse = await fetch(externalUrl, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'User-Agent': 'KickbaseAnalyzer/1.0 (WebApp)',
            'Authorization': authHeader 
        }
    });

    const responseText = await externalResponse.text();
    console.log(`[API Route TeamProfile] External API Status: ${externalResponse.status}`);
    // console.log(`[API Route TeamProfile] External API Text: ${responseText}`); // Optional: Log full response for debug

    if (!externalResponse.ok) {
        let errorMsg = `Kickbase API Fehler: ${externalResponse.status}`;
        try {
            const errorData = JSON.parse(responseText); 
            errorMsg = errorData.message || errorData.errMsg || errorMsg;
        } catch {}
        return handleError(errorMsg, externalResponse.status);
    }

    if (!responseText || responseText.includes('<!DOCTYPE')) {
         return handleError('Ungültige Antwort von Kickbase erhalten', 502);
    }

    const data = JSON.parse(responseText);

    // Basic validation of expected structure (can be more specific)
    if (!data || typeof data !== 'object' || !Array.isArray(data.it)) {
        return handleError('Ungültiges Datenformat von Kickbase API erhalten.', 502);
    }

    // Return the full profile data object
    return NextResponse.json(data);

  } catch (error: any) {
    return handleError(error.message || 'Interner Serverfehler');
  }
} 