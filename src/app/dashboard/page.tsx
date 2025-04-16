'use client'; 
// Übersichtsseite nach Liga-Select mit Buttons für Teams, Tabelle... 

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { kickbaseAPI } from '@/lib/kickbase-api';

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leagueId = searchParams.get('league');
  
  const [leagueName, setLeagueName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [leagueImage, setLeagueImage] = useState<string | undefined>(undefined);

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

    const loadInitialData = () => {
      if (!leagueId) {
        setError('Keine Liga-ID in der URL gefunden.');
        setIsLoading(false);
        return;
      }

      const storedLeague = localStorage.getItem('selectedLeague');
      if (storedLeague) {
        try {
          const selectedLeague = JSON.parse(storedLeague);
          if (selectedLeague.id === leagueId) {
            setLeagueName(selectedLeague.name || 'Unbekannte Liga');
            setLeagueImage(selectedLeague.image);
          } else {
            console.warn('Liga-ID in localStorage stimmt nicht mit URL überein. Lade neu...');
            setError('Inkonsistenter Ligastatus.');
          }
        } catch (e) {
          console.error("Fehler beim Parsen von selectedLeague:", e);
          setError('Gespeicherte Liga-Daten sind korrupt.');
        }
      } else {
        setError('Keine ausgewählte Liga gefunden. Bitte wähle eine Liga aus.');
      }
      setIsLoading(false);
    };

    if (checkAuth()) {
      loadInitialData();
    } else {
      setIsLoading(false);
    }
  }, [leagueId]);

  const handleBack = () => {
    router.push('/leagues');
  };

  const handleLogout = () => {
    localStorage.removeItem('kickbaseUser');
    localStorage.removeItem('selectedLeague');
    kickbaseAPI.token = null;
    kickbaseAPI.userId = null;
    kickbaseAPI.email = null;
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
                <div className="flex items-center space-x-3">
                  {leagueImage && (
                    <img
                      src={leagueImage}
                      alt={`${leagueName} Logo`}
                      className="h-16 w-16 rounded-md object-cover flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                    {leagueName || 'Dashboard'}
                  </h2>
                </div>
              </div>
              
              <div className="px-6 py-5">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Liga-ID</h3>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{leagueId}</p>
                  </div>
                  
                  <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                      onClick={() => router.push(`/team?league=${leagueId}`)}
                      className="flex flex-col items-center justify-center p-6 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 rounded-xl transition-colors shadow-sm hover:shadow"
                    >
                      <svg className="h-12 w-12 text-green-600 dark:text-green-400 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="text-lg font-medium text-green-800 dark:text-green-300">Mein Team</span>
                    </button>

                    <button
                      onClick={() => router.push(`/league-table?league=${leagueId}`)}
                      className="flex flex-col items-center justify-center p-6 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-xl transition-colors shadow-sm hover:shadow"
                    >
                      <svg className="h-12 w-12 text-blue-600 dark:text-blue-400 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="text-lg font-medium text-blue-800 dark:text-blue-300">Tabelle</span>
                    </button>

                    <button
                      onClick={() => router.push(`/market?league=${leagueId}`)}
                      className="flex flex-col items-center justify-center p-6 bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30 rounded-xl transition-colors shadow-sm hover:shadow"
                    >
                      <svg className="h-12 w-12 text-yellow-600 dark:text-yellow-400 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h2.64m-13.78 0h13.78M6 10.5h12M6 6h12m-1.5 1.5h.75a.75.75 0 0 0 0-1.5h-.75a.75.75 0 0 0 0 1.5m-4.5 0h.75a.75.75 0 0 0 0-1.5h-.75a.75.75 0 0 0 0 1.5m-4.5 0h.75a.75.75 0 0 0 0-1.5H6.75a.75.75 0 0 0 0 1.5M3 3h18v18H3V3z" />
                      </svg>
                      <span className="text-lg font-medium text-yellow-800 dark:text-yellow-300">Transfermarkt</span>
                    </button>

                    <button
                      onClick={() => router.push(`/buli`)}
                      className="flex flex-col items-center justify-center p-6 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 rounded-xl transition-colors shadow-sm hover:shadow"
                    >
                      <svg className="h-12 w-12 text-purple-600 dark:text-purple-400 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-6.75c-.622 0-1.125.504-1.125 1.125V18.75m9 0h-9" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 21.75H14.25M12 14.25v7.5M12 14.25a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                      </svg>
                      <span className="text-lg font-medium text-purple-800 dark:text-purple-300">Buli Tabelle</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}