import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db'; // Importiere den Datenbankpool

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
        player_id,
        date,
        value
      FROM 
        value_table
      WHERE 
        player_id = $1
      ORDER BY 
        date DESC
    `;

    client = await pool.connect();
    console.log(`API-Route /api/player-values - Query ausführen: ${sqlQuery} mit Spieler-ID:`, playerId);

    const result = await client.query(sqlQuery, [playerId]);

    console.log(`${result.rowCount} Werteinträge für Spieler ${playerId} gefunden`);

    // Ergebnisse als JSON zurückgeben
    return NextResponse.json(result.rows);

  } catch (error) {
    console.error('API-Route /api/player-values - Fehler beim Abrufen der Spielerwerte:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Spielerwerte' },
      { status: 500 }
    );
  } finally {
    // Wichtig: Client immer an den Pool zurückgeben
    if (client) {
      console.log('API-Route /api/player-values - DB-Client freigeben');
      client.release();
    }
  }
} 