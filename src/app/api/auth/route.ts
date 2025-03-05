import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const response = await fetch('https://api.kickbase.de/v4/user/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Kickbase/Android 5.7.1',
      },
      body: JSON.stringify({ 
        em: email, 
        pass: password,
        loy: false,
        rep: {}
      }),
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      console.log('Login attempt for:', email);
console.log('Request body structure:::::::', { em: '***', pass: '***', loy: false, rep: {} });
console.log('Response status:', response.status);
console.log('Response headers:', response.headers);
console.log('Content-Type:', response.headers.get('content-type'));
const responseText = await response.text();
console.log('Response body (first 500 chars):', responseText.substring(0, 500));

      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        return NextResponse.json(
          { message: `Login fehlgeschlagen: ${errorData.message || response.statusText}` },
          { status: response.status }
        );
      } else {
        // Bei nicht-JSON-Antworten den Text zurückgeben
        const text = await response.text();
        console.error("Nicht-JSON-Antwort:", text.substring(0, 500)); // Nur die ersten 500 Zeichen loggen
        console.log('Request body structure:::::::', { em: '***', pass: '***', loy: false, rep: {} });
console.log('Response status:', response.status);
console.log('Response headers:', response.headers);
console.log('Content-Type:', response.headers.get('content-type'));
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