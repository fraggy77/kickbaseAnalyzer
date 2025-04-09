import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

// safeApiRequest Funktion (kopiert oder importiert)
async function safeApiRequest(url: string, options: RequestInit) {
  const maxAttempts = 3;
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, options);
      const responseText = await response.text();
      if (!responseText || responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
        throw new Error(responseText.includes('<html') ? 'HTML statt JSON erhalten' : 'Leere Antwort');
      }
      const data = JSON.parse(responseText);
      if (!response.ok) {
        throw new Error(data.message || data.errMsg || `HTTP-Fehler ${response.status}`);
      }
      return { error: null, status: response.status, data };
    } catch (error: any) {
      console.error(`[API Route Performance] Fehler Versuch ${attempt} für ${url}:`, error.message);
      lastError = error;
      if (attempt < maxAttempts) await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 300));
    }
  }
  return { error: lastError?.message || 'API-Anfrage fehlgeschlagen', status: 500, data: null };
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
    console.log(`[API Route Performance] Anfrage für Liga ${leagueId}, Manager ${userId}`);

    // Rufe den Performance Endpunkt von Kickbase ab
    const performanceResult = await safeApiRequest(
      `https://api.kickbase.com/v4/leagues/${leagueId}/managers/${userId}/performance`, // Korrekter Endpunkt
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Kickbase/iOS 6.9.0',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (performanceResult.error || !performanceResult.data) {
      console.error(`[API Route Performance] Fehler beim Abrufen der Performance-Daten: ${performanceResult.error}`);
      return NextResponse.json(
        { message: `Fehler beim Abrufen der Performance-Daten: ${performanceResult.error || 'Keine Daten erhalten'}` },
        { status: performanceResult.status || 500 }
      );
    }

    console.log('[API Route Performance] Performance-Daten erfolgreich abgerufen');
    // Gib die kompletten Performance-Daten zurück
    return NextResponse.json(performanceResult.data);

  } catch (error: any) {
    console.error('[API Route Performance] Unerwarteter Fehler:', error);
    return NextResponse.json(
      { message: error.message || 'Ein interner Serverfehler ist aufgetreten' },
      { status: 500 }
    );
  }
}
