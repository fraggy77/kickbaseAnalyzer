// src/app/api/matches/route.ts
import { NextResponse, NextRequest } from 'next/server'; // Import NextRequest
import pool from '@/lib/db'; // Import the connection pool

// Define an interface for the expected query parameters
// interface QueryParams { // Removing interface as it's not strictly needed for this simple case
//   season?: string;
//   matchday?: string;
// }

export async function GET(request: NextRequest) { // Add request parameter
  let client; // Declare client outside try block
  try {
    // Get query parameters from the request URL
    const searchParams = request.nextUrl.searchParams;
    const season = searchParams.get('season');
    const matchday = searchParams.get('matchday');

    // Start building the query and parameters array
    let sqlQuery = `
      SELECT
        match_id,
        season,
        matchday,
        match_date,
        home_club_id,
        home_score,
        away_club_id,
        away_score,
        home_probabilities,
        away_probabilities,
        draw_probabilities
      FROM public.matches_table
    `;
    const queryParams: (string | number)[] = [];
    const conditions: string[] = [];

    let paramIndex = 1;

    // Add conditions based on provided query parameters
    if (season) {
      conditions.push(`season = $${paramIndex++}`);
      queryParams.push(season);
    }
    if (matchday) {
      // Ensure matchday is treated as a number if it's provided
      const matchdayNum = parseInt(matchday, 10);
      if (!isNaN(matchdayNum)) {
          conditions.push(`matchday = $${paramIndex++}`);
          queryParams.push(matchdayNum);
      } else {
          console.warn(`Invalid matchday parameter received: ${matchday}. Ignoring.`);
          // Optionally return an error if matchday is required but invalid
          // return NextResponse.json({ error: 'Invalid matchday parameter' }, { status: 400 });
      }
    }

    // Append WHERE clause if there are conditions
    if (conditions.length > 0) {
      sqlQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add ordering
    sqlQuery += ` ORDER BY match_date ASC, match_id ASC;`; // Order oldest first for a specific matchday

    client = await pool.connect();
    console.log(`API route /api/matches executing query: ${sqlQuery} with params:`, queryParams);

    const result = await client.query(sqlQuery, queryParams); // Use parameterized query

    console.log(`Fetched ${result.rowCount} matches from DB`);

    // Simply return the raw rows for now as requested
    return NextResponse.json(result.rows);

  } catch (error) {
    console.error('API route /api/matches - Failed to fetch matches:', error);
    // Return a generic error response
    return NextResponse.json({ error: 'Failed to fetch match data' }, { status: 500 });
  } finally {
    // IMPORTANT: Always release the client back to the pool
    if (client) {
      console.log('API route /api/matches releasing DB client');
      client.release();
    }
  }
}