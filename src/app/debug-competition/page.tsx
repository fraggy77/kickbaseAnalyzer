'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { kickbaseAPI } from '@/lib/kickbase-api';

export default function DebugCompetitionPage() {
  const router = useRouter();
  const [debugData, setDebugData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [matchIdsFound, setMatchIdsFound] = useState<string[]>([]);

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
      debugCompetition();
    }
  }, [router]);

  const debugCompetition = async () => {
    try {
      setIsLoading(true);
      setMatchIdsFound([]); // IDs zurücksetzen
      
      // Debug-Daten abrufen
      const data = await kickbaseAPI.debugCompetition();
      console.log('Competition-Debug-Daten geladen:', data);
      
      // Erst Daten setzen
      setDebugData(data);
      
      // Dann nach einer kurzen Verzögerung die ID-Suche starten
      // So stellen wir sicher, dass React Zeit hat, State-Updates auszuführen
      setTimeout(() => {
        try {
          console.log('Suche nach Match-IDs...');
          // Einige potenzielle Test-IDs direkt hinzufügen (nur zu Testzwecken)
          setMatchIdsFound(['test-id-1', 'test-id-2']);
          
          // Dann die richtigen IDs suchen
          if (data && data.results) {
            // Nur in erfolgreichen 200er Antworten suchen
            const successfulEndpoints = Object.entries(data.results)
              .filter(([_, result]: [string, any]) => result.statusCode === 200 && result.data);
            
            console.log(`${successfulEndpoints.length} erfolgreiche Endpoints gefunden`);
            
            // Jeden Endpoint einzeln durchsuchen
            successfulEndpoints.forEach(([endpoint, result]: [string, any]) => {
              console.log(`Durchsuche Endpoint ${endpoint}...`);
              findMatchIds(result.data, endpoint);
            });
          }
        } catch (err) {
          console.error('Fehler bei der ID-Suche:', err);
        } finally {
          setIsLoading(false);
        }
      }, 500);
      
    } catch (error: any) {
      console.error('Fehler beim Laden der Competition-Debug-Daten:', error);
      setError('Die Debug-Daten konnten nicht geladen werden. ' + error.message);
      
      // Bei Authentifizierungsfehlern zurück zum Login
      if (error.message.includes('401') || error.message.includes('Unauthoriz')) {
        localStorage.removeItem('kickbaseUser');
        router.push('/');
      }
      setIsLoading(false);
    }
  };
  
  // Rekursive Funktion zum Suchen nach Match-IDs in allen Objekten
  const findMatchIds = (obj: any, path: string = '') => {
    const foundIds: string[] = [];
    
    if (!obj) return [];
    
    // Wenn es ein Array ist, jedes Element durchsuchen
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const newFoundIds = findMatchIds(item, `${path}[${index}]`);
        if (newFoundIds && newFoundIds.length > 0) {
          foundIds.push(...newFoundIds);
        }
      });
    } 
    // Wenn es ein Objekt ist, jede Eigenschaft durchsuchen
    else if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          // Spezifische Schlüssel prüfen, die auf Match-IDs hindeuten könnten
          const isMatchRelated = 
            key.toLowerCase().includes('match') || 
            (key === 'i' && obj.ht && obj.at) || // Enthält Home Team und Away Team
            (key === 'i' && (obj.hg !== undefined || obj.ag !== undefined)) || // Enthält Home Goals oder Away Goals
            (key === 'i' && obj.md); // Matchday
          
          // Sammeln von IDs für matchbezogene Objekte
          if (isMatchRelated && obj[key] && (typeof obj[key] === 'string' || typeof obj[key] === 'number')) {
            const idString = String(obj[key]);
            foundIds.push(idString);
            console.log(`Mögliche Match-ID gefunden: ${idString} unter ${path}.${key}`);
          }
          
          // Rekursiver Aufruf für tiefer verschachtelte Objekte
          const newFoundIds = findMatchIds(obj[key], `${path}.${key}`);
          if (newFoundIds && newFoundIds.length > 0) {
            foundIds.push(...newFoundIds);
          }
        }
      }
    }
    
    // Eindeutige IDs zurückgeben und im State speichern
    if (foundIds.length > 0) {
      // Nur eindeutige STRING-IDs behalten
      const uniqueIds = [...new Set(foundIds.filter(id => typeof id === 'string'))];
      
      // State aktualisieren
      setMatchIdsFound(prev => {
        const allIds = [...prev, ...uniqueIds];
        return [...new Set(allIds)]; // Eindeutige IDs zurückgeben
      });
      
      return uniqueIds;
    }
    
    return [];
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
  
  // Reduziert die komplette Antwort, um übersichtlicher zu sein
  const getReducedResponse = (data: any) => {
    if (!data || !data.results) return {};
    
    const reduced = {};
    
    // Für jeden Endpoint filtern wir die wichtigsten Infos
    for (const endpoint in data.results) {
      const result = data.results[endpoint];
      
      // Nur erfolgreiche Anfragen mit Daten anzeigen
      if (result.statusCode === 200 && result.data) {
        reduced[endpoint] = {
          keys: Object.keys(result.data),
          preview: getPreview(result.data),
        };
      }
    }
    
    return reduced;
  };
  
  // Erstellt eine gekürzte Vorschau der Daten
  const getPreview = (data: any): any => {
    if (!data) return null;
    
    if (typeof data !== 'object') return data;
    
    if (Array.isArray(data)) {
      return data.length > 0 
        ? { arrayLength: data.length, firstItem: getPreview(data[0]) }
        : { arrayLength: 0 };
    }
    
    const result = {};
    const keys = Object.keys(data).slice(0, 5); // Nur die ersten 5 Eigenschaften
    
    for (const key of keys) {
      const value = data[key];
      
      if (value === null || value === undefined) {
        result[key] = value;
      } else if (Array.isArray(value)) {
        result[key] = { arrayLength: value.length };
        if (value.length > 0) {
          result[key].firstItem = typeof value[0] === 'object' 
            ? { type: typeof value[0], keys: Object.keys(value[0]) }
            : value[0];
        }
      } else if (typeof value === 'object') {
        result[key] = { type: 'object', keys: Object.keys(value) };
      } else {
        result[key] = value;
      }
    }
    
    if (Object.keys(data).length > 5) {
      result['...'] = `${Object.keys(data).length - 5} weitere Eigenschaften`;
    }
    
    return result;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Wettbewerbs-API Debug</h1>
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
              {/* Match-IDs */}
              {matchIdsFound.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
                  <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">Gefundene Match-IDs</h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Diese Match-IDs wurden in den API-Antworten gefunden
                    </p>
                  </div>
                  <div className="px-6 py-5">
                    <div className="flex flex-wrap gap-2">
                      {matchIdsFound.map((id, index) => (
                        <div 
                          key={`match-id-${index}-${typeof id === 'string' ? id : JSON.stringify(id)}`} 
                          className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                        >
                          {typeof id === 'string' ? id : JSON.stringify(id)}
                        </div>
                      ))}
                    </div>
                    
                    {/* Buttons zum Testen des Betlink-Endpoints mit Match-IDs */}
                    {matchIdsFound.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {matchIdsFound.slice(0, 5).map((id, index) => (
                          <button
                            key={`test-button-${index}`}
                            onClick={async () => {
                              try {
                                setIsLoading(true);
                                const betlinkData = await kickbaseAPI.getBetlink(id);
                                alert(`Betlink-Daten für Match ${id}:\n${JSON.stringify(betlinkData, null, 2)}`);
                              } catch (error: any) {
                                alert(`Fehler beim Abrufen des Betlinks für Match ${id}: ${error.message}`);
                              } finally {
                                setIsLoading(false);
                              }
                            }}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            Betlink testen: {id.length > 10 ? `${id.substring(0, 10)}...` : id}
                          </button>
                        ))}
                        
                        {matchIdsFound.length > 5 && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 self-center ml-2">
                            +{matchIdsFound.length - 5} weitere IDs
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Reduzierte API-Antworten */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden mb-6">
                <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">API-Endpunkte (Zusammenfassung)</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Übersicht der erfolgreichen API-Anfragen
                  </p>
                </div>
                <div className="px-6 py-5">
                  <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md overflow-auto text-xs text-gray-800 dark:text-gray-200 max-h-[300px]">
                    {debugData && formatJSON(getReducedResponse(debugData))}
                  </pre>
                </div>
              </div>
              
              {/* Vollständige API-Antwort */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">Vollständige API-Antwort</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Alle Debug-Daten
                  </p>
                </div>
                <div className="px-6 py-5">
                  <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md overflow-auto text-xs text-gray-800 dark:text-gray-200 max-h-[500px]">
                    {debugData && formatJSON(debugData)}
                  </pre>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}