// src/app/matches/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getTeamData } from '@/utils/player.utils'; // Assuming this utility fetches team details by ID
import { format } from 'date-fns'; // For formatting dates

// Define the structure of a match object based on your JSON
interface Match {
    match_id: number;
    season: string;
    matchday: number;
    match_date: string; // Keep as string initially, format later
    home_club_id: number;
    home_score: number | null;
    away_club_id: number;
    away_score: number | null;
    home_probabilities: string | null; // Changed to string
    away_probabilities: string | null; // Changed to string
    draw_probabilities: string | null; // Changed to string
}

// Define team data structure from getTeamData
interface TeamData {
    name: string;
    logo: string | null;
    // Add other properties if needed
}

export default function MatchesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const leagueId = searchParams.get('league'); // Get leagueId if needed for back navigation etc.

    const [matches, setMatches] = useState<Match[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMatchday, setSelectedMatchday] = useState<number>(30); // Default to matchday 30
    const [selectedSeason, setSelectedSeason] = useState<string>('24/25'); // Default to season 24/25

    // Fetch matches based on selectedSeason and selectedMatchday
    useEffect(() => {
        const fetchMatches = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Construct the URL with query parameters
                const apiUrl = `/api/matches?season=${encodeURIComponent(selectedSeason)}&matchday=${selectedMatchday}`;
                console.log("Fetching matches from:", apiUrl);

                const response = await fetch(apiUrl);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                const data: Match[] = await response.json();
                setMatches(data);
                console.log(`Fetched ${data.length} matches for MD ${selectedMatchday}`);

            } catch (e: any) {
                console.error("Failed to fetch matches:", e);
                setError(e.message || 'Failed to load matches.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchMatches();
    }, [selectedSeason, selectedMatchday]); // Refetch when season or matchday changes

    const handleBack = () => {
        // Navigate back to the dashboard, potentially passing the leagueId
        router.push(leagueId ? `/dashboard?league=${leagueId}` : '/leagues');
    };

    // Function to get team details (name, logo) - uses your existing utility
    const getTeamDisplayData = (teamId: number): TeamData => {
        const data = getTeamData(teamId.toString()); // Use your utility
        return {
            name: data.name || `Team ${teamId}`,
            logo: data.logo ? `https://kickbase.b-cdn.net/${data.logo}` : null
        };
    };

    // TODO: Add handlers for changing matchday/season later if needed


    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                        Spieltag {selectedMatchday} ({selectedSeason})
                    </h1>
                    <button onClick={handleBack} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                        Zurück
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    {isLoading ? (
                        <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                            <p className="text-gray-600 dark:text-gray-300">Lade Spiele...</p>
                            {/* Optional: Add a spinner */}
                        </div>
                    ) : error ? (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative shadow dark:bg-red-900/30 dark:border-red-600 dark:text-red-300" role="alert">
                            <strong className="font-bold">Fehler!</strong>
                            <span className="block sm:inline"> {error}</span>
                        </div>
                    ) : matches.length === 0 ? (
                         <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                            <p className="text-gray-600 dark:text-gray-300">Keine Spiele für diesen Spieltag gefunden.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {matches.map((match) => {
                                const homeTeam = getTeamDisplayData(match.home_club_id);
                                const awayTeam = getTeamDisplayData(match.away_club_id);
                                const matchDate = new Date(match.match_date);

                                return (
                                    <div key={match.match_id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col items-center">
                                        {/* Date and Time */}
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                             {format(matchDate, 'EEEE, dd.MM.yyyy HH:mm')} Uhr
                                        </div>

                                        {/* Teams and Score */}
                                        <div className="flex items-center justify-around w-full mb-2">
                                            {/* Home Team */}
                                            <div className="flex flex-col items-center text-center w-1/3">
                                                {homeTeam.logo && <img src={homeTeam.logo} alt={homeTeam.name} className="h-12 w-12 object-contain mb-1"/>}
                                                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{homeTeam.name}</span>
                                            </div>

                                            {/* Score */}
                                            <div className="text-center px-4">
                                                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                                    {match.home_score ?? '-'} : {match.away_score ?? '-'}
                                                </span>
                                            </div>

                                            {/* Away Team */}
                                            <div className="flex flex-col items-center text-center w-1/3">
                                                 {awayTeam.logo && <img src={awayTeam.logo} alt={awayTeam.name} className="h-12 w-12 object-contain mb-1"/>}
                                                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{awayTeam.name}</span>
                                            </div>
                                        </div>

                                        {/* Probabilities */}
                                        {(match.home_probabilities || match.draw_probabilities || match.away_probabilities) && (
                                          <div className="flex justify-center space-x-4 text-xs text-gray-600 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700 pt-2 w-full">
                                            <span>1: {match.home_probabilities ? parseFloat(match.home_probabilities).toFixed(2) : '-'}</span>
                                            <span>X: {match.draw_probabilities ? parseFloat(match.draw_probabilities).toFixed(2) : '-'}</span>
                                            <span>2: {match.away_probabilities ? parseFloat(match.away_probabilities).toFixed(2) : '-'}</span>
                                          </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}