'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { kickbaseAPI } from '@/lib/kickbase-api';
import { formatCurrency } from '@/utils/formatting.utils';
import { getPositionName, getStatusName, getTeamData } from '@/utils/player.utils'; // Importiere Utils
import type { Player } from '@/types/player.types'; // Basis-Player Typ

// Importiere oder definiere den erweiterten MarketPlayer Typ
interface MarketPlayer extends Player {
    price: number;
    expiryDate: string; // Keep for potential future use or debugging
    exs: number; // Remaining seconds until expiry
    mvt?: number; // Market value trend
    ap?: number; // Average points
    seller?: { id: string; name: string; profileImage?: string; } | null;
}

// Hilfsfunktion zur Formatierung der verbleibenden Sekunden
const formatRemainingSeconds = (seconds: number) => {
    if (seconds === undefined || seconds === null || seconds < 0) return 'N/A';
    if (seconds === 0) return 'Abgelaufen';

    try {
        const totalMinutes = Math.floor(seconds / 60);
        const remainingHours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;

        if (remainingHours > 0) {
            return `${remainingHours}h ${remainingMinutes}m`;
        }
        if (remainingMinutes > 0) {
            return `${remainingMinutes}m`;
        }
        return 'weniger als 1m';
    } catch (e) {
        console.error("Fehler bei Sekundenformatierung:", e);
        return 'Fehler';
    }
};


export default function MarketPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leagueId = searchParams.get('league');

  const [marketPlayers, setMarketPlayers] = useState<MarketPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem('kickbaseUser');
      if (!storedUser) {
        // Redirect, aber gib trotzdem false zurück, um anzuzeigen, dass nicht geladen werden soll
        router.push('/');
        return false;
      }
      try {
        const { token, id, email } = JSON.parse(storedUser);
        kickbaseAPI.token = token;
        kickbaseAPI.userId = id;
        kickbaseAPI.email = email;
        return true;
      } catch (error) {
        console.error('Fehler beim Parsen der Benutzerdaten:', error);
        localStorage.removeItem('kickbaseUser');
        router.push('/');
        return false;
      }
    };

    const loadMarketData = async () => {
      // Setze Loading erst hier, kurz bevor der eigentliche Ladevorgang beginnt
      setIsLoading(true);
      setError('');
      try {
        const data = await kickbaseAPI.getMarket(leagueId as string); // leagueId ist hier sicher vorhanden
        console.log("Transfermarkt-Daten geladen:", data);

        // Sortiere die Spieler nach verbleibenden Sekunden (exs), aufsteigend
        const fetchedPlayers = data.marketPlayers || [];
        const sortedPlayers = fetchedPlayers.sort((a, b) => a.exs - b.exs);

        setMarketPlayers(sortedPlayers);
      } catch (err: any) {
        console.error("Fehler beim Laden des Transfermarkts:", err);
        setError(err.message || 'Fehler beim Laden des Transfermarkts.');
        // Bei Auth-Fehler eventuell redirecten
        if (err.message?.includes('401')) {
            localStorage.removeItem('kickbaseUser');
            router.push('/');
        }
      } finally {
        // Dieser Block wird IMMER ausgeführt, wenn loadMarketData aufgerufen wurde
        setIsLoading(false);
        console.log("isLoading auf false gesetzt in finally.");
      }
    };

    // --- Verbesserte Startlogik ---
    // 1. Prüfe League ID zuerst
    if (!leagueId) {
      setError("Keine Liga-ID in der URL gefunden.");
      setIsLoading(false); // Setze Loading hier auf false
      // Optional: Redirect zu /leagues
      // router.push('/leagues');
      return; // Beende den Effekt hier
    }

    // 2. Prüfe Authentifizierung
    if (checkAuth()) {
      // Nur wenn ID vorhanden UND Auth ok, lade die Daten
      loadMarketData();
    } else {
      // Wenn checkAuth fehlschlägt (z.B. Redirect ausgelöst),
      // setze isLoading trotzdem auf false, falls die Komponente noch kurz existiert
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]); // Abhängigkeit bleibt leagueId

  const handleBack = () => { router.push(`/dashboard?league=${leagueId}`); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-100 dark:from-gray-900 dark:to-blue-950">
      <header className="bg-white dark:bg-gray-800 shadow">
         <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Transfermarkt</h1>
            <button onClick={handleBack} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                Zurück
            </button>
         </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
            {isLoading ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex justify-center">
                <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Transfermarkt wird geladen...</span>
              </div>
             )
             : error ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-md">
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                  </div>
                </div>
               )
             : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Spieler</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Team</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pos</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Marktwert</th>
                                    <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Trend</th>
                                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Punkte</th>
                                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ø Pkt</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ablauf</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Verkäufer</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {marketPlayers.length > 0 ? (
                                    marketPlayers.map((player) => {
                                        const teamData = getTeamData(player.teamId ?? '');
                                        const playerImageUrl = player.pim
                                                               ? `https://kickbase.b-cdn.net/${player.pim}`
                                                               : '/placeholder.png';

                                        // Determine trend icon and color
                                        let trendIcon = '→';
                                        let trendColor = 'text-gray-500 dark:text-gray-400';
                                        if (player.mvt === 1) { // Up
                                            trendIcon = '↑';
                                            trendColor = 'text-green-600 dark:text-green-400';
                                        } else if (player.mvt === 2) { // Down
                                            trendIcon = '↓';
                                            trendColor = 'text-red-600 dark:text-red-400';
                                        }

                                        return (
                                            <tr key={player.id}>
                                                {/* Spieler */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                         <div className="flex-shrink-0 h-10 w-10 mr-3">
                                                             <img
                                                               className="h-10 w-10 rounded-full object-cover"
                                                               src={playerImageUrl}
                                                               alt={player.lastName}
                                                               onError={(e) => { e.currentTarget.src = '/placeholder.png'; }}
                                                              />
                                                         </div>
                                                         <div>
                                                             <div className="text-sm font-medium text-gray-900 dark:text-white">{player.firstName} {player.lastName}</div>
                                                         </div>
                                                     </div>
                                                </td>
                                                {/* Team */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center space-x-2">
                                                         {teamData.logo && <img src={`https://kickbase.b-cdn.net/${teamData.logo}`} alt={teamData.name} className="h-12 w-12 object-contain flex-shrink-0"/>}
                                                         <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{teamData.name}</span>
                                                    </div>
                                                </td>
                                                {/* Position */}
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{getPositionName(player.position ?? 0)}</td>
                                                {/* Marktwert */}
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">{formatCurrency(player.marketValue)}</td>
                                                {/* Trend */}
                                                <td className={`px-2 py-4 whitespace-nowrap text-center text-lg font-bold ${trendColor}`}>{trendIcon}</td>
                                                {/* Punkte */}
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">{player.points ?? '-'}</td>
                                                {/* Ø Punkte */}
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">{player.ap ?? '-'}</td>
                                                {/* Ablauf */}
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatRemainingSeconds(player.exs)}</td>
                                                {/* Verkäufer */}
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {player.seller ? (
                                                        <div className="flex items-center space-x-2">
                                                            {player.seller.profileImage && <img src={player.seller.profileImage.startsWith('http') ? player.seller.profileImage : `https://kickbase.b-cdn.net/${player.seller.profileImage}`} alt={player.seller.name} className="h-5 w-5 rounded-full"/>}
                                                            <span>{player.seller.name}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="italic">Kickbase</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr><td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">Transfermarkt ist leer.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
             )}
        </div>
      </main>
    </div>
  );
}
