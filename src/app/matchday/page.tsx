'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { kickbaseAPI } from '@/lib/kickbase-api';
import { getTeamName } from './teamMapping';

export default function MatchdayPage() {
  const router = useRouter();
  const [matchdayData, setMatchdayData] = useState<any>(null);
  const [betlinkData, setBetlinkData] = useState<{[key: string]: any}>({});
  const [loadingBetlinks, setLoadingBetlinks] = useState<{[key: string]: boolean}>({});
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
      setBetlinkData({});
      
      // Spieltags-Daten abrufen
      const data = await kickbaseAPI.getMatchday(day);
      console.log('Spieltags-Daten geladen:', data);
      
      if (data && data.matches && data.matches.length > 0) {
        console.log(`Frontend: ${data.matches.length} Spiele gefunden`);
        
        // Team-Mapping anwenden, falls nötig
        if (data.matches[0].homeTeam && !isNaN(Number(data.matches[0].homeTeam))) {
          // Wenn homeTeam eine Zahl ist, ist es eine ID und wir sollten sie mappen
          data.matches = data.matches.map((match: any) => ({
            ...match,
            // Speichere die Original-IDs
            homeTeamId: match.homeTeam,
            awayTeamId: match.awayTeam,
            // Ersetze durch lesbare Namen
            homeTeam: match.homeTeam ? (match.homeTeamSymbol || getTeamName(match.homeTeam)) : 'Unbekannt',
            awayTeam: match.awayTeam ? (match.awayTeamSymbol || getTeamName(match.awayTeam)) : 'Unbekannt'
          }));
        }
        
        setMatchdayData(data);
        setIsLoading(false);
        
        // Wettquoten für alle Spiele direkt laden
        await loadAllBetlinks(data.matches);
      } else {
        console.log('Frontend: Keine Spiele gefunden oder leere Daten');
        setMatchdayData(data);
        setIsLoading(false);
      }
      
    } catch (error: any) {
      console.error('Fehler beim Laden der Spieltags-Daten:', error);
      setError('Die Spieltags-Daten konnten nicht geladen werden. ' + error.message);
      
      // Bei Authentifizierungsfehlern zurück zum Login
      if (error.message.includes('401') || error.message.includes('Unauthoriz')) {
        localStorage.removeItem('kickbaseUser');
        router.push('/');
      }
      setIsLoading(false);
    }
  };

  // Lädt die Betlinks für alle Matches auf einmal
  const loadAllBetlinks = async (matches: any[]) => {
    if (!matches || matches.length === 0) return;
    
    console.log('Lade Wettquoten für alle Spiele...');
    
    // Erstelle ein Objekt, um den Ladestatus aller Matches zu verfolgen
    const initialLoadingState: {[key: string]: boolean} = {};
    matches.forEach(match => {
      initialLoadingState[match.id] = true;
    });
    setLoadingBetlinks(initialLoadingState);
    
    // Parallel alle Betlinks laden
    const betlinkPromises = matches.map(match => 
      loadBetlinkForMatch(match.id)
        .finally(() => {
          // Ladestatus für dieses Match aktualisieren
          setLoadingBetlinks(prev => ({
            ...prev,
            [match.id]: false
          }));
        })
    );
    
    // Warten bis alle geladen sind
    await Promise.allSettled(betlinkPromises);
    console.log('Alle Wettquoten geladen!');
  };

  // Lädt Betlink-Daten für ein einzelnes Match
  const loadBetlinkForMatch = async (matchId: string) => {
    try {
      console.log(`Lade Wettquoten für Match ${matchId}...`);
      const data = await kickbaseAPI.getBetlink(matchId);
      
      // Füge die Daten zur betlinkData-Map hinzu
      setBetlinkData(prev => ({
        ...prev,
        [matchId]: data
      }));
      
      return data;
    } catch (error: any) {
      console.error(`Fehler beim Laden der Wettquoten für Match ${matchId}:`, error);
      return null;
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

  // Status formatieren
  const getStatusText = (status: number): string => {
    switch (status) {
      case 0: return "Anstehend";
      case 1: return "Läuft";
      case 2: return "Beendet";
      case 3: return "Abgesagt";
      default: return "Unbekannt";
    }
  };

  // Teambilder verwenden
  const renderTeamImage = (imageUrl: string) => {
    if (!imageUrl) return null;
    
    // Wenn der Pfad relativ ist, fügen wir den API-Basispfad hinzu
    const fullUrl = imageUrl.startsWith('http') 
      ? imageUrl 
      : `https://kickbase.b-cdn.net/${imageUrl}`;
    
    return (
      <img 
        src={fullUrl} 
        alt="Team Logo" 
        className="w-6 h-6 mr-2"
        onError={(e) => {
          // Bei Fehler ein Fallback-Icon anzeigen
          e.currentTarget.style.display = 'none';
        }}
      />
    );
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
              {matchdayData && matchdayData.matches && matchdayData.matches.length > 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
                  <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">Spiele</h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {matchdayData.matches.length} Spiele gefunden - Inklusive Wettquoten
                    </p>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {matchdayData.matches.map((match, index) => {
                      const matchBetlink = betlinkData[match.id];
                      const isLoading = loadingBetlinks[match.id];
                      
                      return (
                        <div 
                          key={`match-${index}-${match.id}`}
                          className="px-6 py-4"
                        >
                          <div className="flex flex-col gap-2">
                            {/* Spiel-Details */}
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <div className="font-medium flex items-center">
                                  {match.homeTeamImage && renderTeamImage(match.homeTeamImage)}
                                  <span className="min-w-20 inline-block">{match.homeTeam}</span>
                                  {match.homeScore !== undefined && match.awayScore !== undefined ? 
                                    <span className="mx-2 font-bold">{match.homeScore}:{match.awayScore}</span> : 
                                    <span className="mx-2">-</span>
                                  }
                                  <span className="min-w-20 inline-block">{match.awayTeam}</span>
                                  {match.awayTeamImage && renderTeamImage(match.awayTeamImage)}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {formatDate(match.date)}
                                  {match.status !== undefined && 
                                    <span className="ml-2 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs">
                                      {getStatusText(match.status)}
                                    </span>
                                  }
                                </div>
                                <div className="text-xs text-gray-400 dark:text-gray-500">
                                  Match-ID: {match.id}
                                </div>
                              </div>
                            </div>
                            
                            {/* Wettquoten */}
                            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                              {isLoading ? (
                                <div className="flex items-center justify-center h-8 text-sm text-gray-500">
                                  <svg className="animate-spin h-4 w-4 mr-2 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Wettquoten werden geladen...
                                </div>
                              ) : matchBetlink ? (
                                <div>
                                  {matchBetlink.url ? (
                                    <div className="flex items-center">
                                      <div className="text-sm text-gray-600 dark:text-gray-300 mr-3">
                                        <span className="font-medium">Wettquoten:</span> Verfügbar beim Wettanbieter
                                      </div>
                                      <a
                                        href={matchBetlink.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center px-3 py-1 text-xs border border-transparent font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                      >
                                        {matchBetlink.title || "Zum Wettanbieter"} {matchBetlink.provider ? `(${matchBetlink.provider})` : ''}
                                      </a>
                                    </div>
                                  ) : (
                                    <div className="text-sm text-yellow-600 dark:text-yellow-400">
                                      Keine Wettquoten für dieses Spiel verfügbar.
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  Wettquoten konnten nicht geladen werden.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-6 text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    Keine Spiele für diesen Spieltag gefunden.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}