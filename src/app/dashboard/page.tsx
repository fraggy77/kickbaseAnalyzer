'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { kickbaseAPI } from '@/lib/kickbase-api';

type SelectedLeague = { id: string; name?: string; image?: string } | null;

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [league, setLeague] = useState<SelectedLeague>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Auth + League aus LocalStorage/URL herstellen
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

      // League aus URL ?league=... oder fallback LocalStorage
      const leagueFromUrl = searchParams.get('league');
      if (leagueFromUrl) {
        const storedSelected = localStorage.getItem('selectedLeague');
        if (storedSelected) {
          const parsed = JSON.parse(storedSelected) as SelectedLeague;
          if (parsed && parsed.id === leagueFromUrl) {
            setLeague(parsed);
          } else {
            setLeague({ id: leagueFromUrl });
          }
        } else {
          setLeague({ id: leagueFromUrl });
        }
      } else {
        const storedSelected = localStorage.getItem('selectedLeague');
        if (storedSelected) {
          setLeague(JSON.parse(storedSelected) as SelectedLeague);
        } else {
          // Keine Liga -> zur Ligen-Auswahl
          router.push('/leagues');
          return;
        }
      }
    } catch (e) {
      console.error('Fehler beim Initialisieren des Dashboards:', e);
      setError('Konnte das Dashboard nicht initialisieren.');
    } finally {
      setIsLoading(false);
    }
  }, [router, searchParams]);

  const handleLogout = () => {
    localStorage.removeItem('kickbaseUser');
    localStorage.removeItem('selectedLeague');
    sessionStorage.removeItem('pendingLeagues');
    kickbaseAPI.token = null;
    kickbaseAPI.userId = null;
    kickbaseAPI.email = null;
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center">
          <svg className="animate-spin h-6 w-6 mr-2" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0..." />
          </svg>
          Dashboard wird geladen…
        </div>
      </div>
    );
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Kickbase Analyzer – Dashboard</h1>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            Abmelden
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Liga: {league.name ?? league.id}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Hier könntest du Manager-, Team- oder Markt-Daten laden.
          </p>
          {/* TODO: Falls du vorher schon Widgets hattest, bauen wir die hier wieder rein. */}
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-6">Lade Dashboard…</div>}>
      <DashboardContent />
    </Suspense>
  );
}
