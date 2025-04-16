'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { kickbaseAPI } from '@/lib/kickbase-api';

// Define the type for the table items - can be removed if kickbase-api exports it, but keep for now
interface BundesligaTeam {
  tid: string;
  tn: string;
  cpl: number;
  sp: number;
  tim: string;
}

const CDN_BASE_URL = 'https://kickbase.b-cdn.net/';

export default function BuliTablePage() {
  const router = useRouter();
  const [teams, setTeams] = useState<BundesligaTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadTable = async () => {
      setIsLoading(true);
      setError('');

      // No need to manually get token here, kickbaseAPI handles it

      try {
        console.log('[BuliTablePage] Fetching via kickbaseAPI.getCompetitionTable...');
        
        // Use the API client method again
        const fetchedTeams = await kickbaseAPI.getCompetitionTable('1');
        
        console.log('[BuliTablePage] Data received via API client:', fetchedTeams);

        // Sort teams by placement (cpl)
        // Note: API route might already return sorted data, but sorting here is safe
        const sortedTeams = fetchedTeams.sort((a, b) => a.cpl - b.cpl);
        
        setTeams(sortedTeams);
      } catch (err: any) {
        // Error handling from kickbaseAPI will propagate here
        console.error("[BuliTablePage] Fehler beim Laden der Bundesliga-Tabelle via API:", err);
        setError(err.message || 'Fehler beim Laden der Tabelle.');
         // Handle 401 from _fetchInternal if needed
         if (err.message?.includes('401')) {
            localStorage.removeItem('kickbaseUser');
            router.push('/');
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Check auth before loading
    const storedUser = localStorage.getItem('kickbaseUser');
    if (storedUser) {
        try {
             // Ensure kickbaseAPI instance has token (optional, but good practice)
             const { token, id, email } = JSON.parse(storedUser);
             kickbaseAPI.token = token;
             kickbaseAPI.userId = id;
             kickbaseAPI.email = email;
             loadTable();
        } catch (e) {
             console.error("Error parsing user data on Buli page:", e);
             setError("Auth error.");
             setIsLoading(false);
             // Maybe redirect: router.push('/');
        }
    } else {
        setError("Nicht eingeloggt.");
        setIsLoading(false);
        // Maybe redirect: router.push('/');
    }

  }, [router]); // Added router to dependency array

  // Use a more generic back handler or specific target like dashboard
  const handleBack = () => { router.back(); }; // Or router.push('/dashboard');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-950">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Bundesliga Tabelle</h1>
          <button onClick={handleBack} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            Zurück
          </button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {isLoading ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex justify-center">
              {/* Simple Loading Spinner */}
              <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Tabelle wird geladen...</span>
            </div>
          ) : error ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              {/* Error Message */} 
              <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-md">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-16">Platz</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Team</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Kickbase Punkte</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {teams.length > 0 ? (
                      teams.map((team) => (
                        <tr 
                          key={team.tid} 
                          onClick={() => router.push(`/team-profile?teamId=${team.tid}`)} 
                          className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          {/* Platz */}
                          <td className="px-4 py-4 whitespace-nowrap text-center font-medium text-gray-900 dark:text-white">{team.cpl}</td>
                          {/* Team */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 mr-3">
                                <img
                                  className="h-10 w-10 object-contain"
                                  src={`${CDN_BASE_URL}${team.tim}`}
                                  alt={team.tn}
                                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                />
                              </div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {team.tn}
                              </div>
                            </div>
                          </td>
                          {/* Punkte */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                            {team.sp?.toLocaleString('de-DE') ?? '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">Keine Teamdaten gefunden.</td>
                      </tr>
                    )}
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