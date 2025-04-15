'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { kickbaseAPI } from '@/lib/kickbase-api';
import { formatCurrency } from '@/utils/formatting.utils';
import { getPositionName, getStatusName, getTeamData, normalizePlayer } from '@/utils/player.utils';
import { Player } from '@/types/player.types';

export default function TeamPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leagueId = searchParams.get('league');
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamInfo, setTeamInfo] = useState<any>(null);
  const [startingPlayerIds, setStartingPlayerIds] = useState<string[]>([]);
  const [s11TeamValue, setS11TeamValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem('kickbaseUser');
      if (!storedUser) {
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

    if (!leagueId) {
      router.push('/leagues');
      return;
    }

    if (checkAuth()) {
      loadTeamData();
    }
  }, [leagueId, router]);

  const loadTeamData = async () => {
    try {
      setIsLoading(true);
      setError('');

      const [squadResponse, meResponse, teamcenterResponse] = await Promise.all([
        kickbaseAPI.getSquad(leagueId),
        kickbaseAPI.getLeagueMe(leagueId),
        kickbaseAPI.getManagerTeamcenter(leagueId, kickbaseAPI.userId)
      ]);

      console.log('Squad-Daten geladen:', squadResponse);
      console.log('/me-Daten geladen:', meResponse);
      console.log('Teamcenter-Daten geladen:', teamcenterResponse);

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
        console.log('Berechneter Teamwert:', calculatedTeamValue);

        setTeamInfo({
          budget: meResponse?.b || 0,
          teamValue: calculatedTeamValue,
          name: meResponse?.tn || 'Mein Team',
        });
      } else {
        console.warn('Keine Spielerdaten (pl) in der Squad-Antwort gefunden');
        setPlayers([]);
        setTeamInfo({
          budget: meResponse?.b || 0,
          teamValue: 0,
        });
      }

      if (teamcenterResponse && Array.isArray(teamcenterResponse.startingPlayerIds)) {
        setStartingPlayerIds(teamcenterResponse.startingPlayerIds);
        console.log("Startelf-IDs gesetzt:", teamcenterResponse.startingPlayerIds);
      } else {
        console.warn("Keine Startelf-IDs von API erhalten.");
        setStartingPlayerIds([]);
      }

    } catch (error: any) {
      console.error('Fehler beim Laden der Team-Daten (kombiniert):', error);
      setError(`Die Team-Daten konnten nicht geladen werden: ${error.message}`);
      if (error.message.includes('401') || error.message.includes('Unauthoriz')) {
        localStorage.removeItem('kickbaseUser');
        router.push('/');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (players.length > 0 && startingPlayerIds.length > 0) {
      const value = players
        .filter(player => startingPlayerIds.includes(player.id || player.pid || ''))
        .reduce((sum, player) => sum + (player.marketValue || player.mv || 0), 0);
      setS11TeamValue(value);
      console.log("[TeamPage] S11-Wert berechnet:", value);
    } else if (players.length > 0) {
        setS11TeamValue(0);
    }
  }, [players, startingPlayerIds]);

  const handleBack = () => {
    router.push(`/dashboard?league=${leagueId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{teamInfo?.name || 'Mein Team'}</h1>
          <button
            onClick={handleBack}
            className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            Zurück
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {isLoading ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex justify-center">
              <svg className="animate-spin h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Team-Daten werden geladen...</span>
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
              {teamInfo && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
                  <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                  </div>
                  <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Budget</h3>
                      <p className="mt-1 text-lg font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(teamInfo.budget)}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Teamwert</h3>
                      <p className="mt-1 text-lg font-semibold text-blue-600 dark:text-blue-400">
                        {formatCurrency(teamInfo.teamValue)}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">S11-Wert</h3>
                      <p className="mt-1 text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                        {formatCurrency(s11TeamValue)}
                      </p>
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

                          return (
                            <tr key={normalizedPlayer.id} className={`${isStarting ? 'bg-green-50 dark:bg-green-900/30' : ''}`}>
                              <td className="px-2 py-4 whitespace-nowrap text-center">
                                {isStarting && (
                                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs font-bold">✓</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  {normalizedPlayer.pim && (
                                    <div className="flex-shrink-0 h-10 w-10 mr-3">
                                      <img 
                                        className="h-10 w-10 rounded-full object-cover" 
                                        src={normalizedPlayer.pim.startsWith('http') ? normalizedPlayer.pim : `https://kickbase.b-cdn.net/${normalizedPlayer.pim}`} 
                                        alt={`${normalizedPlayer.lastName}`} 
                                        onError={(e) => {
                                          e.currentTarget.src = 'https://via.placeholder.com/40';
                                        }}
                                      />
                                    </div>
                                  )}
                                  <div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {normalizedPlayer.firstName} {normalizedPlayer.lastName}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  {teamData.logo && <img src={`https://kickbase.b-cdn.net/${teamData.logo}`} alt={teamData.name} title={teamData.name} className="h-12 w-12 object-contain flex-shrink-0"/>}
                                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate" title={teamData.name}>
                                    {teamData.name}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {getPositionName(normalizedPlayer.position)}
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
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                            Keine Spieler gefunden.
                          </td>
                        </tr>
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