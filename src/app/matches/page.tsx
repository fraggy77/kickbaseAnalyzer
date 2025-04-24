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
    const leagueId = searchParams.get('league');

    const [matches, setMatches] = useState<Match[]>([]);
    const [isLoadingMatches, setIsLoadingMatches] = useState<boolean>(true);
    const [isLoadingMatchday, setIsLoadingMatchday] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMatchday, setSelectedMatchday] = useState<number | null>(null);
    const [selectedSeason, setSelectedSeason] = useState<string>('24/25');
    const [leagueImage, setLeagueImage] = useState<string | null>(null); // State for league image

    useEffect(() => {
        // Get league image from localStorage
        if (leagueId) {
            const storedLeague = localStorage.getItem('selectedLeague');
            if (storedLeague) {
                try {
                    const selectedLeague = JSON.parse(storedLeague);
                    if (selectedLeague.id === leagueId) {
                        setLeagueImage(selectedLeague.image);
                    }
                } catch (e) {
                    console.error("Error parsing selectedLeague for header:", e);
                }
            }
        }

        const fetchCurrentMatchday = async () => {
            console.log("Fetching current matchday...");
            setIsLoadingMatchday(true);
            setError(null);
            try {
                const response = await fetch('/api/current-matchday');
                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Failed to fetch current matchday');
                }
                const data = await response.json();
                console.log("Current matchday received:", data.currentMatchday);
                setSelectedMatchday(data.currentMatchday);
            } catch (e: any) {
                console.error("Error fetching current matchday:", e);
                setError(e.message);
                setSelectedMatchday(1);
            } finally {
                setIsLoadingMatchday(false);
            }
        };

        fetchCurrentMatchday();
    }, [leagueId]);

    useEffect(() => {
        if (selectedMatchday === null) {
            console.log("Waiting for selectedMatchday...");
            return;
        }

        const fetchMatches = async () => {
            console.log(`Fetching matches for MD: ${selectedMatchday}`);
            setIsLoadingMatches(true);
            setError(null);
            try {
                const apiUrl = `/api/matches?season=${encodeURIComponent(selectedSeason)}&matchday=${selectedMatchday}`;
                const response = await fetch(apiUrl);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                const data: Match[] = await response.json();
                setMatches(data);
            } catch (e: any) {
                console.error("Failed to fetch matches:", e);
                setError(e.message || 'Failed to load matches.');
            } finally {
                setIsLoadingMatches(false);
            }
        };

        fetchMatches();
    }, [selectedSeason, selectedMatchday]);

    const handleBack = () => {
        router.push(leagueId ? `/dashboard?league=${leagueId}` : '/leagues');
    };

    const getTeamDisplayData = (teamId: number): TeamData => {
        const data = getTeamData(teamId.toString());
        return {
            name: data.name || `Team ${teamId}`,
            logo: data.logo ? `https://kickbase.b-cdn.net/${data.logo}` : null
        };
    };

    const matchdays = Array.from({ length: 34 }, (_, i) => i + 1);

    const isLoading = isLoadingMatchday || (selectedMatchday !== null && isLoadingMatches);

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        {leagueId && leagueImage && (
                            <button onClick={() => router.push(`/dashboard?league=${leagueId}`)} title="Zum Liga-Dashboard">
                                <img 
                                    src={leagueImage} 
                                    alt="Liga Logo" 
                                    className="h-10 w-10 rounded-md object-cover hover:opacity-80 transition-opacity"
                                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                />
                            </button>
                        )}
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                            Spieltag {selectedMatchday ?? '...'} ({selectedSeason})
                        </h1>
                    </div>
                    <button onClick={handleBack} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                        Zurück
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="mb-6 px-4 sm:px-0">
                    <div className={`flex flex-wrap justify-center gap-1 ${isLoadingMatchday ? 'opacity-50 pointer-events-none' : ''}`}>
                        {matchdays.map((md) => (
                            <button
                                key={md}
                                onClick={() => setSelectedMatchday(md)}
                                disabled={isLoadingMatchday}
                                className={`px-3 py-1 border text-xs font-medium rounded-md transition-colors duration-150 
                                    ${selectedMatchday === md 
                                        ? 'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500' 
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600'}
                                `}
                            >
                                {md}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="px-4 py-6 sm:px-0">
                    {isLoading ? (
                        <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                            <p className="text-gray-600 dark:text-gray-300">Lade Daten...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative shadow dark:bg-red-900/30 dark:border-red-600 dark:text-red-300" role="alert">
                            <strong className="font-bold">Fehler!</strong>
                            <span className="block sm:inline"> {error}</span>
                        </div>
                    ) : matches.length === 0 && !isLoadingMatches ? (
                         <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                            <p className="text-gray-600 dark:text-gray-300">Keine Spiele für Spieltag {selectedMatchday} gefunden.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {matches.map((match) => {
                                const homeTeam = getTeamDisplayData(match.home_club_id);
                                const awayTeam = getTeamDisplayData(match.away_club_id);
                                const matchDate = new Date(match.match_date);

                                // Calculate implied probabilities - START
                                let probHome: number | null = null;
                                let probDraw: number | null = null;
                                let probAway: number | null = null;

                                if (match.home_probabilities && match.draw_probabilities && match.away_probabilities) {
                                    try {
                                        const oddHome = parseFloat(match.home_probabilities);
                                        const oddDraw = parseFloat(match.draw_probabilities);
                                        const oddAway = parseFloat(match.away_probabilities);

                                        if (!isNaN(oddHome) && !isNaN(oddDraw) && !isNaN(oddAway) && oddHome > 0 && oddDraw > 0 && oddAway > 0) {
                                            const sumInvOdds = (1 / oddHome) + (1 / oddDraw) + (1 / oddAway);
                                            if (sumInvOdds > 0) {
                                                probHome = (1 / oddHome) / sumInvOdds;
                                                probDraw = (1 / oddDraw) / sumInvOdds;
                                                probAway = (1 / oddAway) / sumInvOdds;
                                            }
                                        }
                                    } catch (e) {
                                        console.error("Error calculating probabilities for match:", match.match_id, e);
                                    }
                                }
                                // Calculate implied probabilities - END

                                return (
                                    <div key={match.match_id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col items-center">
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                             {format(matchDate, 'EEEE, dd.MM.yyyy')}
                                        </div>

                                        <div className="flex items-start justify-around w-full mb-2">
                                            <button 
                                                onClick={() => router.push(`/team-profile?teamId=${match.home_club_id}`)}
                                                className="flex flex-col items-center text-center w-1/3 group hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded-lg transition-colors"
                                                title={`${homeTeam.name} Team Profil`}
                                                disabled={!match.home_club_id}
                                            >
                                                {homeTeam.logo && <img src={homeTeam.logo} alt={homeTeam.name} className="h-12 w-12 object-contain mb-1"/>}
                                                <span className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{homeTeam.name}</span>
                                                {probHome !== null && (
                                                    <span className="text-xs font-semibold text-green-600 dark:text-green-400 mt-1">
                                                        ({(probHome * 100).toFixed(1)}%)
                                                    </span>
                                                )}
                                            </button>

                                            <div className="text-center px-4 mt-6">
                                                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                                    {match.home_score ?? '-'} : {match.away_score ?? '-'}
                                                </span>
                                                {probDraw !== null && (
                                                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">
                                                        ({(probDraw * 100).toFixed(1)}%)
                                                    </div>
                                                )}
                                                {(match.home_probabilities || match.draw_probabilities || match.away_probabilities) && (
                                                    <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 whitespace-nowrap">
                                                         {match.home_probabilities ?? '-'} / {match.draw_probabilities ?? '-'} / {match.away_probabilities ?? '-'}
                                                    </div>
                                                )}
                                            </div>

                                            <button 
                                                onClick={() => router.push(`/team-profile?teamId=${match.away_club_id}`)}
                                                className="flex flex-col items-center text-center w-1/3 group hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded-lg transition-colors"
                                                title={`${awayTeam.name} Team Profil`}
                                                disabled={!match.away_club_id}
                                            >
                                                {awayTeam.logo && <img src={awayTeam.logo} alt={awayTeam.name} className="h-12 w-12 object-contain mb-1"/>}
                                                <span className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{awayTeam.name}</span>
                                                {probAway !== null && (
                                                    <span className="text-xs font-semibold text-red-600 dark:text-red-400 mt-1">
                                                        ({(probAway * 100).toFixed(1)}%)
                                                    </span>
                                                )}
                                            </button>
                                        </div>
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