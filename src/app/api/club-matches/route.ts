import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  let client;
  try {
    // Parameter aus der URL extrahieren
    const searchParams = request.nextUrl.searchParams;
    const clubId = searchParams.get('clubId');

    // Überprüfen, ob die Vereins-ID vorhanden ist
    if (!clubId) {
      return NextResponse.json(
        { error: 'Vereins-ID ist erforderlich' },
        { status: 400 }
      );
    }

    // SQL-Query vorbereiten
    const sqlQuery = `
      SELECT 
        season,
        matchday,
        match_date,
        match_id,
        home_club_id,
        home_score,
        away_club_id,
        away_score,
        home_probabilities,
        away_probabilities,
        draw_probabilities
      FROM 
        matches_table
      WHERE 
        home_club_id = $1 OR away_club_id = $1
      ORDER BY 
        season DESC, matchday ASC
    `;

    client = await pool.connect();
    console.log(`API-Route /api/club-matches - Query ausführen: ${sqlQuery} mit Vereins-ID:`, clubId);

    const result = await client.query(sqlQuery, [clubId]);

    console.log(`${result.rowCount} Spieleinträge für Verein ${clubId} gefunden`);

    // Ergebnisse als JSON zurückgeben
    return NextResponse.json(result.rows);

  } catch (error) {
    console.error('API-Route /api/club-matches - Fehler beim Abrufen der Vereinsspiele:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Vereinsspiele' },
      { status: 500 }
    );
  } finally {
    // Wichtig: Client immer an den Pool zurückgeben
    if (client) {
      console.log('API-Route /api/club-matches - DB-Client freigeben');
      client.release();
    }
  }
} 