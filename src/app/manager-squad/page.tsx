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
        const { token, email } = JSON.parse(storedUser);
        
        // Token in der API setzen
        kickbaseAPI.token = token;
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

    if (checkAuth()) {
      loadManagerData();
    }
  }, [leagueId, userId, router]);

  const loadManagerData = async () => {
    if (!leagueId || !userId) return;

    try {
      setIsLoading(true);
      setError('');

      const responseData = await kickbaseAPI.getManagerSquad(leagueId, userId);

      console.log('Manager-Squad Daten geladen:', responseData);

      const playersData = responseData?.pl;
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
          name: responseData?.managerName || 'Unbekannter Manager',
          teamValue: calculatedTeamValue,
          managerImage: responseData?.managerImage || '',
        });

      } else {
        console.warn('Keine Spielerdaten (pl) in der Manager-Squad-Antwort gefunden');
        setPlayers([]);
        setManagerInfo({
          name: responseData?.managerName || 'Unbekannter Manager',
          teamValue: 0,
          managerImage: responseData?.managerImage || '',
        });
      }

    } catch (error: any) {
      console.error('Fehler beim Laden der Manager-Squad-Daten:', error);
      setError(`Der Kader konnte nicht geladen werden: ${error.message}`);
      if (error.message.includes('401') || error.message.includes('Unauthoriz')) {
        localStorage.removeItem('kickbaseUser');
        router.push('/');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.push(`/league-table?league=${leagueId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Kader von {managerInfo?.name || '...'}
          </h1>
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
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Teamwert: {formatCurrency(managerInfo.teamValue)}
                      </p>
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
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Spieler</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Team</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Position</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Marktwert</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Profit</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Punkte</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {players.length > 0 ? (
                        players.map((player) => {
                          const normalizedPlayer = normalizePlayer(player);
                          return (
                            <tr key={normalizedPlayer.id}>
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
                                {(() => {
                                  const teamData = getTeamData(normalizedPlayer.teamId);
                                  if (teamData.logo) {
                                    return (
                                      <div className="flex items-center space-x-2">
                                        <div className="flex-shrink-0 h-8 w-8">
                                          <img
                                            src={`https://kickbase.b-cdn.net/${teamData.logo}`}
                                            alt={teamData.name}
                                            title={teamData.name}
                                            className="h-full w-full object-contain"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none';
                                              const parentDiv = e.currentTarget.closest('div.flex-shrink-0');
                                              if (parentDiv && parentDiv.nextSibling && parentDiv.nextSibling.textContent === '') {
                                                 (parentDiv.nextSibling as HTMLElement).textContent = teamData.name;
                                              } else if (parentDiv) {
                                                const nameSpan = document.createElement('span');
                                                nameSpan.className = 'text-sm text-gray-500 dark:text-gray-400';
                                                nameSpan.textContent = teamData.name;
                                                parentDiv.parentElement?.appendChild(nameSpan);
                                              }
                                            }}
                                          />
                                        </div>
                                        <span className="text-sm text-gray-500 dark:text-gray-400 truncate" title={teamData.name}>
                                          {teamData.name}
                                        </span>
                                      </div>
                                    );
                                  } else {
                                    return <div className="text-sm text-gray-500 dark:text-gray-400">{teamData.name}</div>;
                                  }
                                })()}
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
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {formatCurrency(normalizedPlayer.marketValue)}
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                                normalizedPlayer.mvgl > 0 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : normalizedPlayer.mvgl < 0 
                                  ? 'text-red-600 dark:text-red-400' 
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}>
                                {formatCurrency(normalizedPlayer.mvgl)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {normalizedPlayer.points}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr><td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">Keine Spieler gefunden.</td></tr>
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