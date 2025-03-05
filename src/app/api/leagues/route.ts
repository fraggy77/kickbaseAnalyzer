import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Daten aus dem Request extrahieren
    const { email, password } = await request.json();

    // Anfrage an Kickbase mit dem richtigen Format
    const response = await fetch('https://api.kickbase.de/v4/user/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Kickbase/Android 5.7.1',
      },
      // Wichtig: Das Format muss "em", "pass", etc. verwenden
      body: JSON.stringify({ 
        em: email, 
        pass: password,
        loy: false,
        rep: {}
      }),
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        return NextResponse.json(
          { message: `Login fehlgeschlagen: ${errorData.message || response.statusText}` },
          { status: response.status }
        );
      } else {
        // Wenn keine JSON-Antwort, dann Text zurückgeben
        const text = await response.text();
        console.error("Nicht-JSON-Antwort:", text.substring(0, 500)); // Nur die ersten 500 Zeichen loggen
        return NextResponse.json(
          { message: `Login fehlgeschlagen: Die API hat keine gültige JSON-Antwort gesendet` },
          { status: response.status }
        );
      }
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Login Fehler:', error);
    return NextResponse.json(
      { message: error.message || 'Ein unerwarteter Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}