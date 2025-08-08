'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { kickbaseAPI } from '@/lib/kickbase-api';

// Du kannst hier später echte Typen einsetzen
type SelectedLeague = { id: string; name?: string; image?: string } | null;

function ManagerOverviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [league, setLeague] = useState<SelectedLeague>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [managers, setManagers] = useState<any[]>([]); // TODO: typisieren

  useEffect(() => {
    const init = async () => {
      try {
        // Auth wiederherstellen
        const storedUser = localStorage.getItem('kickbaseUser');
        if (!storedUser) {
          router.push('/');
          return;
        }
        const { token, id, email } = JSON.parse(storedUser);
        kickbaseAPI.token = token;
        kickbaseAPI.userId = id;
        kickbaseAPI.email = email;

        // Liga aus URL oder LocalStorage
        const leagueFromUrl = searchParams.get('league');
        if (leagueFromUrl) {
          const storedSelected = localStorage.getItem('selectedLeague');
          if (storedSelected) {
            const parsed = JSON.parse(storedSelected) as SelectedLeague;
            setLeague(parsed?.id === leagueFromUrl ? parsed : { id: leagueFromUrl });
          } else {
            setLeague({ id: leagueFromUrl });
          }
        } else {
          const storedSelected = localStorage.getItem('selectedLeague');
          if (storedSelected) {
            setLeague(JSON.parse(storedSelected) as SelectedLeague);
          } else {
            router.push('/leagues');
            return;
          }
        }

        // Beispiel: Managerdaten laden (falls eine API-Route existiert)
        // try { const data = await fetch(`/api/leagues/${leagueId}/managers`).then(r => r.json()); setManagers(data); } catch {}
      } catch (e) {
        console.error('Fehler in ManagerOverview init:', e);
        setError('Konnte Managerdaten nicht laden.');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [router, searchParams]);

  const handleBack = () => router.push('/leagues');

  if (isLoading) {
    return <div className="p-6">Lade Manager-Übersicht…</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }
  if (!league) {
    return <div className="p-6">Keine Liga ausgewählt. Weiterleitung…</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Manager-Übersicht</h1>
          <button
            onClick={handleBack}
            className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            Zurück zu Ligen
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Liga: {league.name ?? league.id}
          </h2>

          {/* Placeholder-Liste bis echte Daten angebunden sind */}
          {managers.length === 0 ? (
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
              Noch keine Managerdaten geladen.
            </p>
          ) : (
            <ul className="mt-4 list-disc ml-6 text-gray-900 dark:text-white">
              {managers.map((m) => (
                <li key={m.id}>{m.name}</li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ManagerOverviewPage() {
  return (
    <Suspense fallback={<div className="p-6">Lade Manager-Übersicht…</div>}>
      <ManagerOverviewContent />
    </Suspense>
  );
}

