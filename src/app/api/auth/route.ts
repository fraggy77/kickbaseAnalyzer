import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    console.log('Login-Versuch für:', email);
    
    // API-Anfrage mit aktualisiertem User-Agent
    const response = await fetch('https://api.kickbase.com/v4/user/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Kickbase/iOS 6.7.0', // Aktuellere Version angeben
        'Accept': 'application/json',
        'Accept-Language': 'de-DE',
      },
      body: JSON.stringify({ 
        em: email, 
        pass: password,
        loy: false,
        rep: {}
      }),
    });

    // Ausführliches Logging für Debugging
    console.log('Response-Status:', response.status);
    console.log('Response-Headers:', {
      contentType: response.headers.get('content-type'),
      server: response.headers.get('server'),
    });
    
    // Response als Text lesen
    const responseText = await response.text();
    
    // Mehr Logging
    console.log('Response-Text-Länge:', responseText.length);
    console.log('Response-Vorschau:', responseText.substring(0, 200));
    
    // HTML-Check
    if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
      console.error('HTML statt JSON erhalten');
      return NextResponse.json(
        { message: 'Login fehlgeschlagen: Die API hat HTML statt JSON zurückgegeben' },
        { status: 500 }
      );
    }
    
    // Als JSON parsen
    let data;
    try {
      data = JSON.parse(responseText);
      
      // Detailliertes Logging der Antwortstruktur
      console.log('Antwort-Keys:', Object.keys(data));
      
      // Prüfen auf bekannte Fehlermeldung "ClientTooOld"
      if (data.err === 5 && data.errMsg === "ClientTooOld") {
        console.error('API meldet veralteten Client');
        return NextResponse.json(
          { message: 'Login fehlgeschlagen: Die Kickbase-API meldet, dass der Client zu alt ist' },
          { status: 400 }
        );
      }
      
      if (data.tkn) console.log('Token gefunden:', data.tkn.substring(0, 20) + '...');
      else console.log('Kein Token in der Antwort gefunden');
      
      if (data.u) console.log('Benutzer-Keys:', Object.keys(data.u));
      else console.log('Kein Benutzer in der Antwort gefunden');
      
    } catch (error) {
      console.error('Fehler beim Parsen der Antwort als JSON:', error);
      return NextResponse.json(
        { message: 'Login fehlgeschlagen: Die Antwort konnte nicht als JSON verarbeitet werden' },
        { status: 500 }
      );
    }
    
    // Fehlerprüfung
    if (!response.ok) {
      const errorMessage = data?.message || data?.errMsg || response.statusText || 'Unbekannter Fehler';
      return NextResponse.json(
        { message: `Login fehlgeschlagen: ${errorMessage}` },
        { status: response.status }
      );
    }
    
    // Bei erfolgreicher Antwort - echtes Token und Benutzerdaten zurückgeben
    if (data.tkn && data.u) {
      // Antwort in erwartetes Format umwandeln
      const formattedResponse = {
        token: data.tkn,
        user: {
          id: data.u.id,
          name: data.u.name,
          email: data.u.email || email
        }
      };
      
      console.log('Login erfolgreich - formatierte Antwort:', 
        JSON.stringify({
          token: formattedResponse.token.substring(0, 20) + '...',
          user: formattedResponse.user
        })
      );
      
      return NextResponse.json(formattedResponse);
    } else {
      console.error('Antwort enthält kein Token oder Benutzerdaten');
      return NextResponse.json(
        { message: 'Login fehlgeschlagen: Kein Token oder Benutzerdaten in der Antwort' },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error('Login-Fehler:', error);
    return NextResponse.json(
      { message: error.message || 'Ein unerwarteter Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}