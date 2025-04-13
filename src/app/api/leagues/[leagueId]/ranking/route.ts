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
    console.error(`[API Route Ranking] Fehler bei API-Anfrage an ${url}:`, error.message);
    // Return a structured error object
    return { error: error.message || 'API-Anfrage fehlgeschlagen', status: 500, data: null };
  }
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
    // console.log(`[API Route Ranking] Anfrage für Liga ${leagueId}`); // Auskommentiert

    const rankingResult = await safeApiRequest(
      `https://api.kickbase.com/v4/leagues/${leagueId}/ranking`,
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

    if (rankingResult.error || !rankingResult.data) {
      // Error already logged in safeApiRequest
      return NextResponse.json(
        { message: `Fehler beim Abrufen der Liga-Tabelle: ${rankingResult.error}` },
        { status: rankingResult.status || 500 }
      );
    }

    const rankingData = rankingResult.data;

    // Bild-URLs korrigieren (Diese Logik war vorher im Frontend Client)
    if (rankingData && rankingData.us && Array.isArray(rankingData.us)) {
      rankingData.us = rankingData.us.map((user: any) => {
        if (user.uim && typeof user.uim === 'string' && !user.uim.startsWith('http')) {
          // Handle different possible relative paths from Kickbase API
          if (user.uim.startsWith('users/')) {
             // Already includes 'users/' part, construct full URL
             user.uim = `https://kickbase.b-cdn.net/${user.uim}`;
          } else if (user.uim.includes('/')) {
             // Assume it's a path like 'user/12345/abcdef.jpg' or similar - use as is with base CDN
             user.uim = `https://kickbase.b-cdn.net/${user.uim}`;
          } else {
             // Assume it's just the image filename, construct path with user ID
             // Requires user ID (user.i) to be present in the user object
             user.uim = `https://kickbase.b-cdn.net/user/${user.i}/${user.uim}`;
          }
        }
        return user;
      });
    }

    // console.log('[API Route Ranking] Ranking-Daten erfolgreich abgerufen und verarbeitet'); // Auskommentiert
    return NextResponse.json(rankingData);

  } catch (error: any) {
    // Catch unexpected errors during processing
    console.error('[API Route Ranking] Unerwarteter Server-Fehler:', error);
    return NextResponse.json(
      { message: error.message || 'Ein interner Serverfehler ist aufgetreten' },
      { status: 500 }
    );
  }
}
