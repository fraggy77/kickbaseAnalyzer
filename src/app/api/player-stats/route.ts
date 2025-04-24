import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  let client;
  try {
    // Parameter aus der URL extrahieren
    const searchParams = request.nextUrl.searchParams;
    const playerId = searchParams.get('playerId');

    // Überprüfen, ob die Spieler-ID vorhanden ist
    if (!playerId) {
      return NextResponse.json(
        { error: 'Spieler-ID ist erforderlich' },
        { status: 400 }
      );
    }

    // SQL-Query vorbereiten
    const sqlQuery = `
      SELECT 
        season,
        matchday,
        player_id,
        points,
        minutes,
        started,
        red,
        yellow,
        goals,
        assist,
        status,
        liga_note,
        injury_text,
        forecast
      FROM 
        player_ranking
      WHERE 
        player_id = $1
      ORDER BY 
        season DESC, matchday DESC
    `;

    client = await pool.connect();
    console.log(`API-Route /api/player-stats - Query ausführen: ${sqlQuery} mit Spieler-ID:`, playerId);

    const result = await client.query(sqlQuery, [playerId]);

    console.log(`${result.rowCount} Statistikeinträge für Spieler ${playerId} gefunden`);

    // Ergebnisse als JSON zurückgeben
    return NextResponse.json(result.rows);

  } catch (error) {
    console.error('API-Route /api/player-stats - Fehler beim Abrufen der Spielerstatistiken:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Spielerstatistiken' },
      { status: 500 }
    );
  } finally {
    // Wichtig: Client immer an den Pool zurückgeben
    if (client) {
      console.log('API-Route /api/player-stats - DB-Client freigeben');
      client.release();
    }
  }
} 