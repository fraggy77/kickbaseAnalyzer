import { NextResponse } from 'next/server';
import type { League } from '@/types/league.types'; // Importiere den League-Typ

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    // console.log('API Auth: Login-Versuch für:', email);

    // API-Anfrage an Kickbase (nur ein Versuch)
    const response = await fetch('https://api.kickbase.com/v4/user/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Kickbase/iOS 6.9.0', // Aktuelle Version verwenden
        'Accept': 'application/json',
        'Accept-Language': 'de-DE',
      },
      body: JSON.stringify({
        em: email,
        pass: password,
        loy: false, // Was bedeutet das? Kann evtl. entfernt werden?
        rep: {}     // Was bedeutet das? Kann evtl. entfernt werden?
      }),
    });

    const responseText = await response.text();

    // Prüfen auf leere Antwort oder HTML
    if (!responseText || responseText.trim() === '' || responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
      console.error('API Auth: Ungültige Antwort vom Server (leer oder HTML)');
      throw new Error('Ungültige Antwort vom Kickbase-Server');
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      console.error('API Auth: Fehler beim Parsen der Antwort als JSON:', error);
      console.error('API Auth: Antwort-Text:', responseText.substring(0, 500)); // Logge den Text bei Parse-Fehler
      throw new Error('Antwort von Kickbase konnte nicht verarbeitet werden');
    }

    // Fehlerprüfung (Statuscode und bekannte Fehlermeldungen)
    if (!response.ok) {
      // Prüfen auf bekannte Fehlermeldung "ClientTooOld"
      if (data.err === 5 && data.errMsg === "ClientTooOld") {
        console.error('API Auth: Kickbase meldet veralteten Client');
        return NextResponse.json(
          { message: 'Login fehlgeschlagen: Veralteter Client (API)' },
          { status: 400 }
        );
      }
      const errorMessage = data?.message || data?.errMsg || `HTTP-Fehler ${response.status}`;
      console.error('API Auth: Kickbase API Fehler:', errorMessage);
      throw new Error(`Login fehlgeschlagen: ${errorMessage}`);
    }

    // Erfolgsprüfung (Token und Benutzerdaten vorhanden?)
    if (data.tkn && data.u) {
      // Extrahiere und transformiere die Ligen (srvl)
      let transformedLeagues: League[] = [];
      if (data.srvl && Array.isArray(data.srvl)) {
        transformedLeagues = data.srvl.map((league: any) => ({
          id: league.id, // ID ist direkt 'id' in srvl, nicht 'i'
          name: league.name, // Name ist direkt 'name', nicht 'n'
          memberCount: league.mu || 0, // Mitgliederzahl ist 'mu' (max users?)
          // Bild-Logik: Priorisiere 'lim', dann 'ci', dann Fallback
          image: league.lim ? `https://kickbase.b-cdn.net/${league.lim}`
                 : league.ci ? league.ci // 'ci' scheint schon eine volle URL zu sein
                 : undefined, // Oder ein Standard-Placeholder?
        }));
      }

      const formattedResponse = {
        token: data.tkn,
        user: {
          id: data.u.id,
          name: data.u.name,
          email: data.u.email || email // Verwende die übergebene E-Mail als Fallback
        },
        leagues: transformedLeagues // Füge transformierte Ligen hinzu
      };
      // console.log('API Auth: Login erfolgreich für Benutzer:', formattedResponse.user.id); // Auskommentiert
      return NextResponse.json(formattedResponse);
    } else {
      console.error('API Auth: Antwort enthält kein Token oder Benutzerdaten', Object.keys(data));
      throw new Error('Unvollständige Antwort von Kickbase');
    }

  } catch (error: any) {
    // Fange alle anderen Fehler (Netzwerk, Verarbeitungsfehler etc.)
    console.error('API Auth: Unerwarteter Fehler im Login-Handler:', error);
    return NextResponse.json(
      // Gib die spezifische Fehlermeldung zurück, wenn vorhanden
      { message: error.message || 'Ein unerwarteter Serverfehler ist aufgetreten' },
      { status: 500 } // Allgemeiner Serverfehler
    );
  }
}