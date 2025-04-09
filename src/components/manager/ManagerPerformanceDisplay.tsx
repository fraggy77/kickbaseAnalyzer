import React from 'react';
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Cell, Line } from 'recharts';

// Interfaces für Performance-Daten (könnten auch zentral definiert werden)
interface MatchdayPerformance { day: number; mdp: number; tw?: boolean; }
interface SeasonPerformance { sid: string; sn: string; pl: number; ap: number; tp: number; mdw: number; it: MatchdayPerformance[]; }

// Interface für die erwarteten Props
interface ManagerPerformanceDisplayProps {
  currentSeason: SeasonPerformance | null;
  chartData: any[]; // Typ könnte spezifischer sein: { day: number; mdp: number; ap: number; tw?: boolean }[]
  isLoading: boolean;
  error: string;
}

// Custom Tooltip (bleibt wie er war)
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


const ManagerPerformanceDisplay: React.FC<ManagerPerformanceDisplayProps> = ({
  currentSeason,
  chartData,
  isLoading,
  error
}) => {

  if (isLoading) {
    return <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">Lade Performance...</div>;
  }

  if (error) {
     return <div className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 p-4 rounded-md">{error}</div>;
  }

  if (!currentSeason) {
     return <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center text-gray-500 dark:text-gray-400">Keine Performance-Daten verfügbar.</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Saison-Statistiken */}
      <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
          Saison {currentSeason.sn}
        </h2>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div><span className="text-gray-500 dark:text-gray-400">Gesamtpunkte: </span><span className="font-semibold text-gray-900 dark:text-white">{currentSeason.tp.toLocaleString()}</span></div>
          <div><span className="text-gray-500 dark:text-gray-400">Durchschnitt: </span><span className="font-semibold text-gray-900 dark:text-white">{currentSeason.ap.toLocaleString()}</span></div>
          <div><span className="text-gray-500 dark:text-gray-400">Tagessiege: </span><span className="font-semibold text-green-600 dark:text-green-400">{currentSeason.mdw}</span></div>
        </div>
      </div>

      {/* Diagramm */}
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
  );
};

export default ManagerPerformanceDisplay;
