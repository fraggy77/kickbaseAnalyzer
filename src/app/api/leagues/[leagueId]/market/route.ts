import { NextResponse, NextRequest } from 'next/server';
import { normalizePlayer } from '@/utils/player.utils'; // Importiere den Normalizer
import type { Player } from '@/types/player.types'; // Importiere Player Typ für Transformation

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
        console.error(`[API Route Market] Fehler bei API-Anfrage an ${url}:`, error.message);
        return { error: error.message || 'API-Anfrage fehlgeschlagen', status: 500, data: null };
    }
}

// Interface für den Verkäufer (optional, aber gut für Struktur)
interface SellerInfo {
    id: string;
    name: string;
    profileImage?: string;
}

// Erweitertes Player Interface für den Transfermarkt
interface MarketPlayer extends Player {
    price: number; // prc
    expiryDate: string; // dt
    exs: number; // Verbleibende Sekunden bis Ablauf
    mvt?: number; // Market value trend
    ap?: number; // Average points
    seller?: SellerInfo | null; // u (kann null sein für Kickbase-Spieler)
    onMarketSince?: string; // Optional: Könnte nützlich sein, wenn das Feld existiert
}


export async function GET(
  request: NextRequest,
  context: { params: Promise<{ leagueId: string }> }
) {
  try {
    const params = await context.params;
    const leagueId = params?.leagueId;

    if (!leagueId) {
        console.error('[API Route Market] Keine leagueId gefunden!', params);
        return NextResponse.json({ message: 'Liga-ID fehlt in der Anfrage' }, { status: 400 });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Authorization header fehlt' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    // console.log(`[API Route Market] Anfrage für Liga ${leagueId}`);

    // Rufe Kickbase Market API auf
    const marketResult = await safeApiRequest(
      `https://api.kickbase.com/v4/leagues/${leagueId}/market`,
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

    if (marketResult.error || !marketResult.data) {
      return NextResponse.json(
        { message: `Fehler beim Abrufen des Transfermarkts: ${marketResult.error || 'Keine Daten erhalten'}` },
        { status: marketResult.status || 500 }
      );
    }

    // console.log('[API Route Market] RAW RESPONSE von Kickbase:', JSON.stringify(marketResult.data, null, 2));

    // Extrahiere Spieler aus dem 'it'-Array und transformiere sie
    const rawPlayers = marketResult.data.it || [];
    const transformedMarketPlayers: MarketPlayer[] = rawPlayers.map((player: any) => {
        // Nutze den bestehenden Normalizer für Basisdaten
        const basePlayer = normalizePlayer(player);

        // Füge marktspezifische Daten hinzu
        return {
            ...basePlayer,
            price: player.prc || 0, // Preis
            expiryDate: player.dt || '', // Ablaufdatum (behalten wir, falls doch benötigt)
            exs: player.exs || 0, // Verbleibende Sekunden bis Ablauf
            mvt: player.mvt, // Market Value Trend (kann 0, 1, 2 oder undefined sein)
            ap: player.ap, // Average Points (kann number oder undefined sein)
            seller: player.u ? { // Verkäufer-Info, falls vorhanden
                id: player.u.i,
                name: player.u.n,
                profileImage: player.u.uim // Bild des Verkäufers
            } : null, // null wenn von Kickbase angeboten
        };
    });

    // console.log(`[API Route Market] ${transformedMarketPlayers.length} Spieler transformiert.`);

    // Sende die transformierte Liste zurück
    // Struktur: { marketPlayers: [...] }
    return NextResponse.json({ marketPlayers: transformedMarketPlayers });

  } catch (error: any) {
    let resolvedLeagueId = 'unbekannt';
    try { resolvedLeagueId = (await context.params)?.leagueId || 'nicht im Promise'; } catch {}
    console.error(`[API Route Market] Unerwarteter Fehler für Liga ${resolvedLeagueId}:`, error);
    return NextResponse.json(
      { message: error.message || 'Ein interner Serverfehler ist aufgetreten' },
      { status: 500 }
    );
  }
}
