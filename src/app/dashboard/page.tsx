'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [leagueName, setLeagueName] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('selectedLeague');
      if (stored) {
        const parsed = JSON.parse(stored) as { id?: string; name?: string } | null;
        if (parsed?.id) setLeagueId(parsed.id);
        if (parsed?.name) setLeagueName(parsed.name);
      }
    } catch {}
  }, []);

  const go = (path: string) => {
    if (!leagueId) {
      alert('Bitte zuerst eine Liga auswählen.');
      router.push('/leagues');
      return;
    }
    const withQuery = `${path}?league=${leagueId}`;
    router.push(withQuery);
  };

  const logout = () => {
    localStorage.removeItem('kickbaseUser');
    localStorage.removeItem('selectedLeague');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Kickbase Analyzer – Dashboard
          </h1>
          <button onClick={logout} className="text-sm text-gray-600 dark:text-gray-300 hover:underline">
            Abmelden
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <div className="text-lg font-semibold">
            Liga: {leagueName ?? '–'}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => go('/league-table')}
              className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
            >
              Ligatabelle
            </button>
            <button
              onClick={() => go('/market')}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Markt
            </button>
            <button
              onClick={() => go('/manager-squad')}
              className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700"
            >
              Kader
            </button>
            <button
              onClick={() => go('/manager-overview')}
              className="px-4 py-2 rounded bg-amber-600 text-white hover:bg-amber-700"
            >
              Manager‑Übersicht
            </button>
          </div>

          {!leagueId && (
            <p className="text-sm text-gray-600">
              Keine Liga ausgewählt. Bitte zuerst zur <a href="/leagues" className="underline">Ligen‑Seite</a>.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
