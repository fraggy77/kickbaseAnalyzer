'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatCurrency } from '@/lib/kickbase-api'; // Assuming formatCurrency is exported there
import { getPositionName, getStatusName, getTeamData } from '@/utils/player.utils';

const CDN_BASE_URL = 'https://kickbase.b-cdn.net/';

// Value history interface
interface ValueHistory {
    player_id: string;
    date: string;
    value: number;
}

// Helper to decode or return default
const getQueryParam = (params: URLSearchParams | null, key: string, defaultValue: string = '-') => {
    return params?.get(key) ? decodeURIComponent(params.get(key)!) : defaultValue;
};

function PlayerInfoContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Extract player data from URL parameters
    const playerId = getQueryParam(searchParams, 'id');
    const firstName = getQueryParam(searchParams, 'firstName');
    const lastName = getQueryParam(searchParams, 'lastName', 'Spieler');
    const teamId = getQueryParam(searchParams, 'teamId');
    const leagueId = getQueryParam(searchParams, 'leagueId', '');
    const position = parseInt(getQueryParam(searchParams, 'position', '0'));
    const status = parseInt(getQueryParam(searchParams, 'status', '0'));
    const marketValue = parseInt(getQueryParam(searchParams, 'marketValue', '0'));
    const points = getQueryParam(searchParams, 'points');
    const avgPoints = getQueryParam(searchParams, 'avgPoints');
    const playerImage = getQueryParam(searchParams, 'playerImage'); // Can be pim or profileImage etc.
    const mvt = parseInt(getQueryParam(searchParams, 'mvt', '-1')); // Market Value Trend

    const [leagueImage, setLeagueImage] = useState<string | null>(null);
    const [valueHistory, setValueHistory] = useState<ValueHistory[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Get league image from localStorage
    useEffect(() => {
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
    }, [leagueId]);

    // Fetch player value history
    useEffect(() => {
        const fetchValueHistory = async () => {
            if (!playerId || playerId === '-') return;
            
            setIsLoading(true);
            setError(null);
            try {
                // Construct the URL with query parameter
                const apiUrl = `/api/player-values?playerId=${encodeURIComponent(playerId)}`;
                console.log("Fetching player values from:", apiUrl);

                const response = await fetch(apiUrl);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                const data: ValueHistory[] = await response.json();
                setValueHistory(data);
                console.log(`Fetched ${data.length} value entries for player ${playerId}`);

            } catch (e) {
                console.error("Failed to fetch player values:", e);
                setError(e instanceof Error ? e.message : 'Failed to load player values.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchValueHistory();
    }, [playerId]);

    const teamData = getTeamData(teamId ?? '');

    // Construct full image URL
    const imageUrl = playerImage && playerImage !== '-' 
                     ? (playerImage.startsWith('http') || playerImage.startsWith('/') ? playerImage : `${CDN_BASE_URL}${playerImage}`) 
                     : '/placeholder.png';

    // Determine trend icon and color (copied from market page logic)
    let trendIcon = '→';
    let trendColor = 'text-gray-500 dark:text-gray-400';
    if (mvt === 1) { // Up
        trendIcon = '↑';
        trendColor = 'text-green-600 dark:text-green-400';
    } else if (mvt === 2) { // Down
        trendIcon = '↓';
        trendColor = 'text-red-600 dark:text-red-400';
    }

    const handleBack = () => router.back();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800">
            <header className="bg-white dark:bg-gray-850 shadow">
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
                            {firstName !== '-' ? `${firstName} ${lastName}` : lastName}
                        </h1>
                    </div>
                    <button onClick={handleBack} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                        Zurück
                    </button>
                </div>
            </header>
            <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="p-6 flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
                        <img 
                            src={imageUrl}
                            alt={`${lastName}`}
                            className="h-32 w-32 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700 shadow-md"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.png'; }}
                        />
                        <div className="flex-grow text-center md:text-left">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                                {firstName !== '-' ? `${firstName} ${lastName}` : lastName}
                            </h2>
                            <div className="flex items-center justify-center md:justify-start space-x-2 mb-2">
                                {teamData.logo && <img src={`${CDN_BASE_URL}${teamData.logo}`} alt={teamData.name} className="h-6 w-6 object-contain"/>}
                                <span className="text-md text-gray-600 dark:text-gray-400">{teamData.name}</span>
                            </div>
                            <span className={`px-2.5 py-0.5 inline-flex text-sm leading-5 font-semibold rounded-full ${status === 1 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : status === 0 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                                {getStatusName(status)}
                             </span>
                        </div>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-5 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-6">
                        <div>
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Position</dt>
                            <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{getPositionName(position)}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Marktwert</dt>
                            <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                                {formatCurrency(marketValue)}
                                {mvt !== -1 && (
                                    <span className={`ml-2 text-xl font-bold ${trendColor}`}>{trendIcon}</span>
                                )}
                            </dd>
                        </div>
                         <div>
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Punkte</dt>
                            <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{points}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Ø Punkte</dt>
                            <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{avgPoints}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Spieler-ID</dt>
                            <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{playerId}</dd>
                        </div>
                         {/* Add more fields here later as needed */}
                    </div>
                </div>
                
                {/* Value History Section */}
                <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Wertentwicklung</h3>
                    </div>
                    
                    <div className="px-6 py-4">
                        {isLoading ? (
                            <p className="text-gray-600 dark:text-gray-400 text-center py-4">Lade Wertdaten...</p>
                        ) : error ? (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative dark:bg-red-900/30 dark:border-red-600 dark:text-red-300">
                                <strong className="font-bold">Fehler!</strong>
                                <span className="block sm:inline"> {error}</span>
                            </div>
                        ) : valueHistory.length === 0 ? (
                            <p className="text-gray-600 dark:text-gray-400 text-center py-4">Keine Wertdaten verfügbar.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Datum</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Wert</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {valueHistory.map((entry, index) => (
                                            <tr key={index}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {new Date(entry.date).toLocaleDateString('de-DE')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                    {formatCurrency(entry.value)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

// Wrap with Suspense for useSearchParams
export default function PlayerPage() {
    return (
        <Suspense fallback={<div className="p-6 text-center">Spielerdetails werden geladen...</div>}>
            <PlayerInfoContent />
        </Suspense>
    );
} 