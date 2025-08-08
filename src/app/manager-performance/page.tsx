'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { kickbaseAPI } from '@/lib/kickbase-api';

type SelectedLeague = { id: string; name?: string; image?: string } | null;

function ManagerPerformanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [league, setLeague] = useState<SelectedLeague>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('kickbaseUser');
      if (!storedUser) {
        router.push('/');
        return;
      }
      const { token, id, email } = JSON.parse(storedUser);
      kickbaseAPI.token = token;
      kickbaseAPI.userId = id;
      kickbaseAPI.email = email;

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
    } catch (e) {
      console.error('Fehler in manager-performance init:', e);
      setError('Konnte Manager-Performance nicht initialisieren.');
    } finally {
      setIsLoading(false);
    }
  }, [router, searchParams]);

  if (isLoading) return <div className="p-6">Lade Manager-Performance…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!league) return <div className="p-6">Keine Liga ausgewählt. Weiterleitung…</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Manager-Performance – {league.name ?? league.id}
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          {/* TODO: Hier später deine Charts & Daten laden/anzeigen */}
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Platzhalter – Performance-Diagramme folgen.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function ManagerPerformancePage() {
  return (
    <Suspense fallback={<div className="p-6">Lade Manager-Performance…</div>}>
      <ManagerPerformanceContent />
    </Suspense>
  );
}

