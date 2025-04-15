import { NextResponse, NextRequest } from 'next/server';

// Deine safeApiRequest Funktion (oder importiere sie)
async function safeApiRequest(url: string, options: RequestInit) {
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
        console.error(`[API Route Teamcenter] Fehler bei API-Anfrage an ${url}:`, error.message);
        return { error: error.message || 'API-Anfrage fehlgeschlagen', status: 500, data: null };
    }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ leagueId: string; userId: string }> } // Nimmt leagueId UND userId
) {
  try {
    const params = await context.params;
    const leagueId = params?.leagueId;
    const userId = params?.userId; // Hol dir die userId

    if (!leagueId || !userId) {
        console.error('[API Route Teamcenter] Keine leagueId oder userId in params gefunden!', params);
        return NextResponse.json({ message: 'Liga-ID oder User-ID fehlt in der Anfrage' }, { status: 400 });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Authorization header fehlt' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    // console.log(`[API Route Teamcenter] Anfrage für Liga ${leagueId}, User ${userId}`);

    // Rufe Kickbase auf - OHNE dayNumber erstmal
    const teamcenterResult = await safeApiRequest(
      `https://api.kickbase.com/v4/leagues/${leagueId}/users/${userId}/teamcenter`,
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

    if (teamcenterResult.error || !teamcenterResult.data) {
      return NextResponse.json(
        { message: `Fehler beim Abrufen der Teamcenter-Daten: ${teamcenterResult.error || 'Keine Daten erhalten'}` },
        { status: teamcenterResult.status || 500 }
      );
    }

    // Gib die relevanten Daten zurück (z.B. das 'lp'-Array)
    // Die Antwort enthält laut deinem Beispiel mehr, aber wir brauchen primär 'lp'
    // Die Antwort enthält anscheinend ein Array 'us', wir müssen den richtigen User finden
    const allUsersData = teamcenterResult.data.us || [];
    const targetUserData = allUsersData.find((user: any) => user.i === userId);

    if (!targetUserData) {
        console.error(`[API Route Teamcenter] User ${userId} nicht in Teamcenter-Antwort gefunden.`);
        return NextResponse.json({ message: `Startelf für User ${userId} nicht gefunden` }, { status: 404 });
    }

     // Extrahiere die lineup player IDs ('lp') für den Ziel-User
     // Filtere null-Werte und konvertiere zu string
    const startingPlayerIds = (targetUserData.lp || [])
                                .filter((id: any) => id !== null)
                                .map(String);

    // console.log(`[API Route Teamcenter] Startelf-IDs für User ${userId}:`, startingPlayerIds);

    // Sende nur die Liste der IDs zurück
    return NextResponse.json({ startingPlayerIds });


  } catch (error: any) {
    let resolvedLeagueId = 'unbekannt';
    let resolvedUserId = 'unbekannt';
    try {
        const p = await context.params;
        resolvedLeagueId = p?.leagueId || 'nicht im Promise';
        resolvedUserId = p?.userId || 'nicht im Promise';
    } catch {}
    console.error(`[API Route Teamcenter] Unerwarteter Fehler für Liga ${resolvedLeagueId}, User ${resolvedUserId}:`, error);
    return NextResponse.json(
      { message: error.message || 'Ein interner Serverfehler ist aufgetreten' },
      { status: 500 }
    );
  }
}