'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { kickbaseAPI } from '@/lib/kickbase-api';
import { formatCurrency } from '@/utils/formatting.utils';

interface RankingUser {
  i: string;       // ID
  n: string;       // Name
  adm: boolean;    // Administrator
  sp: number;      // Saisonpunkte
  mdp: number;     // Spieltagspunkte
  shp: number;     // ?
  tv: number;      // Teamwert
  spl: number;     // Saisonplatzierung
  mdpl: number;    // Spieltagsplatzierung
  shpl: number;    // ?
  pa: boolean;     // ?
  lp: number[];    // ?
  uim?: string;    // User Image
  swc?: number;    // ?
  iapl: boolean;   // ?
}

interface RankingData {
  ti: string;      // Titel
  cpi: string;     // Competition ID
  ish: boolean;    // ?
  us: RankingUser[]; // Users
  day: number;     // Aktueller Spieltag
  shmdn: number;   // ?
  sn: string;      // Saison Name
  il: boolean;     // ?
  nd: number;      // ?
  lfmd: number;    // ?
  ia: boolean;     // ?
}

export default function LeagueTablePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leagueId = searchParams.get('league');
  
  const [ranking, setRanking] = useState<RankingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [leagueName, setLeagueName] = useState<string>('');
  const [leagueImage, setLeagueImage] = useState<string | null>(null);

  useEffect(() => {
    // Überprüfe, ob der Benutzer angemeldet ist
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
        setCurrentUserId(id);
        return true;
      } catch (error) {
        console.error('Fehler beim Parsen der Benutzerdaten:', error);
        localStorage.removeItem('kickbaseUser');
        router.push('/');
        return false;
      }
    };

    // Wenn kein League-Parameter übergeben wurde, zurück zur Liga-Auswahl
    if (!leagueId) {
      router.push('/leagues');
      return;
    }

    // Get league image from localStorage
    const storedLeague = localStorage.getItem('selectedLeague');
    if (storedLeague) {
        try {
            const selectedLeague = JSON.parse(storedLeague);
            if (selectedLeague.id === leagueId) {
                setLeagueName(selectedLeague.name || 'Liga Tabelle');
                setLeagueImage(selectedLeague.image);
            }
        } catch (e) {
            console.error("Error parsing selectedLeague for header:", e);
        }
    }

    if (checkAuth()) {
      loadRanking();
    }
  }, [leagueId, router]);

  const loadRanking = async () => {
    try {
      setIsLoading(true);
      
      // Liga-Ranking abrufen
      const data = await kickbaseAPI.getLeagueRanking(leagueId as string);
      console.log('Ranking geladen:', data);
      setRanking(data);
    } catch (error: any) {
      console.error('Fehler beim Laden des Rankings:', error);
      setError('Die Liga-Tabelle konnte nicht geladen werden. Bitte versuche es später erneut.');
      
      // Bei Authentifizierungsfehlern zurück zum Login
      if (error.message.includes('401') || error.message.includes('Unauthoriz')) {
        localStorage.removeItem('kickbaseUser');
        router.push('/');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.push(`/dashboard?league=${leagueId}`);
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950">
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
              {leagueName || 'Liga Tabelle'}
            </h1>
          </div>
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
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Tabelle wird geladen...</span>
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  {ranking?.ti || 'Liga-Tabelle'}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Saison {ranking?.sn} - Spieltag {ranking?.day}/{ranking?.nd}
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Platz
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Manager
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Punkte Saison
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Spieltag
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Teamwert
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {ranking?.us.sort((a, b) => a.spl - b.spl).map((user) => (
                      <tr key={user.i}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {user.spl}.
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => router.push(`/manager-squad?league=${leagueId}&user=${user.i}`)}
                            className="flex items-center group w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 p-1 rounded transition-colors"
                            title={`${user.n} Kader`}
                            disabled={!leagueId || user.i === currentUserId}
                          >
                            {user.uim ? (
                              <div className="h-10 w-10 flex-shrink-0 mr-3">
                                <img
                                  src={user.uim}
                                  alt={`${user.n} Profilbild`}
                                  className={`h-10 w-10 rounded-full object-cover transition-all`}
                                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/40'; }}
                                />
                              </div>
                            ) : (
                              <div className={`h-10 w-10 flex-shrink-0 mr-3 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center transition-all`}>
                                <svg className="h-6 w-6 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                              </div>
                            )}
                            <div className="ml-0">
                              <div className={`text-sm font-medium transition-colors ${user.i === currentUserId ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}>
                                {user.n}
                              </div>
                              {user.adm && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">Admin</div>
                              )}
                            </div>
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                          {user.sp.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
    {user.mdpl}. ({user.mdp})
  </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                          {formatCurrency(user.tv)}
                        </td>
                      </tr>
                    ))}
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
