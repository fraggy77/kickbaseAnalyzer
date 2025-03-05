'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { kickbaseAPI } from '@/lib/kickbase-api';

interface LeagueDetails {
  i: string;          // ID
  lnm: string;        // Liganame
  cpn: string;        // Competition Name
  dt: string;         // Datum der Erstellung
  isr: boolean;       // ?
  // weitere Eigenschaften
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leagueId = searchParams.get('league');
  
  const [leagueDetails, setLeagueDetails] = useState<LeagueDetails | null>(null);
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
      loadLeagueDetails();
    }
  }, [leagueId, router]);

  const loadLeagueDetails = async () => {
    try {
      setIsLoading(true);
      
      // Liga-Details abrufen
      const details = await kickbaseAPI.getLeagueDetails(leagueId as string);
      console.log('Liga-Details geladen:', details);
      setLeagueDetails(details);
    } catch (error: any) {
      console.error('Fehler beim Laden der Liga-Details:', error);
      setError('Die Liga-Details konnten nicht geladen werden. Bitte versuche es später erneut.');
      
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
    router.push('/leagues');
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
          <div className="flex space-x-4">
            <button
              onClick={handleBack}
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Zurück
            </button>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Abmelden
            </button>
          </div>
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
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Liga-Details werden geladen...</span>
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  {leagueDetails?.lnm || 'Liga-Details'}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {leagueDetails?.cpn || 'Wettbewerb'}
                </p>
              </div>
              
              <div className="px-6 py-5">
                {leagueDetails && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Liga-ID</h3>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{leagueDetails.i}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Erstellt am</h3>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {new Date(leagueDetails.dt).toLocaleDateString()}
                      </p>
                    </div>
                    
                    {/* Hier könnten weitere Liga-Details angezeigt werden */}
                    <div className="pt-5">
                      <div className="flex justify-between">
                        <button
                          type="button"
                          onClick={() => router.push(`/team?league=${leagueId}`)}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          Mein Team anzeigen
                        </button>
                        
                        <button
                          type="button"
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          Tabelle anzeigen
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}