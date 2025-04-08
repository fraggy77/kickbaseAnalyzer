import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

// Du kannst die safeApiRequest Funktion hierher kopieren oder besser:
// Lagere safeApiRequest in eine eigene Datei aus, z.B. src/lib/api-utils.ts
// und importiere sie hier und in squad/route.ts
// Hier der Einfachheit halber kopiert:
async function safeApiRequest(url: string, options: RequestInit) {
  const maxAttempts = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[API Route /me] Versuch ${attempt}: ${options.method || 'GET'} ${url}`);
      const response = await fetch(url, options);
      console.log(`[API Route /me] Status für ${url}: ${response.status}`);

      const responseText = await response.text();
      if (!responseText) throw new Error('Leere Antwort vom Server');
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) throw new Error('HTML statt JSON erhalten');

      const data = JSON.parse(responseText);

      if (!response.ok) {
        throw new Error(data.message || data.errMsg || `HTTP-Fehler ${response.status}`);
      }

      return { error: null, status: response.status, data };

    } catch (error: any) {
      console.error(`[API Route /me] Fehler bei Versuch ${attempt} für ${url}:`, error.message);
      lastError = error;
      if (attempt < maxAttempts) {
        const waitTime = Math.pow(2, attempt) * 300;
        console.log(`[API Route /me] Warte ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  return { error: lastError?.message || 'API-Anfrage fehlgeschlagen', status: 500, data: null };
}


export async function GET(
  request: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  try {
    const leagueId = params.leagueId;
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Authorization header fehlt' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    console.log(`[API Route /me] Anfrage für Liga ${leagueId}`);

    // Rufe den /me Endpunkt von Kickbase ab
    const meResult = await safeApiRequest(`https://api.kickbase.com/v4/leagues/${leagueId}/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Kickbase/iOS 6.9.0',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (meResult.error || !meResult.data) {
      console.error(`[API Route /me] Fehler beim Abrufen der ME-Daten: ${meResult.error}`);
      return NextResponse.json(
        { message: `Fehler beim Abrufen der Ligainformationen: ${meResult.error || 'Keine Daten erhalten'}` },
        { status: meResult.status || 500 }
      );
    }

    console.log('[API Route /me] ME-Daten erfolgreich abgerufen:', Object.keys(meResult.data));
    // Gib die ME-Daten direkt zurück
    return NextResponse.json(meResult.data);

  } catch (error: any) {
    console.error('[API Route /me] Unerwarteter Fehler:', error);
    return NextResponse.json(
      { message: error.message || 'Ein interner Serverfehler ist aufgetreten' },
      { status: 500 }
    );
  }
}
