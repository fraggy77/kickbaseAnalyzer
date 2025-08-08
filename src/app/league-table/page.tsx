'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type SelectedLeague = { id: string; name?: string; image?: string } | null;

function LeagueTableContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [league, setLeague] = useState<SelectedLeague>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Wichtig: Hooks wie useSearchParams nur hier verwenden (innerhalb der Suspense-Child-Komponente)
  useEffect(() => {
    // Versuche leagueId aus URL (?league=...) zu holen, ansonsten aus LocalStorage
    const leagueFromUrl = searchParams.get('league');
    if (leagueFromUrl) {
      const stored = localStorage.getItem('selectedLeague');
      if (stored) {
        const parsed = JSON.parse(stored) as SelectedLeague;
        if (parsed && parsed.id === leagueFromUrl) {
          setLeague(parsed);
        } else {
          setLeague({ id: leagueFromUrl });
        }
      } else {
        setLeague({ id: leagueFromUrl });
      }
      setIsLoading(false);
      return;
    }

    const stored = localStorage.getItem('selectedLeague');
    if (stored) {
      setLeague(JSON.parse(stored) as SelectedLeague);
      setIsLoading(false);
    } else {
      // Keine Liga bekannt -> zurück zur Ligen-Auswahl
      router.push('/leagues');
    }
  }, [router, searchParams]);

  if (isLoading) {
    return <div className="p-6">Lade Ligadaten…</div>;
  }

  if (!league) {
    return <div className="p-6">Keine Liga ausgewählt. Weiterleitung…</div>;
  }

  // Hinweis: Die eigentliche Tabellen-Anzeige kannst du hier einbauen.
  // Da useEffect erst im Browser läuft, blockiert das den Build nicht.
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Ligatabelle</h1>
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
        Ausgewählte Liga: <strong>{league.name ?? league.id}</strong>
      </p>

      {/* TODO: Hier könntest du clientseitig Daten laden und darstellen, z. B.:
          useEffect(() => {
            fetch(`/api/leagues/${league.id}/ranking`)
              .then(r => r.json())
              .then(data => setRanking(data));
          }, [league?.id]);
      */}

      <div className="rounded border border-gray-300 dark:border-gray-700 p-4">
        <p className="text-gray-600 dark:text-gray-300">Tabellendaten werden hier angezeigt.</p>
      </div>
    </div>
  );
}

export default function LeagueTablePage() {
  return (
    <Suspense fallback={<div className="p-6">Lade Ligatabelle…</div>}>
      <LeagueTableContent />
    </Suspense>
  );
}

