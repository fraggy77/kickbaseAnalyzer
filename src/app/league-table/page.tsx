'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

type RankingRow = {
  userId: string;
  userName: string;
  points: number;
  position: number;
  avatar?: string;
};

function LeagueTableContent() {
  const router = useRouter();
  const sp = useSearchParams();

  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [err, setErr] = useState<string>('');

  // 1) League-ID ermitteln (URL ?league=... oder LocalStorage)
  useEffect(() => {
    try {
      const fromUrl = sp.get('league');
      if (fromUrl) {
        setLeagueId(fromUrl);
        return;
      }
      const stored = localStorage.getItem('selectedLeague');
      if (stored) {
        const parsed = JSON.parse(stored) as { id?: string } | null;
        if (parsed?.id) {
          setLeagueId(parsed.id);
          return;
        }
      }
      router.push('/leagues');
    } catch (e) {
      console.error(e);
      setErr('Konnte Liga nicht ermitteln.');
    }
  }, [sp, router]);

  // 2) Ranking laden
  useEffect(() => {
    if (!leagueId) return;
    let abort = false;

    (async () => {
      setIsLoading(true);
      setErr('');
      try {
        const res = await fetch(`/api/leagues/${leagueId}/ranking`, {
          method: 'GET',
          headers: { 'content-type': 'application/json' },
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (abort) return;

        // Erwartete Struktur in data: { ranking: Array<...> } – falls anders, hier anpassen
        const ranking: RankingRow[] =
          (data?.ranking as any[])?.map((r: any, i: number) => ({
            userId: r.userId ?? r.id ?? String(i),
            userName: r.userName ?? r.name ?? `Manager ${i + 1}`,
            points: r.points ?? r.score ?? 0,
            position: r.position ?? r.rank ?? i + 1,
            avatar: r.avatar ?? r.image ?? undefined,
          })) ?? [];

        setRows(ranking);
      } catch (e: any) {
        console.error('Ranking-Load failed:', e);
        setErr('Ranking konnte nicht geladen werden.');
      } finally {
        if (!abort) setIsLoading(false);
      }
    })();

    return () => {
      abort = true;
    };
  }, [leagueId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Ligatabelle {leagueId ? `– ${leagueId}` : ''}
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-6">Lade Ranking…</div>
          ) : err ? (
            <div className="p-6 text-red-600">{err}</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-gray-600">Keine Daten gefunden.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Manager
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Punkte
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {rows.map((r) => (
                  <tr key={r.userId}>
                    <td className="px-4 py-2">{r.position}</td>
                    <td className="px-4 py-2 flex items-center gap-2">
                      <img
                        src={r.avatar || '/placeholder.png'}
                        alt=""
                        className="h-6 w-6 rounded-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/placeholder.png';
                        }}
                      />
                      <span>{r.userName}</span>
                    </td>
                    <td className="px-4 py-2 text-right">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

export default function LeagueTablePage() {
  return (
    <Suspense fallback={<div className="p-6">Lade Seite…</div>}>
      <LeagueTableContent />
    </Suspense>
  );
}
