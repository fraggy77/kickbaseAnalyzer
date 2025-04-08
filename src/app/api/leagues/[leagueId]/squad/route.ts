// src/app/api/leagues/[leagueId]/squad/route.ts

import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

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
  { params }: { params: { leagueId: string } }
) {
  try {
    const leagueId = params.leagueId;
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Authorization header fehlt' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    console.log(`[API Route /squad] Anfrage für Liga ${leagueId}`);

    // Nur die Spielerdaten vom Kickbase /squad Endpunkt abrufen
    const squadResult = await safeApiRequest(`https://api.kickbase.com/v4/leagues/${leagueId}/squad`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Kickbase/iOS 6.9.0', // Oder eine neuere Version
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (squadResult.error || !squadResult.data) {
      console.error(`[API Route /squad] Fehler beim Abrufen der Squad-Daten: ${squadResult.error}`);
      return NextResponse.json(
        { message: `Fehler beim Abrufen der Spielerdaten: ${squadResult.error || 'Keine Daten erhalten'}` },
        { status: squadResult.status || 500 }
      );
    }

    const squadData = squadResult.data;
    const players = squadData.it || []; // Spieler sind im 'it'-Array

    console.log(`[API Route /squad] ${players.length} Spieler von Kickbase erhalten.`);
    if (players.length > 0) {
         console.log('[API Route /squad] Erstes rohes Spielerobjekt:', players[0]);
         console.log('[API Route /squad] Keys des ersten rohen Spielers:', Object.keys(players[0]));
    }


    // Spielerdaten transformieren
    const transformedPlayers = players.map((player: any) => {
       const teamIdToUse = String(player.tid || ''); // Sicherstellen, dass es ein String ist
        console.log(`[API Route /squad] Mapping player ${player.n}. Using teamId: '${teamIdToUse}' from field 'tid'`);
      return {
        id: player.i || '',
        firstName: player.fn || '',
        lastName: player.n || player.ln || '',
        position: player.pos || 0,
        status: player.st || 0,
        marketValue: player.mv || 0,
        points: player.p || 0,
        teamId: teamIdToUse, // Korrigiert: String verwenden
        mvgl: player.mvgl || 0,
        pim: player.pim || '',
        // originalData: player // Optional für Debugging im Frontend
      };
    });

    // Nur die transformierte Spielerliste zurückgeben
    // Wichtig: Das Frontend (`loadTeamData`) erwartet die Spieler unter dem Key `pl`
    return NextResponse.json({ pl: transformedPlayers });

  } catch (error: any) {
    console.error('[API Route /squad] Unerwarteter Fehler:', error);
    return NextResponse.json(
      { message: error.message || 'Ein interner Serverfehler ist aufgetreten' },
      { status: 500 }
    );
  }
}