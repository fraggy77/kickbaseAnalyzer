'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { kickbaseAPI } from '@/lib/kickbase-api';

interface Match {
  id: string;
  home: string;
  away: string;
  date: string;
  // Weitere Eigenschaften je nach API-Struktur
}

export default function BettingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leagueId = searchParams.get('league');
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [betlink, setBetlink] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Überprüfe, ob der Benutzer angemeldet ist
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

    // Wenn kein League-Parameter übergeben wurde, zurück zur Liga-Auswahl
    if (!leagueId) {
      router.push('/leagues');
      return;
    }

    if (checkAuth()) {
      loadMatches();
    }
  }, [leagueId, router]);

  const loadMatches = async () => {
    try {
      setIsLoading(true);
      
      // Spiele abrufen
      const matchesData = await kickbaseAPI.getMatches(leagueId as string);
      console.log('Spiele geladen:', matchesData);
      
      // Das Format der Match-Daten hängt von der tatsächlichen API-Struktur ab
      // Hier wird ein vorläufiges Format angenommen
      if (matchesData && Array.isArray(matchesData.matches)) {
        setMatches(matchesData.matches);
      } else {
        console.warn('Keine Spiele in den Daten gefunden');
        setMatches([]);
      }
    } catch (error: any) {
      console.error('Fehler beim Laden der Spiele:', error);
      setError('Die Spiele konnten nicht geladen werden. ' + error.message);
      
      // Bei Authentifizierungsfehlern zurück zum Login
      if (error.message.includes('401') || error.message.includes('Unauthoriz')) {
        localStorage.removeItem('kickbaseUser');
        router.push('/');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadBetlink = async (matchId: string) => {
    try {
      setIsLoading(true);
      setSelectedMatch(matchId);
      
      // Betlink abrufen
      const betlinkData = await kickbaseAPI.getBetlink(matchId);
      console.log('Betlink geladen:', betlinkData);
      
      setBetlink(betlinkData);
    } catch (error: any) {
      console.error('Fehler beim Laden des Betlinks:', error);
      setError('Der Betlink konnte nicht geladen werden. ' + error.message);
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Wettquoten</h1>
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
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Daten werden geladen...</span>
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
              {/* Spielliste */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden mb-6">
                <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">Spiele</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Wähle ein Spiel aus, um Wettquoten anzuzeigen
                  </p>
                </div>

                {matches.length > 0 ? (
                  <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {matches.map((match) => (
                      <li key={match.id}>
                        <button
                          onClick={() => loadBetlink(match.id)}
                          className={`w-full px-6 py-5 flex items-center hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700 transition duration-150 ease-in-out ${
                            selectedMatch === match.id ? 'bg-gray-100 dark:bg-gray-700' : ''
                          }`}
                        >
                          <div className="min-w-0 flex-1 flex items-center">
                            <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {match.home} vs. {match.away}
                                </p>
                                <p className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                                  {new Date(match.date).toLocaleDateString()} {new Date(match.date).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div>
                            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-6 py-5 text-center text-gray-500 dark:text-gray-400">
                    Keine Spiele gefunden.
                  </div>
                )}
              </div>

              {/* Wettquoten */}
              {selectedMatch && betlink && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                  <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">Wettquoten</h2>
                  </div>
                  <div className="px-6 py-5">
                    {/* Hier müsste der Inhalt dynamisch an die tatsächliche API-Antwort angepasst werden */}
                    {betlink.url ? (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          Klicke auf den Link unten, um zu den Wettquoten zu gelangen:
                        </p>
                        <a 
                          href={betlink.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          Zu den Wettquoten
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Keine Wettquoten verfügbar.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}