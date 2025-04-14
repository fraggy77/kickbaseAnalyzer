//Das ist die LoginSeite, die man beim Start der App sieht
//hier gibt man die Kickbase Login Daten ein und wird zu den Ligen weitergeleitet

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { kickbaseAPI } from '@/lib/kickbase-api';
import type { League } from '@/types/league.types'; // Importiere League Typ

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Kickbase Login ausführen - erwartet jetzt { token, user, leagues }
      const userData = await kickbaseAPI.login(email, password);

      // Login-Daten immer speichern
      const kickbaseUser = {
        token: userData.token,
        id: userData.user.id,
        email: userData.user.email || email // Nutze Fallback
      };
      localStorage.setItem('kickbaseUser', JSON.stringify(kickbaseUser));

      // Prüfe die Anzahl der Ligen
      if (userData.leagues && userData.leagues.length === 1) {
        // --- Fall 1: Nur eine Liga ---
        const singleLeague = userData.leagues[0];
        console.log('Nur eine Liga gefunden, leite direkt weiter:', singleLeague.name);

        // Speichere die ausgewählte Liga MIT Bild
        localStorage.setItem('selectedLeague', JSON.stringify({
          id: singleLeague.id,
          name: singleLeague.name,
          image: singleLeague.image // Bild-URL hinzufügen
        }));

        // Navigiere direkt zum Dashboard
        router.push(`/dashboard?league=${singleLeague.id}`);

      } else {
        // --- Fall 2: 0 oder mehr als 1 Liga ---
        console.log(`${userData.leagues?.length || 0} Ligen gefunden, leite zu /leagues weiter.`);

        // Speichere die Ligenliste temporär für die nächste Seite
        if (userData.leagues) {
            sessionStorage.setItem('pendingLeagues', JSON.stringify(userData.leagues));
        } else {
            sessionStorage.setItem('pendingLeagues', JSON.stringify([])); // Leeres Array speichern, falls keine Ligen
        }


        // Zur Ligen-Auswahl weiterleiten
        router.push('/leagues');
      }

    } catch (error: any) {
      setError(error.message || 'Anmeldung fehlgeschlagen. Bitte überprüfe deine Zugangsdaten.');
      setIsLoading(false); // Ladezustand bei Fehler beenden
    }
    // setIsLoading wird bei Erfolg nicht auf false gesetzt, da navigiert wird.
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950">
      <main className="container mx-auto max-w-md px-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
          <div className="px-6 py-8">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Kickbase Analyzer</h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">Optimiere dein Kickbase-Team</p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  E-Mail-Adresse
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Passwort
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Anmelden...
                    </>
                  ) : 'Anmelden'}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                Dies ist eine inoffizielle App und steht in keiner Verbindung zu Kickbase.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}