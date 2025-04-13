import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

// Vereinfachte Funktion ohne Retries (aus squad/route.ts übernommen oder hier definiert)
async function safeApiRequest(url: string, options: RequestInit) {
  try {
    const response = await fetch(url, options);
    const responseText = await response.text();

    // Check for empty or non-JSON responses
    if (!responseText || responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
      throw new Error(responseText.includes('<html') ? 'HTML statt JSON erhalten' : 'Leere Antwort');
    }

    const data = JSON.parse(responseText);

    // Check for API errors indicated by status code or specific message fields
    if (!response.ok) {
      throw new Error(data.message || data.errMsg || `HTTP-Fehler ${response.status}`);
    }

    return { error: null, status: response.status, data };
  } catch (error: any) {
    // Log the error here for debugging purposes on the server side
    console.error(`[API Route Performance] Fehler bei API-Anfrage an ${url}:`, error.message);
    // Return a structured error object
    return { error: error.message || 'API-Anfrage fehlgeschlagen', status: 500, data: null };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { leagueId: string; userId: string } }
) {
  try {
    const leagueId = params.leagueId;
    const userId = params.userId;
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Authorization header fehlt' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    // console.log(`[API Route Performance] Anfrage für Liga ${leagueId}, Manager ${userId}`); // Auskommentiert

    const performanceResult = await safeApiRequest(
      `https://api.kickbase.com/v4/leagues/${leagueId}/managers/${userId}/performance`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Kickbase/iOS 6.9.0', // Consider updating User-Agent periodically
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (performanceResult.error || !performanceResult.data) {
      // Error already logged in safeApiRequest
      return NextResponse.json(
        { message: `Fehler beim Abrufen der Performance-Daten: ${performanceResult.error}` },
        { status: performanceResult.status || 500 }
      );
    }

    // console.log('[API Route Performance] Performance-Daten erfolgreich abgerufen'); // Auskommentiert
    // Return the complete performance data from Kickbase
    return NextResponse.json(performanceResult.data);

  } catch (error: any) {
    // Catch unexpected errors during processing
    console.error('[API Route Performance] Unerwarteter Server-Fehler:', error);
    return NextResponse.json(
      { message: error.message || 'Ein interner Serverfehler ist aufgetreten' },
      { status: 500 }
    );
  }
}
