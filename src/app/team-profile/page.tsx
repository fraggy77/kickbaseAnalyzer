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
  oui?: number;    // Owner User ID
  onm?: string;    // Owner Name
  uim?: string;    // Owner User Image path
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
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null); // State for selected league
  const [selectedLeagueImage, setSelectedLeagueImage] = useState<string | null>(null); // State for selected league image

  useEffect(() => {
    // Get selected league info from localStorage for the header link
    const storedLeague = localStorage.getItem('selectedLeague');
    if (storedLeague) {
        try {
            const league = JSON.parse(storedLeague);
            setSelectedLeagueId(league.id);
            setSelectedLeagueImage(league.image);
        } catch (e) {
            console.error("Error parsing selectedLeague for TeamProfile header:", e);
        }
    }

    if (!teamId) {
      setError('Team ID fehlt in der URL.');
      setIsLoading(false);
      return;
    }

    const loadProfile = async () => {
      setIsLoading(true);
      setError('');
      try {
        // Check if leagueId is available before fetching
        if (!selectedLeagueId) {
            setError('Liga ID nicht im Speicher gefunden. Bitte wähle eine Liga im Dashboard aus.');
            setIsLoading(false);
            return;
        }
        console.log(`[TeamProfilePage] Fetching profile for team ID: ${teamId} in league ID: ${selectedLeagueId}`);
        // Assuming competition ID 1 for Bundesliga, pass leagueId as a query param
        // The backend route will need to be adjusted to read this leagueId
        const data = await kickbaseAPI.getTeamProfile('1', teamId, selectedLeagueId); 
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

    // Check auth and leagueId before loading
    const storedUser = localStorage.getItem('kickbaseUser');
    if (storedUser && selectedLeagueId) { // Ensure leagueId is loaded before trying to fetch
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
    } else if (!selectedLeagueId && !isLoading) {
         // Handle case where localStorage has user but no leagueId yet (wait for effect)
         if (!storedUser) {
            setError("Nicht eingeloggt.");
            setIsLoading(false);
         }
         // If user exists, the useEffect will re-run once selectedLeagueId is set
    } else if (!storedUser) {
         setError("Nicht eingeloggt.");
         setIsLoading(false);
        // router.push('/'); // Optional redirect
    }

  }, [teamId, router, selectedLeagueId]); // Add selectedLeagueId to dependency array

  const handleBack = () => { router.back(); };

  // Helper to safely get image URL (can handle player or user images)
  const getImageUrl = (path?: string, userId?: string | number) => {
    if (!path) return '/placeholder.png';
    if (path.startsWith('http') || path.startsWith('/')) return path;
    // Check if it's likely a user image path that needs the ID
    if (userId && !path.includes('/')) { // Simple filename like profile.png for user
        return `${CDN_BASE_URL}user/${userId}/${path}`;
    } 
    // Assume other paths are relative to base (player images, flags etc.)
    return `${CDN_BASE_URL}${path}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white dark:bg-gray-850 shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          {/* Left side: League Logo (clickable) + Team Name */}
          <div className="flex items-center space-x-3">
              {selectedLeagueId && selectedLeagueImage && (
                  <button onClick={() => router.push(`/dashboard?league=${selectedLeagueId}`)} title="Zum Liga-Dashboard">
                      <img 
                          src={selectedLeagueImage} 
                          alt="Liga Logo" 
                          className="h-10 w-10 rounded-md object-cover hover:opacity-80 transition-opacity"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                  </button>
              )}
              {/* Display Actual Team Logo from Profile */}
              {profile?.tim && (
                  <img src={`${CDN_BASE_URL}${profile.tim}`} alt={profile.tn} className="h-8 w-8 object-contain"/> 
              )}
              <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                  {profile?.tn || 'Team Profil'}
              </h1>
          </div>
          {/* Right side: Back Button */}
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
                             <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Besitzer</th>
                             <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Position</th>
                             <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                             <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Marktwert</th>
                             <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ø Punkte</th>
                          </tr>
                       </thead>
                       <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {profile.it && profile.it.length > 0 ? (
                             profile.it.map((player) => {
                                 // Prepare query params for player page
                                 const queryParams = new URLSearchParams({
                                     id: player.i || '',
                                     // firstName not available in this API response
                                     lastName: player.n || '', // 'n' is lastName here
                                     teamId: player.tid || profile.tid || '',
                                     leagueId: '', // <-- No user league context here, pass empty
                                     position: (player.pos ?? 0).toString(),
                                     status: (player.st ?? 0).toString(),
                                     marketValue: (player.mv ?? 0).toString(),
                                     points: '-', // Total points (p) not in this player object
                                     avgPoints: (player.ap ?? '-').toString(),
                                     playerImage: player.pim || '',
                                     mvt: (player.mvt ?? -1).toString(),
                                 });

                                // Add selectedLeagueId to player link params if available
                                if(selectedLeagueId) {
                                    queryParams.set('leagueId', selectedLeagueId);
                                }

                                return (
                                    <tr 
                                      key={player.i} 
                                    >
                                      {/* Spieler -> Clickable */}
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <button 
                                          onClick={() => router.push(`/player?${queryParams.toString()}`)}
                                          className="flex items-center group text-left w-full hover:bg-gray-50 dark:hover:bg-gray-700/50 p-1 rounded transition-colors"
                                          title={`${player.n} Details`} // Assuming 'n' is primary identifier
                                        >
                                            <div className="flex-shrink-0 h-10 w-10 mr-3">
                                                <img
                                                className="h-10 w-10 rounded-full object-cover"
                                                src={getImageUrl(player.pim)}
                                                alt={player.n}
                                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.png'; }}
                                                />
                                            </div>
                                            <div className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                                {player.n} {/** Assuming 'n' is LastName */}
                                            </div>
                                         </button>
                                      </td>
                                      {/* Owner Cell - ADDED */}
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {player.onm && player.oui ? (
                                            <button 
                                                onClick={() => router.push(`/manager-squad?league=${selectedLeagueId}&user=${player.oui}`)}
                                                className="flex items-center space-x-2 group text-left w-full hover:bg-gray-50 dark:hover:bg-gray-700/50 p-1 rounded transition-colors disabled:opacity-50 disabled:pointer-events-none"
                                                title={`${player.onm} Kader`}
                                                disabled={!selectedLeagueId} // Disable if no league context
                                            >
                                                <img 
                                                    src={getImageUrl(player.uim, player.oui)} // Use helper for user image
                                                    alt={player.onm}
                                                    className="h-5 w-5 rounded-full flex-shrink-0 object-cover"
                                                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none';}} // Hide broken image
                                                />
                                                <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">{player.onm}</span>
                                            </button>
                                        ) : (
                                            <span className="italic">Kickbase</span>
                                        )}
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
                                 )
                             })
                          ) : (
                             <tr>
                                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">Keine Spieler gefunden.</td>
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