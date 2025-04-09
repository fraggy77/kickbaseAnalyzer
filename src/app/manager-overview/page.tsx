'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { kickbaseAPI, Player } from '@/lib/kickbase-api'; // Player Interface importieren
import { formatCurrency } from '@/utils/formatting.utils';
import { getTeamData } from '@/utils/teamMapping'; // getTeamData importieren
import { BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Cell } from 'recharts'; // Recharts Imports

// --- Interfaces (aus manager-squad und manager-performance kopiert/kombiniert) ---
interface ManagerInfo {
  id: string;
  name: string;
  profileImage?: string;
  teamValue: number;
}

interface MatchdayPerformance {
  day: number; mdp: number; tw?: boolean;
}
interface SeasonPerformance {
  sid: string; sn: string; pl: number; ap: number; tp: number; mdw: number; it: MatchdayPerformance[];
}
interface ManagerPerformanceData {
  u: string; unm: string; st?: number; it: SeasonPerformance[];
}
// --- Ende Interfaces ---

// --- Hilfsfunktionen (aus manager-squad und manager-performance kopiert) ---
// Funktion zum Normalisieren der Spielerdaten (aus manager-squad)
const normalizePlayerData = (players: any[]): Player[] => {
  return players.map(p => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    number: p.number,
    position: p.position, // Annahme: position ist direkt vorhanden oder muss gemappt werden
    status: p.status,
    teamId: p.teamId,
    marketValue: p.marketValue,
    points: p.totalPoints,
    profileImage: p.profileBig, // Oder p.profile, je nachdem, was benötigt wird
    teamName: getTeamData(p.teamId)?.name || 'Unbekannt', // Teamnamen holen
    teamLogo: getTeamData(p.teamId)?.logo || '', // Teamlogo holen
  }));
};

// Custom Tooltip für Recharts (aus manager-performance)
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 shadow rounded border border-gray-200 dark:border-gray-700">
          <p className="label font-bold">{`Spieltag ${label}`}</p>
          <p className="intro text-blue-600 dark:text-blue-400">{`Punkte: ${data.mdp}`}</p>
          <p className="desc text-gray-500 dark:text-gray-400">{`Durchschnitt: ${data.ap}`}</p>
          {data.tw && <p className="text-green-600 dark:text-green-400 font-semibold">Tagessieg!</p>}
        </div>
      );
    }
    return null;
};
// --- Ende Hilfsfunktionen ---


