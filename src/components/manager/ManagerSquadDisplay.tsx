import React from 'react';
import { Player } from '@/lib/kickbase-api';
import { formatCurrency } from '@/utils/formatting.utils';
import { getTeamData } from '@/utils/teamMapping'; // Importieren

// Interface für die erwarteten Props
interface ManagerSquadDisplayProps {
  players: Player[];
  managerInfo: {
    id: string;
    name: string;
    profileImage?: string;
    teamValue: number;
  } | null;
  isLoading: boolean;
  error: string;
}

// Funktion zum Normalisieren hierher verschoben oder importiert lassen, wenn sie in overview bleibt
const normalizePlayerDataIfNeeded = (players: any[]): Player[] => {
 // Diese Funktion wird jetzt in manager-overview aufgerufen, bevor die Daten übergeben werden.
 // Wir können sie hier entfernen, wenn die `players`-Prop bereits normalisiert ist.
 // Oder wir behalten sie zur Sicherheit hier, falls unnormalisierte Daten kämen.
 // Fürs Erste nehmen wir an, die Prop `players` IST bereits normalisiert.
  return players as Player[]; // Einfache Typzusicherung, wenn die Prop schon stimmt
};


const ManagerSquadDisplay: React.FC<ManagerSquadDisplayProps> = ({
  players: initialPlayers, // Nennen wir es initialPlayers, falls wir hier doch normalisieren
  managerInfo,
  isLoading,
  error
}) => {

  // Wenn wir hier normalisieren müssten:
  // const players = normalizePlayerDataIfNeeded(initialPlayers);
  // Sonst direkt:
  const players = initialPlayers; // Annahme: Prop ist bereits normalisiert

  if (isLoading) {
    return <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">Lade Kader...</div>;
  }

  if (error) {
    return <div className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 p-4 rounded-md">{error}</div>;
  }

  return (
    <>
      {/* Manager Info */}
      {managerInfo && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 overflow-hidden">
          <div className="px-6 py-5 flex items-center space-x-4">
            {managerInfo.profileImage ? (
              <img src={managerInfo.profileImage} alt={`${managerInfo.name} Profilbild`} className="h-16 w-16 rounded-full object-cover ring-2 ring-offset-2 ring-green-500 dark:ring-offset-gray-800" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/64'; }}/>
            ) : (
               <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800"> {/* Placeholder Icon */}
                <svg className="h-8 w-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{managerInfo.name}</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Gesamtwert: {formatCurrency(managerInfo.teamValue)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Player List */}
       <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
         <h3 className="text-lg font-medium text-gray-900 dark:text-white px-6 py-4 border-b border-gray-200 dark:border-gray-700">Spielerliste ({players.length})</h3>
         <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
           {players.sort((a, b) => b.marketValue - a.marketValue).map((player) => (
             <li key={player.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
               <div className="flex items-center space-x-3">
                 {player.profileImage && <img className="h-10 w-10 rounded-full object-contain bg-gray-100 dark:bg-gray-600" src={player.profileImage} alt={`${player.firstName} ${player.lastName}`} />}
                 {player.teamLogo && <img className="h-6 w-6" src={player.teamLogo} alt={player.teamName} title={player.teamName} />}
                 <div>
                   <p className="text-sm font-medium text-gray-900 dark:text-white">{player.firstName} {player.lastName}</p>
                   <p className="text-xs text-gray-500 dark:text-gray-400">Pos: {player.position} | Pkt: {player.points}</p> {/* Kürzer für mehr Platz */}
                 </div>
               </div>
               <span className="text-sm font-semibold text-green-600 dark:text-green-400">{formatCurrency(player.marketValue)}</span>
             </li>
           ))}
         </ul>
       </div>
    </>
  );
};

export default ManagerSquadDisplay;
