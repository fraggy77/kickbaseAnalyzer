'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { kickbaseAPI } from '@/lib/kickbase-api';
import { formatCurrency } from '@/utils/formatting.utils';
import { getPositionName, getStatusName, getTeamData, normalizePlayer } from '@/utils/player.utils';
import { Player } from '@/types/player.types';

// Interface für die Manager-Info (optional, aber gut für Typsicherheit)
interface ManagerInfo {
  name: string;
  teamValue: number;
  managerImage?: string;
  // Keine Budget-, Rang-, Punkte-Felder hier
}

export default function ManagerSquadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leagueId = searchParams.get('league');
  const userId = searchParams.get('user');
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [managerInfo, setManagerInfo] = useState<ManagerInfo | null>(null);
  const [startingPlayerIds, setStartingPlayerIds] = useState<string[]>([]);
  const [s11TeamValue, setS11TeamValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [leagueImage, setLeagueImage] = useState<string | null>(null); // State for league image

  useEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem('kickbaseUser');
      if (!storedUser) {
        router.push('/');
        return false;
      }
      
      try {
        const { token, id, email } = JSON.parse(storedUser);
        
        // Token in der API setzen
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

    if (!leagueId || !userId) {
      console.error('Fehlende League ID oder User ID in URL');
      router.push('/leagues');
      return;
    }

    // Get league image from localStorage
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

    if (checkAuth()) {
      loadManagerData();
    }
  }, [leagueId, userId, router]);

  const loadManagerData = async () => {
    if (!leagueId || !userId) return;

    try {
      setIsLoading(true);
      setError('');

      const [squadResponse, teamcenterResponse] = await Promise.all([
        kickbaseAPI.getManagerSquad(leagueId, userId),
        kickbaseAPI.getManagerTeamcenter(leagueId, userId)
      ]);

      console.log('Manager-Squad Daten geladen:', squadResponse);
      console.log('Manager-Teamcenter Daten geladen:', teamcenterResponse);

      const playersData = squadResponse?.pl;
      if (playersData && Array.isArray(playersData)) {
        console.log(`${playersData.length} Spieler geladen`);
        if (playersData.length > 0) {
          console.log('Beispiel-Spieler:', playersData[0]);
        }
        setPlayers(playersData);

        const calculatedTeamValue = playersData.reduce((sum, player) => {
          const playerValue = player.marketValue || player.mv || 0;
          return sum + playerValue;
        }, 0);
        console.log('Berechneter Teamwert des Managers:', calculatedTeamValue);

        setManagerInfo({
          name: squadResponse?.managerName || 'Unbekannter Manager',
          teamValue: calculatedTeamValue,
          managerImage: squadResponse?.managerImage || '',
        });

        if (teamcenterResponse && Array.isArray(teamcenterResponse.startingPlayerIds)) {
          setStartingPlayerIds(teamcenterResponse.startingPlayerIds);
          console.log(`[ManagerSquadPage] Startelf-IDs für ${userId} gesetzt:`, teamcenterResponse.startingPlayerIds);
        } else {
          console.warn(`[ManagerSquadPage] Keine Startelf-IDs für ${userId} von API erhalten.`);
          setStartingPlayerIds([]);
        }

      } else {
        console.warn('Keine Spielerdaten (pl) in der Manager-Squad-Antwort gefunden');
        setPlayers([]);
        setManagerInfo({
          name: squadResponse?.managerName || 'Unbekannter Manager',
          teamValue: 0,
          managerImage: squadResponse?.managerImage || '',
        });
        setStartingPlayerIds([]);
      }

    } catch (error: any) {
      console.error('Fehler beim Laden der Manager-Daten:', error);
      setError(`Der Kader konnte nicht geladen werden: ${error.message}`);
      if (error.message.includes('401') || error.message.includes('Unauthoriz')) {
        localStorage.removeItem('kickbaseUser');
        router.push('/');
      }
      setPlayers([]);
      setStartingPlayerIds([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (players.length > 0 && startingPlayerIds.length > 0) {
      const value = players
        .filter(player => startingPlayerIds.includes(player.id || ''))
        .reduce((sum, player) => sum + (player.marketValue || player.mv || 0), 0);
      setS11TeamValue(value);
      console.log("[ManagerSquadPage] S11-Wert berechnet:", value);
    } else if (players.length > 0) {
        setS11TeamValue(0);
    }
  }, [players, startingPlayerIds]);

  const handleBack = () => {
    router.push(`/league-table?league=${leagueId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          {/* Left side: League Logo (clickable) + Page Title */}
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
                  Kader von {managerInfo?.name || '...'}
              </h1>
          </div>
          {/* Right side: Back Button */}
          <button
            onClick={handleBack}
            className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            Zurück zur Tabelle
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {isLoading ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex justify-center">
              <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Kader wird geladen...</span>
            </div>
          ) : error ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {managerInfo && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
                  <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start">
                    {managerInfo.managerImage && (
                      <img
                        src={managerInfo.managerImage.startsWith('http') ? managerInfo.managerImage : `https://kickbase.b-cdn.net/${managerInfo.managerImage}`}
                        alt={`${managerInfo.name} Bild`}
                        className="h-12 w-12 rounded-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                    <div>
                      <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                        {managerInfo.name}
                      </h2>
                      <div className="mt-1 flex items-baseline space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <p>Teamwert: <span className="font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(managerInfo.teamValue)}</span></p>
                        <p>S11-Wert: <span className="font-semibold text-yellow-600 dark:text-yellow-400">{formatCurrency(s11TeamValue)}</span></p>
                      </div>
                    </div>
                    <div>
                      <button
                        onClick={() => router.push(`/manager-performance?league=${leagueId}&user=${userId}`)}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <svg className="-ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0z" />
                          <path d="M12 14a1 1 0 01-.707-.293l-4-4a1 1 0 111.414-1.414L12 11.586l3.293-3.293a1 1 0 011.414 1.414l-4 4A1 1 0 0112 14z" />
                        </svg>
                        Performance
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">Spieler</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {players.length} Spieler im Kader
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-10">S11</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Spieler</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Team</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Position</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Marktwert</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Profit</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Punkte</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {players.length > 0 ? (
                        players.map((player) => {
                          const normalizedPlayer = normalizePlayer(player);
                          const isStarting = startingPlayerIds.includes(normalizedPlayer.id);
                          const teamData = getTeamData(normalizedPlayer.teamId);

                          // Prepare query params for player page
                          const queryParams = new URLSearchParams({
                              id: player.id || '',
                              // firstName not available in this API response
                              lastName: player.lastName || '',
                              teamId: player.teamId || '',
                              leagueId: leagueId || '',
                              position: (player.position ?? 0).toString(),
                              status: (player.status ?? 0).toString(),
                              marketValue: (player.marketValue ?? 0).toString(),
                              points: (player.points ?? '-').toString(),
                              avgPoints: '-', // AvgPoints not available here
                              playerImage: player.pim || '', // Use 'pim' 
                              mvt: '-1', // MVT not available here
                          });

                          return (
                            <tr 
                              key={player.id} 
                            >
                              <td className="px-2 py-4 whitespace-nowrap text-center">
                                {isStarting && (
                                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs font-bold">✓</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <button 
                                  onClick={() => router.push(`/player?${queryParams.toString()}`)}
                                  className="flex items-center group text-left w-full hover:bg-gray-50 dark:hover:bg-gray-700/50 p-1 rounded transition-colors"
                                  title={`${normalizedPlayer.lastName} Details`}
                                >
                                  {normalizedPlayer.pim && (
                                    <div className="flex-shrink-0 h-10 w-10 mr-3">
                                      <img 
                                        className="h-10 w-10 rounded-full object-cover"
                                        src={normalizedPlayer.pim.startsWith('http') ? normalizedPlayer.pim : `https://kickbase.b-cdn.net/${normalizedPlayer.pim}`} 
                                        alt={`${normalizedPlayer.lastName}`} 
                                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/40'; }}
                                      />
                                    </div>
                                  )}
                                  <div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                      {normalizedPlayer.firstName} {normalizedPlayer.lastName}
                                    </div>
                                  </div>
                                 </button>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <button 
                                  onClick={() => router.push(`/team-profile?teamId=${normalizedPlayer.teamId}`)}
                                  className="flex items-center space-x-2 group text-left w-full hover:bg-gray-50 dark:hover:bg-gray-700/50 p-1 rounded transition-colors"
                                  title={`${teamData.name} Team Profil`}
                                  disabled={!normalizedPlayer.teamId}
                                >
                                  {teamData.logo && <img src={`https://kickbase.b-cdn.net/${teamData.logo}`} alt={teamData.name} title={teamData.name} className="h-12 w-12 object-contain flex-shrink-0"/>}
                                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400" title={teamData.name}>
                                    {teamData.name}
                                  </span>
                                 </button>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500 dark:text-gray-400">{getPositionName(normalizedPlayer.position)}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  normalizedPlayer.status === 1 || normalizedPlayer.status === 0
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                    : normalizedPlayer.status === 2 
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                }`}>
                                  {getStatusName(normalizedPlayer.status)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                                {formatCurrency(normalizedPlayer.marketValue)}
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                                normalizedPlayer.mvgl > 0 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : normalizedPlayer.mvgl < 0 
                                  ? 'text-red-600 dark:text-red-400' 
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}>
                                {formatCurrency(normalizedPlayer.mvgl)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                                {normalizedPlayer.points}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr><td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">Keine Spieler gefunden.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}