export default function ManagerOverviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leagueId = searchParams.get('league');
  const userId = searchParams.get('user');

  const [activeTab, setActiveTab] = useState<'squad' | 'performance' | 'achievements'>('squad');

  // State für Squad-Daten
  const [players, setPlayers] = useState<Player[]>([]);
  const [managerInfo, setManagerInfo] = useState<ManagerInfo | null>(null);
  const [isLoadingSquad, setIsLoadingSquad] = useState(true);
  const [squadError, setSquadError] = useState('');

  // State für Performance-Daten
  const [performanceData, setPerformanceData] = useState<ManagerPerformanceData | null>(null);
  const [currentSeason, setCurrentSeason] = useState<SeasonPerformance | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoadingPerformance, setIsLoadingPerformance] = useState(true);
  const [performanceError, setPerformanceError] = useState('');


  useEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem('kickbaseUser');
      if (!storedUser) { router.push('/'); return false; }
      try {
        const { token, email } = JSON.parse(storedUser);
        kickbaseAPI.token = token; kickbaseAPI.email = email;
        // Optional: Store userId if needed elsewhere, e.g., kickbaseAPI.userId = userIdFromToken;
        return true;
      } catch (error) { console.error('Auth Error:', error); localStorage.removeItem('kickbaseUser'); router.push('/'); return false; }
    };

    if (!leagueId || !userId) {
      setSquadError('Liga- oder Benutzer-ID fehlt.');
      setPerformanceError('Liga- oder Benutzer-ID fehlt.');
      setIsLoadingSquad(false);
      setIsLoadingPerformance(false);
      return;
    }

    if (checkAuth()) {
      loadAllManagerData();
    }
  }, [leagueId, userId, router]);

  const loadAllManagerData = async () => {
    if (!leagueId || !userId) return;

    setIsLoadingSquad(true);
    setIsLoadingPerformance(true);
    setSquadError('');
    setPerformanceError('');

    try {
      // Lade Squad-Daten
      const squadPromise = kickbaseAPI.getManagerSquad(leagueId, userId)
        .then(data => {
          console.log('Squad Daten geladen:', data);
          const normalizedPlayers = normalizePlayerData(data.players || []);
          const totalValue = normalizedPlayers.reduce((sum, p) => sum + p.marketValue, 0);
          setPlayers(normalizedPlayers);
          setManagerInfo({
            id: data.manager.id,
            name: data.manager.name,
            profileImage: data.manager.profileUrl,
            teamValue: totalValue
          });
        })
        .catch(error => {
          console.error('Fehler beim Laden der Squad-Daten:', error);
          setSquadError(`Kader konnte nicht geladen werden: ${error.message}`);
           if (error.message.includes('401') || error.message.includes('Unauthoriz')) throw error; // Re-throw auth error
        })
        .finally(() => setIsLoadingSquad(false));


      // Lade Performance-Daten
      const performancePromise = kickbaseAPI.getManagerPerformance(leagueId, userId)
        .then(data => {
            console.log('Performance Daten geladen:', data);
            setPerformanceData(data);
            const latestSeason = data.it?.length > 0 ? data.it[data.it.length - 1] : null;
            if (latestSeason) {
              console.log('Aktuellste Saison gefunden:', latestSeason.sn);
              setCurrentSeason(latestSeason);
              const preparedData = latestSeason.it.map(dayPerf => ({
                day: dayPerf.day, mdp: dayPerf.mdp, ap: latestSeason.ap, tw: dayPerf.tw
              }));
              setChartData(preparedData);
            } else {
              console.warn('Keine Saisondaten gefunden.');
              setPerformanceError('Keine Saisondaten für diesen Manager gefunden.');
            }
        })
        .catch(error => {
            console.error('Fehler beim Laden der Performance-Daten:', error);
            setPerformanceError(`Performance konnte nicht geladen werden: ${error.message}`);
             if (error.message.includes('401') || error.message.includes('Unauthoriz')) throw error; // Re-throw auth error
        })
        .finally(() => setIsLoadingPerformance(false));

      // Warte auf beide Ladevorgänge
      await Promise.all([squadPromise, performancePromise]);

    } catch (error: any) {
      // Globaler Fehler (z.B. Auth)
      console.error('Fehler beim Laden der Manager-Daten:', error);
      if (error.message.includes('401') || error.message.includes('Unauthoriz')) {
        localStorage.removeItem('kickbaseUser');
        router.push('/');
      }
      // Setze Fehler für beide Bereiche, falls nicht schon spezifisch gesetzt
      if (!squadError) setSquadError('Allgemeiner Ladefehler.');
      if (!performanceError) setPerformanceError('Allgemeiner Ladefehler.');
      setIsLoadingSquad(false); // Sicherstellen, dass Loading beendet wird
      setIsLoadingPerformance(false);
    }
  };

   const handleBack = () => {
    router.push(`/league-table?league=${leagueId}`); // Zurück zur Tabelle
  };


  // --- Render-Logik ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800">
      {/* --- Header --- */}
       <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
         <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
           <h1 className="text-xl font-bold text-gray-900 dark:text-white">
             Manager: {managerInfo?.name || '...'}
           </h1>
           <button onClick={handleBack} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
             Zurück zur Tabelle
           </button>
         </div>
         {/* --- Tabs --- */}
         <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 px-4 sm:px-6 lg:px-8" aria-label="Tabs">
                 <button
                    onClick={() => setActiveTab('squad')}
                    className={`${
                      activeTab === 'squad'
                        ? 'border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-300'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
                    } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                  >
                    Kader
                  </button>
                   <button
                     onClick={() => setActiveTab('performance')}
                    className={`${
                      activeTab === 'performance'
                        ? 'border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-300'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
                    } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                  >
                    Performance
                  </button>
                   <button
                     onClick={() => setActiveTab('achievements')}
                    className={`${
                      activeTab === 'achievements'
                        ? 'border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-300'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
                    } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                    disabled // Deaktiviert, bis implementiert
                  >
                    Achievements (soon)
                  </button>
            </nav>
         </div>
       </header>

      {/* --- Tab Content --- */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">

          {/* == Squad Tab Content == */}
          {activeTab === 'squad' && (
            <div>
              {isLoadingSquad ? (
                 <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">Lade Kader...</div>
              ) : squadError ? (
                <div className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 p-4 rounded-md">{squadError}</div>
              ) : (
                <>
                  {/* Manager Info (aus manager-squad kopiert) */}
                  {managerInfo && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 overflow-hidden">
                      <div className="px-6 py-5 flex items-center space-x-4">
                        {managerInfo.profileImage ? (
                          <img src={managerInfo.profileImage} alt={`${managerInfo.name} Profilbild`} className="h-16 w-16 rounded-full object-cover ring-2 ring-offset-2 ring-green-500 dark:ring-offset-gray-800" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/64'; }}/>
                        ) : (
                           <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800"> <svg /* ... Placeholder Icon ... */ /> </div>
                        )}
                        <div>
                          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{managerInfo.name}</h2>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Gesamtwert: {formatCurrency(managerInfo.teamValue)}</p>
                          {/* Hier könnte man später Budget etc. hinzufügen, falls verfügbar */}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Player List (aus manager-squad kopiert) */}
                   <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                     <h3 className="text-lg font-medium text-gray-900 dark:text-white px-6 py-4 border-b border-gray-200 dark:border-gray-700">Spielerliste ({players.length})</h3>
                     <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
                       {players.sort((a, b) => b.marketValue - a.marketValue).map((player) => (
                         <li key={player.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                           <div className="flex items-center space-x-3">
                             {player.profileImage && <img className="h-10 w-10 rounded-full object-contain" src={player.profileImage} alt="" />}
                             {player.teamLogo && <img className="h-6 w-6" src={player.teamLogo} alt={player.teamName} title={player.teamName} />}
                             <div>
                               <p className="text-sm font-medium text-gray-900 dark:text-white">{player.firstName} {player.lastName}</p>
                               <p className="text-xs text-gray-500 dark:text-gray-400">Position: {player.position} | Punkte: {player.points}</p>
                             </div>
                           </div>
                           <span className="text-sm font-semibold text-green-600 dark:text-green-400">{formatCurrency(player.marketValue)}</span>
                         </li>
                       ))}
                     </ul>
                   </div>
                </>
              )}
            </div>
          )}

          {/* == Performance Tab Content == */}
           {activeTab === 'performance' && (
             <div>
               {isLoadingPerformance ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">Lade Performance...</div>
               ) : performanceError ? (
                 <div className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 p-4 rounded-md">{performanceError}</div>
               ) : currentSeason ? (
                 <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                    {/* Saison-Statistiken (aus manager-performance kopiert) */}
                    <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                      <h2 className="text-lg font-medium text-gray-900 dark:text-white">Saison {currentSeason.sn}</h2>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        {/* ... Gesamtpunkte, Durchschnitt, Tagessiege ... */}
                         <div><span className="text-gray-500 dark:text-gray-400">Gesamtpunkte: </span><span className="font-semibold text-gray-900 dark:text-white">{currentSeason.tp.toLocaleString()}</span></div>
                        <div><span className="text-gray-500 dark:text-gray-400">Durchschnitt: </span><span className="font-semibold text-gray-900 dark:text-white">{currentSeason.ap.toLocaleString()}</span></div>
                        <div><span className="text-gray-500 dark:text-gray-400">Tagessiege: </span><span className="font-semibold text-green-600 dark:text-green-400">{currentSeason.mdw}</span></div>
                      </div>
                    </div>
                    {/* Diagramm (aus manager-performance kopiert) */}
                    <div className="px-6 py-5 h-96">
                       <ResponsiveContainer width="100%" height="100%">
                         <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                           <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                           <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#6b7280' }} label={{ value: 'Spieltag', position: 'insideBottom', offset: -5, fontSize: 12, fill: '#6b7280' }} />
                           <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                           <Tooltip content={<CustomTooltip />} />
                           <Legend wrapperStyle={{ fontSize: '14px' }} />
                           <Bar dataKey="mdp" name="Punkte Spieltag" barSize={20}>
                             {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.tw ? '#f59e0b' : '#3b82f6'} />))}
                           </Bar>
                           <Line type="monotone" dataKey="ap" name="Durchschnitt" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                         </ComposedChart>
                       </ResponsiveContainer>
                    </div>
                 </div>
               ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center text-gray-500 dark:text-gray-400">Keine Performance-Daten verfügbar.</div>
               )}
             </div>
           )}

          {/* == Achievements Tab Content == */}
          {activeTab === 'achievements' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">Achievements werden hier bald angezeigt...</p>
              {/* Hier könnte später der Inhalt für Achievements geladen und angezeigt werden */}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
