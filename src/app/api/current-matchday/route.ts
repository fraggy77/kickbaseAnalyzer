import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
    let client;
    const defaultMatchday = 1;
    const lastPossibleMatchday = 34; // Assuming Bundesliga

    try {
        client = await pool.connect();
        console.log('API route /api/current-matchday connecting to DB (score-based logic - v2)');

        // Query to find the latest season and the max matchday with a *real* score (>0) in that season
        const query = `
            WITH LatestSeason AS (
                SELECT MAX(season) as season
                FROM public.matches_table
            )
            SELECT MAX(m.matchday) as last_scored_matchday
            FROM public.matches_table m
            JOIN LatestSeason ls ON m.season = ls.season
            -- Check if at least one score is greater than 0
            WHERE m.home_score > 0 OR m.away_score > 0;
        `;

        const result = await client.query(query);
        const lastScoredMatchday = result.rows[0]?.last_scored_matchday; // Can be null

        let currentMatchday: number;

        if (lastScoredMatchday === null) {
            // No scores > 0 found at all for the latest season
            console.log(`API route /api/current-matchday: No scores > 0 found. Defaulting to Matchday ${defaultMatchday}.`);
            currentMatchday = defaultMatchday;
        } else if (lastScoredMatchday >= lastPossibleMatchday) {
            // Last possible matchday already has scores > 0
            console.log(`API route /api/current-matchday: Last matchday (${lastScoredMatchday}) has scores > 0. Setting current to ${lastPossibleMatchday}.`);
            currentMatchday = lastPossibleMatchday;
        } else {
            // The current matchday is the one after the last one with scores > 0
            currentMatchday = lastScoredMatchday + 1;
            console.log(`API route /api/current-matchday: Last scored > 0 is ${lastScoredMatchday}. Setting current to ${currentMatchday}.`);
        }

        return NextResponse.json({ currentMatchday });

    } catch (error) {
        console.error('API route /api/current-matchday - Failed to fetch current matchday (score-based):', error);
        // Return default on error to prevent breaking the matches page
        return NextResponse.json({ error: 'Failed to determine current matchday', currentMatchday: defaultMatchday }, { status: 500 });
    } finally {
        if (client) {
            console.log('API route /api/current-matchday releasing DB client');
            client.release();
        }
    }
} 