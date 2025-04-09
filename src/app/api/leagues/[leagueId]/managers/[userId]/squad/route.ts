import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

// Die safeApiRequest-Funktion (kopiert oder importiert)
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
      console.error(`[API Route ManagerSquad] Fehler Versuch ${attempt} für ${url}:`, error.message);
      lastError = error;
      if (attempt < maxAttempts) await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 300));
    }
  }
  return { error: lastError?.message || 'API-Anfrage fehlgeschlagen', status: 500, data: null };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { leagueId: string; userId: string } } // userId hinzugefügt
) {
  try {
    const leagueId = params.leagueId;
    const userId = params.userId; // userId aus Parametern holen
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Authorization header fehlt' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    console.log(`[API Route ManagerSquad] Anfrage für Liga ${leagueId}, Manager ${userId}`);

    // Rufe den spezifischen Manager-Squad Endpunkt von Kickbase ab
    const managerSquadResult = await safeApiRequest(
      `https://api.kickbase.com/v4/leagues/${leagueId}/managers/${userId}/squad`, // Korrekter Kickbase Endpunkt
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

    if (managerSquadResult.error || !managerSquadResult.data) {
      console.error(`[API Route ManagerSquad] Fehler beim Abrufen der Manager-Squad-Daten: ${managerSquadResult.error}`);
      return NextResponse.json(
        { message: `Fehler beim Abrufen der Manager-Spielerdaten: ${managerSquadResult.error || 'Keine Daten erhalten'}` },
        { status: managerSquadResult.status || 500 }
      );
    }

    const managerData = managerSquadResult.data;
    const playersRaw = managerData.it || []; // Spieler sind hier in 'it'

    console.log(`[API Route ManagerSquad] ${playersRaw.length} Spieler von Manager ${userId} erhalten.`);
    if (playersRaw.length > 0) {
         console.log('[API Route ManagerSquad] Erstes rohes Spielerobjekt:', playersRaw[0]);
    }

    // Spielerdaten transformieren (Namen anpassen: pi -> id, pn -> lastName)
    const transformedPlayers = playersRaw.map((player: any) => ({
      id: player.pi || '', // Player ID ist 'pi'
      firstName: '', // Vorname ist in dieser Antwort nicht enthalten
      lastName: player.pn || '', // Nachname ist 'pn'
      position: player.pos || 0,
      status: player.st || 0,
      marketValue: player.mv || 0,
      points: player.p || 0,
      teamId: String(player.tid || ''), // Team ID des Vereins
      mvgl: player.mvgl || 0,
      pim: player.pim || '',
      // Weitere nützliche Felder aus der Antwort könnten hier hinzugefügt werden
      // z.B. purchasePrice: player.prc
    }));

    // Gesamte Antwort von Kickbase zurückgeben, aber mit transformierten Spielern
    const responseData = {
      managerUserId: managerData.u || userId,
      managerName: managerData.unm || 'Unbekannter Manager',
      managerImage: managerData.uim || '',
      pl: transformedPlayers, // Transformierte Spielerliste unter 'pl' für Konsistenz?
      // Füge hier weitere Felder aus managerData hinzu, falls benötigt
    };

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('[API Route ManagerSquad] Unerwarteter Fehler:', error);
    return NextResponse.json(
      { message: error.message || 'Ein interner Serverfehler ist aufgetreten' },
      { status: 500 }
    );
  }
}
