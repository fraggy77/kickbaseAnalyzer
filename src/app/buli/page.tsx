'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { kickbaseAPI } from '@/lib/kickbase-api';
import type { CompetitionTable, BundesligaTeam } from '@/types/buli.types';

function BuliContent() {
  const searchParams = useSearchParams();
  const [table, setTable] = useState<CompetitionTable | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadTable = async () => {
      try {
        const competitionId = searchParams.get('competitionId') || 'BL1';
        const data = await kickbaseAPI.getCompetitionTable(competitionId);
        setTable(data);
      } catch (e) {
        console.error('Fehler beim Laden der Tabelle:', e);
        setError('Tabelle konnte nicht geladen werden.');
      }
    };
    loadTable();
  }, [searchParams]);

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!table) return <div className="p-6">Lade Bundesliga-Tabelle…</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Bundesliga Tabelle</h1>
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr>
            <th className="border border-gray-300 px-2 py-1 text-left">Platz</th>
            <th className="border border-gray-300 px-2 py-1 text-left">Team</th>
            <th className="border border-gray-300 px-2 py-1 text-right">Punkte</th>
          </tr>
        </thead>
        <tbody>
          {table.teams.map((team: BundesligaTeam, i) => (
            <tr key={team.id}>
              <td className="border border-gray-300 px-2 py-1">{i + 1}</td>
              <td className="border border-gray-300 px-2 py-1">{team.name}</td>
              <td className="border border-gray-300 px-2 py-1 text-right">{team.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BuliPage() {
  return (
    <Suspense fallback={<div className="p-6">Lade Bundesliga-Daten…</div>}>
      <BuliContent />
    </Suspense>
  );
}
