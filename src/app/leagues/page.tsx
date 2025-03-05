'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { kickbaseAPI } from '@/lib/kickbase-api';

export default function LeaguesPage() {
  const router = useRouter();
  const [leagues, setLeagues] = useState([]);
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

    if (checkAuth()) {
      fetchLeagues();
    }
  }, [router]);

  const fetchLeagues = async () => {
    try {
      const leaguesData = await kickbaseAPI.getLeagues();
      setLeagues(leaguesData);
    } catch (error: any) {
      console.error('Fehler beim Abrufen der Ligen:', error);
      setError('Fehler beim Laden deiner Ligen. Bitte versuche es später erneut.');
      
      // Bei Authentifizierungsfehlern zurück zum Login
      if (error.message.includes('401') || error.message.includes('Unauthoriz')) {
        localStorage.removeItem('kickbaseUser');
        router.push('/');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeagueSelect = async (leagueId: string) => {
    try {
      setIsLoading(true);
      
      // Liga-Details und Benutzer-Team abrufen
      const leagueDetails = await kickbaseAPI.getLeagueDetails(leagueId);
      const teamData = await kickbaseAPI.getTeam(leagueId);
      
      // Liga-ID im localStorage speichern
      localStorage.setItem('selectedLeague', JSON.stringify({
        id: leagueId,
        name: leagueDetails.name,
        teamId: teamData.id
      }));
      
      // Zur Dashboard-Seite navigieren
      router.push(`/dashboard?league=${leagueId}`);
    } catch (error: any) {
      console.error('Fehler beim Abrufen der Liga-Details:', error);
      setError('Fehler beim Laden der Liga-Details. Bitte versuche es später erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('kickbaseUser');
    localStorage.removeItem('selectedLeague');
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
            ) : leagues.length === 0 ? (
              <div className="px-6 py-5 text-center text-gray-500 dark:text-gray-400">
                Keine Ligen gefunden. Du musst Mitglied in mindestens einer Kickbase-Liga sein.
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {leagues.map((league: any) => (
                  <li key={league.id}>
                    <button
                      onClick={() => handleLeagueSelect(league.id)}
                      className="w-full px-6 py-5 flex items-center hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700 transition duration-150 ease-in-out"
                    >
                      <div className="min-w-0 flex-1 flex items-center">
                        <div className="flex-shrink-0 bg-green-100 dark:bg-green-900 rounded-full p-2">
                          <svg className="h-6 w-6 text-green-600 dark:text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white text-left">
                            {league.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 text-left">
                            {league.memberCount} Mitglieder
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
            )}
          </div>
        </div>
      </main>
    </div>
  );
}