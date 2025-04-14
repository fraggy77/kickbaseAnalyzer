// src/app/api/leagues/[leagueId]/squad/route.ts

import { NextResponse, NextRequest } from 'next/server';

// Hilfsfunktion für API-Requests mit Retry etc. (kann ausgelagert werden)
async function safeApiRequest(url: string, options: RequestInit) {
  const maxAttempts = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[API Route] Versuch ${attempt}: ${options.method || 'GET'} ${url}`);
      const response = await fetch(url, options);
      console.log(`[API Route] Status für ${url}: ${response.status}`);

      const responseText = await response.text();
      if (!responseText) throw new Error('Leere Antwort vom Server');
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) throw new Error('HTML statt JSON erhalten');

      const data = JSON.parse(responseText);

      if (!response.ok) {
        throw new Error(data.message || data.errMsg || `HTTP-Fehler ${response.status}`);
      }
      // Wichtig: Kickbase sendet manchmal { message: "..." } auch bei Erfolg, aber leerem Inhalt
      if (data.message && !data.it && !data.pl) { // Prüfen ob relevante Daten fehlen
          console.warn(`[API Route] Erfolgreiche Antwort, aber evtl. leere Daten: ${data.message}`);
          // Entscheiden, ob das als Fehler gilt oder leere Daten OK sind
          // Hier gehen wir davon aus, dass leere Daten OK sind, wenn der Status OK war
      }


      return { error: null, status: response.status, data };

    } catch (error: any) {
      console.error(`[API Route] Fehler bei Versuch ${attempt} für ${url}:`, error.message);
      lastError = error;
      if (attempt < maxAttempts) {
        const waitTime = Math.pow(2, attempt) * 300;
        console.log(`[API Route] Warte ${waitTime}ms...`);
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
        console.error('[API Route /squad] Keine leagueId nach await params gefunden!', params);
        // Logge auch den ursprünglichen context, falls params leer war
        console.log('[API Route /squad] Ursprünglicher Context:', context);
        return NextResponse.json({ message: 'Liga-ID konnte nicht extrahiert werden' }, { status: 400 });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Authorization header fehlt' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    // console.log(`[API Route /squad] Anfrage für Liga ${leagueId}`);

    const squadResult = await safeApiRequest(
      `https://api.kickbase.com/v4/leagues/${leagueId}/squad`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Kickbase/iOS 6.9.0', // Oder eine neuere Version
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (squadResult.error || !squadResult.data) {
      return NextResponse.json(
        { message: `Fehler beim Abrufen der Spielerdaten: ${squadResult.error || 'Keine Daten erhalten'}` },
        { status: squadResult.status || 500 }
      );
    }

    // !!! NEUER DEBUG-LOG: Was genau kommt von Kickbase zurück? !!!
    // console.log('[API Route /squad] RAW RESPONSE von Kickbase API:', JSON.stringify(squadResult.data, null, 2)); // Kann jetzt wieder auskommentiert werden

    const squadData = squadResult.data;
    const playersRaw = squadData.it || [];
    const transformedPlayers = playersRaw.map((player: any) => {
       const teamIdToUse = String(player.tid || '');
       // Prüfe ob Vorname 'fn' in den rohen Daten existiert, sonst Fallback
       const firstName = player.fn || '';
       // Prüfe ob Nachname 'n' existiert, sonst Fallback
       const lastName = player.n || '';
      return {
        id: player.i || '', // ID ist 'i'
        firstName: firstName, // Vorname ist oft nicht dabei, aber sicherheitshalber prüfen
        lastName: lastName, // Nachname ist 'n'
        position: player.pos || 0, // 'pos'
        status: player.st || 0, // 'st'
        marketValue: player.mv || 0, // 'mv'
        points: player.p || 0, // 'p'
        teamId: teamIdToUse, // 'tid'
        mvgl: player.mvgl || 0, // 'mvgl'
        pim: player.pim || '', // 'pim'
      };
    });

    const responseData = { pl: transformedPlayers };
    // console.log('[API Route /squad] Sende folgende Datenstruktur zurück:', JSON.stringify(responseData, null, 2)); // Wieder aktivieren zum Testen
    return NextResponse.json(responseData);

  } catch (error: any) {
    // Versuche, die League ID auch hier zu loggen (könnte fehlschlagen, wenn await fehlschlägt)
    let resolvedLeagueId = 'unbekannt';
    try { resolvedLeagueId = (await context.params)?.leagueId || 'nicht im Promise'; } catch {}
    console.error(`[API Route /squad] Unerwarteter Fehler für Liga ${resolvedLeagueId}:`, error);
    return NextResponse.json(
      { message: error.message || 'Ein interner Serverfehler ist aufgetreten' },
      { status: 500 }
    );
  }
}