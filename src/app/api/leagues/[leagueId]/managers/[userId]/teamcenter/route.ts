import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

// zum finden der S11 der anderen Manager
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
      console.error(`[API Route Teamcenter] Fehler Versuch ${attempt} für ${url}:`, error.message);
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
    const userId = params.userId; // Der User, dessen Teamcenter wir wollen
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Authorization header fehlt' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    console.log(`[API Route Teamcenter] Anfrage für Liga ${leagueId}, Manager ${userId}`);

    // Rufe den Teamcenter Endpunkt von Kickbase ab
    // WICHTIG: Dieser Endpunkt gibt oft ALLE User der Liga zurück, wir müssen filtern!
    const teamcenterResult = await safeApiRequest(
      `https://api.kickbase.com/v4/leagues/${leagueId}/users/${userId}/teamcenter`, // Endpoint angepasst
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Kickbase/iOS 6.9.0', // oder deine User-Agent
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (teamcenterResult.error || !teamcenterResult.data) {
      console.error(`[API Route Teamcenter] Fehler beim Abrufen der Teamcenter-Daten: ${teamcenterResult.error}`);
      return NextResponse.json(
        { message: `Fehler beim Abrufen der Teamcenter-Daten: ${teamcenterResult.error || 'Keine Daten erhalten'}` },
        { status: teamcenterResult.status || 500 }
      );
    }

    // Finde den spezifischen User in der Antwort (falls die API alle User liefert)
    // Manchmal liefert der Endpunkt aber auch direkt nur den gefragten User
    let targetUserData = null;
    if (Array.isArray(teamcenterResult.data.us)) {
        targetUserData = teamcenterResult.data.us.find((user: any) => user.i === userId);
    } else if (teamcenterResult.data.us && teamcenterResult.data.us.i === userId) {
        // Falls die API nur den einen User liefert
         targetUserData = teamcenterResult.data.us;
    } else if (teamcenterResult.data.i === userId) {
        // Manchmal ist der User direkt im Root-Objekt
        targetUserData = teamcenterResult.data;
    }


    if (!targetUserData) {
        console.warn(`[API Route Teamcenter] User ${userId} nicht in der Teamcenter-Antwort gefunden.`);
        // Was zurückgeben? Leeres Objekt oder Fehler? Hier leeres lpi-Array.
        return NextResponse.json({ lpi: [] });
    }


    console.log('[API Route Teamcenter] Teamcenter-Daten erfolgreich abgerufen und gefiltert');
    // Gib nur die relevanten Daten (lpi) für den angefragten User zurück
    return NextResponse.json({
        lpi: targetUserData.lpi || [] // Stelle sicher, dass lpi existiert
    });

  } catch (error: any) {
    console.error('[API Route Teamcenter] Unerwarteter Fehler:', error);
    return NextResponse.json(
      { message: error.message || 'Ein interner Serverfehler ist aufgetreten' },
      { status: 500 }
    );
  }
}
