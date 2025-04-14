//Hier werden die Ligen angezeigt, die der Benutzer in seinem Kickbase-Account hat
//TODO: ggf skippen, falls nur 1 liga
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { kickbaseAPI } from '@/lib/kickbase-api';
import type { League } from '@/types/league.types';

export default function LeaguesPage() {
  const router = useRouter();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Diese Funktion wird aufgerufen, wenn eine Liga ausgewählt wird ODER
  // wenn nur eine Liga vorhanden ist.
  const handleLeagueSelect = async (leagueId: string, leagueName: string, leagueImage: string | undefined) => {
    // Ladezustand nicht mehr ändern, da wir nicht mehr fetchen
    // setIsLoading(true);
    setError('');

    try {
      // Hole Liga-Details NICHT MEHR hier
      // const leagueDetails = await kickbaseAPI.getLeagueDetails(leagueId); // ENTFERNT

      // Speichere die ausgewählte Liga-ID und den bereits bekannten Namen
      localStorage.setItem('selectedLeague', JSON.stringify({
        id: leagueId,
        name: leagueName,
        image: leagueImage
      }));

      // Navigiere zum Dashboard
      router.push(`/dashboard?league=${leagueId}`);

    } catch (error: any) {
      // Dieser Fehler sollte jetzt seltener auftreten, da wir keinen API-Call mehr machen
      console.error('Fehler beim Setzen der Liga-Auswahl:', error);
      setError('Fehler beim Verarbeiten der Liga-Auswahl.');
      // setIsLoading(false); // Nicht mehr relevant
    }
  };

  useEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem('kickbaseUser');
      if (!storedUser) {
        router.push('/');
        return false;
      }
      try {
        const { token, id, email } = JSON.parse(storedUser); // ID auch auslesen
        kickbaseAPI.token = token;
        kickbaseAPI.userId = id; // userId auch setzen
        kickbaseAPI.email = email;
        return true;
      } catch (error) {
        console.error('Fehler beim Parsen der Benutzerdaten:', error);
        localStorage.removeItem('kickbaseUser');
        router.push('/');
        return false;
      }
    };



  const handleLogout = () => {
    localStorage.removeItem('kickbaseUser');
    localStorage.removeItem('selectedLeague');
    sessionStorage.removeItem('pendingLeagues'); // Auch hier entfernen
    kickbaseAPI.token = null; // Token auch in der API-Instanz löschen
    kickbaseAPI.userId = null;
    kickbaseAPI.email = null;
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Kickbase Analyzer</h1>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            Abmelden
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Wähle eine Liga</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Wähle eine deiner Kickbase-Ligen aus, um dein Team zu analysieren.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 p-4">
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
            )}

            {isLoading ? (
              <div className="px-6 py-5 flex justify-center">
                <svg className="animate-spin h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Ligen werden geladen...</span>
              </div>
            ) : leagues.length === 0 && !error ? (
              <div className="px-6 py-5 text-center text-gray-500 dark:text-gray-400">
                Keine Ligen gefunden oder du bist noch kein Mitglied in einer Liga.
              </div>
            ) : !error && leagues.length > 0 ? (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {leagues.map((league: League) => (
                  <li key={league.id}>
                    <button
                      onClick={() => handleLeagueSelect(league.id, league.name, league.image)}
                      className="w-full px-6 py-5 flex items-center hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700 transition duration-150 ease-in-out"
                    >
                      <div className="min-w-0 flex-1 flex items-center">
                        <div className="flex-shrink-0 bg-green-100 dark:bg-green-900 rounded-full p-2">
                          {(() => {
                            console.log('Bild-URL:', league.image);
                            return (
                              <img
                                src={league.image || '/placeholder.png'}
                                alt={`${league.name} Logo`}
                                className="h-6 w-6 rounded-full object-cover"
                                onError={(e) => {
                                  console.error('Bild konnte nicht geladen werden für Liga:', league.name, league.image);
                                  e.currentTarget.src = '/placeholder.png';
                                }}
                              />
                            );
                          })()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white text-left">
                            {league.name}
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
            ) : null }
          </div>
        </div>
      </main>
    </div>
  );
}