import { NextResponse, NextRequest } from 'next/server';

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
  context: { params: Promise<{ leagueId: string }> } // Empfange context, params ist ein Promise
) {
  try {
    // !!! NEU: Warte auf das params-Promise !!!
    const params = await context.params;
    const leagueId = params?.leagueId; // Jetzt sollte der Zugriff funktionieren

    // Prüfen, ob leagueId nach dem await da ist
    if (!leagueId) {
        console.error('[API Route /me] Keine leagueId nach await params gefunden!', params);
        console.log('[API Route /me] Ursprünglicher Context:', context);
        return NextResponse.json({ message: 'Liga-ID konnte nicht extrahiert werden' }, { status: 400 });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Authorization header fehlt' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    // console.log(`[API Route /me] Anfrage für Liga ${leagueId}`);

    const meResult = await safeApiRequest(
      `https://api.kickbase.com/v4/leagues/${leagueId}/me`,
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

    if (meResult.error || !meResult.data) {
       return NextResponse.json(
        { message: `Fehler beim Abrufen der /me Daten: ${meResult.error}` },
        { status: meResult.status || 500 }
      );
    }

    return NextResponse.json(meResult.data);

  } catch (error: any) {
    let resolvedLeagueId = 'unbekannt';
    try { resolvedLeagueId = (await context.params)?.leagueId || 'nicht im Promise'; } catch {}
    console.error(`[API Route /me] Unerwarteter Fehler für Liga ${resolvedLeagueId}:`, error);
    return NextResponse.json(
      { message: error.message || 'Ein interner Serverfehler ist aufgetreten' },
      { status: 500 }
    );
  }
}
