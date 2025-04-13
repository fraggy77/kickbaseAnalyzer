import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

// Vereinfachte Funktion ohne Retries
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
    console.error(`[API Route ManagerSquad] Fehler bei API-Anfrage an ${url}:`, error.message);
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
    // console.log(`[API Route ManagerSquad] Anfrage für Liga ${leagueId}, Manager ${userId}`); // Auskommentiert

    const managerSquadResult = await safeApiRequest(
      `https://api.kickbase.com/v4/leagues/${leagueId}/managers/${userId}/squad`,
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

    if (managerSquadResult.error || !managerSquadResult.data) {
      // Error already logged in safeApiRequest
      return NextResponse.json(
        { message: `Fehler beim Abrufen der Manager-Spielerdaten: ${managerSquadResult.error}` },
        { status: managerSquadResult.status || 500 }
      );
    }

    const managerData = managerSquadResult.data;
    const playersRaw = managerData.it || [];


    // Transform player data
    const transformedPlayers = playersRaw.map((player: any) => ({
      id: player.pi || '',
      firstName: '', // Not available in this response
      lastName: player.pn || '',
      position: player.pos || 0,
      status: player.st || 0,
      marketValue: player.mv || 0,
      points: player.p || 0,
      teamId: String(player.tid || ''),
      mvgl: player.mvgl || 0, // market value gain/loss
      pim: player.pim || '', // player image
      // purchasePrice: player.prc // purchase price (if needed)
    }));

    // Structure the response data
    const responseData = {
      managerUserId: managerData.u || userId,
      managerName: managerData.unm || 'Unbekannter Manager',
      managerImage: managerData.uim || '', // Manager image (if available)
      pl: transformedPlayers, // Use 'pl' for consistency? Or 'players'?
      // Add other relevant fields from managerData if necessary
      // e.g., teamValue: managerData.tv (if available in this endpoint)
    };

    return NextResponse.json(responseData);

  } catch (error: any) {
    // Catch unexpected errors during processing
    console.error('[API Route ManagerSquad] Unerwarteter Server-Fehler:', error);
    return NextResponse.json(
      { message: error.message || 'Ein interner Serverfehler ist aufgetreten' },
      { status: 500 }
    );
  }
}
