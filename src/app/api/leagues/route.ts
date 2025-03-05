import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Authorization header missing or invalid' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Make request to Kickbase API to get leagues
    const response = await fetch('https://api.kickbase.de/v4/user/leagues', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Kickbase/Android 5.7.1',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        return NextResponse.json(
          { message: `Fehler beim Abrufen der Ligen: ${errorData.message || response.statusText}` },
          { status: response.status }
        );
      } else {
        // Bei nicht-JSON-Antworten den Text zurückgeben
        const text = await response.text();
        console.error("Nicht-JSON-Antwort:", text.substring(0, 500)); // Nur die ersten 500 Zeichen loggen
        return NextResponse.json(
          { message: `Fehler beim Abrufen der Ligen: Die API hat keine gültige JSON-Antwort gesendet` },
          { status: response.status }
        );
      }
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Leagues fetch error:', error);
    return NextResponse.json(
      { message: error.message || 'Ein unerwarteter Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}