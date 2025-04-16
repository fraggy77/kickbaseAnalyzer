'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { kickbaseAPI, formatCurrency } from '@/lib/kickbase-api';
import { getPositionName, getStatusName } from '@/utils/player.utils';

// Type definition for the expected API response (could be imported from kickbase-api.ts if exported)
interface TeamProfilePlayer {
  i: string; n: string; lst?: number; st?: number; pos?: number; 
  mv?: number; mvt?: number; ap?: number; iotm?: boolean; ofc?: number;
  tid?: string; sdmvt?: number; mvgl?: number; pim?: string;
}
interface TeamProfileResponse {
  tid: string; tn: string; pl: number; tv: number; tw: number;
  td: number; tl: number; it: TeamProfilePlayer[]; npt: number;
  avpcl: boolean; tim: string; pclpurl?: string; plpurl?: string;
}

const CDN_BASE_URL = 'https://kickbase.b-cdn.net/';

function TeamProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = searchParams.get('teamId');

  const [profile, setProfile] = useState<TeamProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!teamId) {
      setError('Team ID fehlt in der URL.');
      setIsLoading(false);
      return;
    }

    const loadProfile = async () => {
      setIsLoading(true);
      setError('');
      try {
        console.log(`[TeamProfilePage] Fetching profile for team ID: ${teamId}`);
        // Assuming competition ID 1 for Bundesliga
        const data = await kickbaseAPI.getTeamProfile('1', teamId);
        console.log('[TeamProfilePage] Profile data received:', data);
        setProfile(data);
      } catch (err: any) {
        console.error("[TeamProfilePage] Fehler beim Laden des Team-Profils:", err);
        setError(err.message || 'Fehler beim Laden des Profils.');
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
             const { token, id, email } = JSON.parse(storedUser);
             kickbaseAPI.token = token; // Ensure API client has token
             kickbaseAPI.userId = id;
             kickbaseAPI.email = email;
             loadProfile();
        } catch (e) {
             console.error("Auth error on TeamProfile page:", e);
             setError("Authentifizierungsfehler.");
             setIsLoading(false);
             // router.push('/'); // Optional redirect
        }
    } else {
        setError("Nicht eingeloggt.");
        setIsLoading(false);
        // router.push('/'); // Optional redirect
    }

  }, [teamId, router]);

  const handleBack = () => { router.back(); };

  // Helper to safely get player image URL
  const getPlayerImageUrl = (pim?: string) => {
    if (!pim) return '/placeholder.png';
    return pim.startsWith('http') || pim.startsWith('/') ? pim : `${CDN_BASE_URL}${pim}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white dark:bg-gray-850 shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-3">
              {profile?.tim && (
                  <img src={`${CDN_BASE_URL}${profile.tim}`} alt={profile.tn} className="h-8 w-8 object-contain"/>
              )}
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {profile?.tn || 'Team Profil'}
              </h1>
          </div>
          <button onClick={handleBack} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            Zurück
          </button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {isLoading ? (
             <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex justify-center">
                {/* Loading Spinner */} 
                 <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Profil wird geladen...</span>
            </div>
          ) : error ? (
             <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                {/* Error Message */}
                <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-md">
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
            </div>
          ) : profile ? (
            <>
              {/* Team Stats Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
                 <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                     <h2 className="text-lg font-medium text-gray-900 dark:text-white">Team Statistik</h2>
                 </div>
                 <div className="px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Teamwert</h3>
                        <p className="mt-1 text-lg font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(profile.tv)}</p>
                    </div>
                     <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Platz</h3>
                        <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{profile.pl || '-'}</p>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">S-U-N</h3>
                        <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{profile.tw} - {profile.td} - {profile.tl}</p>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Spieler</h3>
                        <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{profile.npt || '-'}</p>
                    </div>
                 </div>
              </div>

              {/* Player List Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                     <h2 className="text-lg font-medium text-gray-900 dark:text-white">Spielerliste</h2>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                       <thead className="bg-gray-50 dark:bg-gray-750">
                          <tr>
                             <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Spieler</th>
                             <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Position</th>
                             <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                             <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Marktwert</th>
                             <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ø Punkte</th>
                          </tr>
                       </thead>
                       <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {profile.it && profile.it.length > 0 ? (
                             profile.it.map((player) => (
                                <tr key={player.i}>
                                   {/* Spieler */}
                                   <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center">
                                         <div className="flex-shrink-0 h-10 w-10 mr-3">
                                            <img
                                               className="h-10 w-10 rounded-full object-cover"
                                               src={getPlayerImageUrl(player.pim)}
                                               alt={player.n}
                                               onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.png'; }}
                                            />
                                         </div>
                                         <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            {player.n} {/** Assuming 'n' is LastName, adjust if FirstName needed and available */}
                                         </div>
                                      </div>
                                   </td>
                                   {/* Position */}
                                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                      {getPositionName(player.pos ?? 0)}
                                   </td>
                                   {/* Status */}
                                   <td className="px-6 py-4 whitespace-nowrap">
                                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${player.st === 1 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : player.st === 0 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                                         {getStatusName(player.st ?? 0)}
                                      </span>
                                   </td>
                                   {/* Marktwert */}
                                   <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                                      {formatCurrency(player.mv ?? 0)}
                                   </td>
                                   {/* Avg Points */}
                                   <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                                      {player.ap ?? '-'}
                                   </td>
                                </tr>
                             ))
                          ) : (
                             <tr>
                                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">Keine Spieler gefunden.</td>
                             </tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>
            </>
          ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Keine Profildaten verfügbar.</p>
              </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Wrap with Suspense for useSearchParams
export default function TeamProfilePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}> 
            <TeamProfileContent />
        </Suspense>
    );
} 