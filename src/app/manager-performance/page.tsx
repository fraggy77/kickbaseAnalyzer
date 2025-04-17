'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { kickbaseAPI } from '@/lib/kickbase-api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Cell } from 'recharts';

// Interface für einen Spieltagseintrag
interface MatchdayPerformance {
  day: number;
  mdp: number; // MatchDay Points
  tw?: boolean; // Tagessieg
}

// Interface für eine Saison
interface SeasonPerformance {
  sid: string;
  sn: string; // Season Name
  pl: number; // Platzierung (am Ende der Saison?)
  ap: number; // Average Points
  tp: number; // Total Points
  mdw: number; // MatchDay Wins
  it: MatchdayPerformance[]; // Array der Spieltage
}

// Interface für die gesamte Performance-Antwort
interface ManagerPerformanceData {
  u: string; // User ID
  unm: string; // User Name
  st?: number; // Status?
  it: SeasonPerformance[]; // Array der Saisons
}

// Rename interface to match expected type
interface ManagerPerformanceData {
    leagueName?: string;
    managerName?: string;
    performanceHistory?: { date: string; value: number }[]; 
}

function ManagerPerformanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leagueId = searchParams.get('league');
  const userId = searchParams.get('user');

  const [performanceData, setPerformanceData] = useState<ManagerPerformanceData | null>(null);
  const [currentSeason, setCurrentSeason] = useState<SeasonPerformance | null>(null);
  const [chartData, setChartData] = useState<any[]>([]); // Daten für das Diagramm
  const [managerName, setManagerName] = useState<string>('...');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [leagueImage, setLeagueImage] = useState<string | null>(null); // State for league image

  useEffect(() => {
    // Get selected league image from localStorage
    if (leagueId) {
      const storedLeague = localStorage.getItem('selectedLeague');
      if (storedLeague) {
        try {
          const league = JSON.parse(storedLeague);
          if (league.id === leagueId) {
            setLeagueImage(league.image);
          }
        } catch (e) {
          console.error("Error parsing selectedLeague for Perf header:", e);
        }
      }
    }

    const checkAuth = () => { // Auth-Check bleibt gleich
      const storedUser = localStorage.getItem('kickbaseUser');
      if (!storedUser) { router.push('/'); return false; }
      try {
        const { token, email } = JSON.parse(storedUser);
        kickbaseAPI.token = token;
        kickbaseAPI.email = email;
        return true;
      } catch (error) { console.error('Auth Error:', error); localStorage.removeItem('kickbaseUser'); router.push('/'); return false; }
    };

    if (!leagueId || !userId) {
      setError('Liga- oder Benutzer-ID fehlt.');
      setIsLoading(false);
      return;
    }

    if (checkAuth()) {
      loadPerformanceData();
    }
  }, [leagueId, userId, router]);

  const loadPerformanceData = async () => {
    if (!leagueId || !userId) return;

    try {
      setIsLoading(true);
      setError('');

      const data: ManagerPerformanceData = await kickbaseAPI.getManagerPerformance(leagueId, userId);
      console.log('Performance Daten geladen:', data);
      setPerformanceData(data);
      setManagerName(data.unm || 'Unbekannter Manager');

      // Finde die letzte Saison (höchste sid oder spezifischer Name)
      // Hier nehmen wir an, die letzte im Array ist die aktuellste
      const latestSeason = data.it?.length > 0 ? data.it[data.it.length - 1] : null;

      if (latestSeason) {
        console.log('Aktuellste Saison gefunden:', latestSeason.sn);
        setCurrentSeason(latestSeason);

        // Bereite Daten für Recharts vor: [{ day: 1, mdp: 123, ap: 456 }, ...]
        const preparedData = latestSeason.it.map(dayPerf => ({
          day: dayPerf.day,
          mdp: dayPerf.mdp,
          ap: latestSeason.ap, // Füge Durchschnittspunkte zu jedem Punkt hinzu für die Linie
          tw: dayPerf.tw // Tagessieg-Info behalten
        }));
        setChartData(preparedData);

      } else {
        console.warn('Keine Saisondaten gefunden.');
        setError('Keine Saisondaten für diesen Manager gefunden.');
      }

    } catch (error: any) {
      console.error('Fehler beim Laden der Performance-Daten:', error);
      setError(`Performance konnte nicht geladen werden: ${error.message}`);
      if (error.message.includes('401') || error.message.includes('Unauthoriz')) {
        localStorage.removeItem('kickbaseUser');
        router.push('/');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    // Zurück zur Manager-Squad-Seite oder Liga-Tabelle? Hier zur Tabelle
    router.push(`/league-table?league=${leagueId}`);
  };

  // Custom Tooltip für Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload; // Die Daten des aktuellen Punktes
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-pink-50 dark:from-indigo-950 dark:to-pink-950">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {leagueId && leagueImage && (
              <button onClick={() => router.push(`/dashboard?league=${leagueId}`)} title="Zum Liga-Dashboard">
                <img 
                  src={leagueImage} 
                  alt="Liga Logo" 
                  className="h-10 w-10 rounded-md object-cover hover:opacity-80 transition-opacity"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              </button>
            )}
            <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
              Performance: {managerName}
            </h1>
          </div>
          <button onClick={handleBack} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            Zurück zur Tabelle
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {isLoading ? (
             <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex justify-center"> {/* Loading Spinner */}
              <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Performance wird geladen...</span>
            </div>
          ) : error ? (
             <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"> {/* Error Message */}
               <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          ) : currentSeason ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
               {/* Saison-Statistiken */}
               <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                 <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                   Saison {currentSeason.sn}
                 </h2>
                 <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                       <span className="text-gray-500 dark:text-gray-400">Gesamtpunkte: </span>
                       <span className="font-semibold text-gray-900 dark:text-white">{currentSeason.tp.toLocaleString()}</span>
                    </div>
                    <div>
                       <span className="text-gray-500 dark:text-gray-400">Durchschnitt: </span>
                       <span className="font-semibold text-gray-900 dark:text-white">{currentSeason.ap.toLocaleString()}</span>
                    </div>
                    <div>
                       <span className="text-gray-500 dark:text-gray-400">Tagessiege: </span>
                       <span className="font-semibold text-green-600 dark:text-green-400">{currentSeason.mdw}</span>
                    </div>
                 </div>
               </div>

              {/* Diagramm */}
              <div className="px-6 py-5 h-96"> {/* Feste Höhe für das Diagramm */}
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#6b7280' }} label={{ value: 'Spieltag', position: 'insideBottom', offset: -5, fontSize: 12, fill: '#6b7280' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '14px' }} />
                    <Bar dataKey="mdp" name="Punkte Spieltag" barSize={20}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.tw ? '#10b981' : '#3b82f6'} />
                      ))}
                    </Bar>
                    <Line type="monotone" dataKey="ap" name="Durchschnitt" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
             <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <p className="text-center text-gray-500 dark:text-gray-400">Keine Performance-Daten verfügbar.</p>
             </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default ManagerPerformanceContent;
