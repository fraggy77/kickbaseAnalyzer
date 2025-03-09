'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { kickbaseAPI } from '@/lib/kickbase-api';

export default function MatchdayPage() {
  const router = useRouter();
  const [matchdayData, setMatchdayData] = useState<any>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [betlinkData, setBetlinkData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentDay, setCurrentDay] = useState(25); // Standard-Spieltag

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

    if (checkAuth()) {
      loadMatchday(currentDay);
    }
  }, [currentDay, router]);

  const loadMatchday = async (day: number) => {
    try {
      setIsLoading(true);
      setSelectedMatchId(null);
      setBetlinkData(null);
      
      // Spieltags-Daten abrufen
      const data = await kickbaseAPI.getMatchday(day);
      console.log('Spieltags-Daten geladen:', data);
      
      setMatchdayData(data);
    } catch (error: any) {
      console.error('Fehler beim Laden der Spieltags-Daten:', error);
      setError('Die Spieltags-Daten konnten nicht geladen werden. ' + error.message);
      
      // Bei Authentifizierungsfehlern zurück zum Login
      if (error.message.includes('401') || error.message.includes('Unauthoriz')) {
        localStorage.removeItem('kickbaseUser');
        router.push('/');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBetlinkTest = async (matchId: string) => {
    try {
      setIsLoading(true);
      setSelectedMatchId(matchId);
      
      // Betlink abrufen
      const data = await kickbaseAPI.getBetlink(matchId);
      console.log('Betlink-Daten geladen:', data);
      
      setBetlinkData(data);
    } catch (error: any) {
      console.error('Fehler beim Laden des Betlinks:', error);
      setError('Der Betlink konnte nicht geladen werden. ' + error.message);
      setBetlinkData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/leagues');
  };

  // Hilfsfunktion zum Formatieren von JSON
  const formatJSON = (json: any): string => {
    try {
      return JSON.stringify(json, null, 2);
    } catch (e) {
      return 'Fehler beim Formatieren des JSON: ' + e;
    }
  };
  
  // Formatiert ein Datum
  const formatDate = (dateStr: string): string => {
    if (!dateStr || dateStr === 'Kein Datum') return dateStr;
    
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('de-DE', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Bundesliga Spieltag {currentDay}</h1>
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
          {/* Spieltag-Auswahl */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-6">
            <div className="flex flex-wrap gap-2 justify-center">
              {[...Array(34)].map((_, i) => (
                <button
                  key={`day-${i+1}`}
                  onClick={() => setCurrentDay(i+1)}
                  className={`px-4 py-2 rounded-md ${
                    currentDay === i+1
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                  }`}
                >
                  {i+1}
                </button>
              ))}
            </div>
          </div>
          
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
              {/* Match-Übersicht */}
              {matchdayData && matchdayData.matchIds && matchdayData.matchIds.length > 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
                  <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">Spiele</h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {matchdayData.matchIds.length} Spiele gefunden - Klicke auf ein Spiel, um Wettquoten anzuzeigen
                    </p>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {matchdayData.matchIds.map((match, index) => (
                      <div 
                        key={`match-${index}`}
                        className={`px-6 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          selectedMatchId === match.id ? 'bg-gray-100 dark:bg-gray-700' : ''
                        }`}
                        onClick={() => handleBetlinkTest(match.id)}
                      >
                        <div className="flex flex-col sm:flex-row justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{match.homeTeam} - {match.awayTeam}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(match.date)}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              Match-ID: {match.id}
                            </div>
                          </div>
                          <div className="mt-2 sm:mt-0 flex items-center">
                            <button
                              className="px-3 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBetlinkTest(match.id);
                              }}
                            >
                              Wettquoten
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-6 text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    Keine Spiele für diesen Spieltag gefunden.
                  </p>
                </div>
              )}
              
              {/* Betlink-Anzeige */}
              {selectedMatchId && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
                  <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">Betlink für Match-ID: {selectedMatchId}</h2>
                  </div>
                  <div className="p-6">
                    {betlinkData ? (
                      <>
                        {betlinkData.url ? (
                          <div className="mb-4">
                            <a
                              href={betlinkData.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                              {betlinkData.title || "Zum Wettanbieter"} {betlinkData.provider ? `(${betlinkData.provider})` : ''}
                            </a>
                          </div>
                        ) : (
                          <p className="text-yellow-600 dark:text-yellow-400 mb-4">Keine Wett-URL in den Daten gefunden.</p>
                        )}
                        
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Vollständige Antwort:</h3>
                        <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md overflow-auto text-xs text-gray-800 dark:text-gray-200 max-h-[300px]">
                          {formatJSON(betlinkData)}
                        </pre>
                      </>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">
                        Keine Betlink-Daten verfügbar.
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