'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// Alles, was useSearchParams() oder andere Client-Hooks braucht, kommt HIER rein:
function BuliContent() {
  const searchParams = useSearchParams();

  // ⬇️ PASTE HIER DEINE BISHERIGE /buli-LOGIK & JSX ⬇️
  return (
    <div className="p-6">
      {/* Dein bisheriges JSX */}
      <p>Bundesliga-Inhalt lädt … ersetze mich mit deinem echten Inhalt.</p>
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
