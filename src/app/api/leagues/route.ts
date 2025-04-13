import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Token aus dem Authorization-Header extrahieren
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Authorization header fehlt oder ist ungültig' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    //console.log('Leagues-Anfrage mit Token:', token.substring(0, 15) + '...');
    
    // Anfrage an die Kickbase-API mit dem Token vom Login
    const response = await fetch('https://api.kickbase.com/v4/leagues/selection', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Kickbase/iOS 6.7.0', // Neuere Version für bessere Kompatibilität
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}` // Das Token vom Login weitergeben
      }
    });
    
    // Antwort als Text lesen für sichereres Verarbeiten
    const responseText = await response.text();
    //console.log('Antwort-Vorschau:', responseText.substring(0, 200));
    
    // Falls wir HTML statt JSON bekommen
    if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
      console.error('HTML statt JSON erhalten');
      return NextResponse.json(
        { message: 'Fehler beim Abrufen der Ligen: Die API hat HTML statt JSON zurückgegeben' },
        { status: 500 }
      );
    }
    
    // Als JSON parsen
    let data;
    try {
      data = JSON.parse(responseText);
      //console.log('Antwort-Datenstruktur:', Object.keys(data));
      
      // Auf "ClientTooOld"-Fehler prüfen
      if (data.err === 5 && data.errMsg === "ClientTooOld") {
        console.error('API meldet veralteten Client');
        return NextResponse.json(
          { message: 'Fehler beim Abrufen der Ligen: Die API meldet, dass der Client zu alt ist' },
          { status: 400 }
        );
      }
      
      // Das Format der API-Antwort prüfen
      if (data.it && Array.isArray(data.it)) {
        console.log('Ligen im "it"-Array gefunden, transformiere Daten');
        
        // Format der API-Antwort in das von der App erwartete Format umwandeln
        const transformedLeagues = data.it.map((league: any) => ({
          id: league.i,
          name: league.n,
          memberCount: league.lpc || 0,
          image: league.f
        }));
        
        console.log('Transformierte Ligen:', transformedLeagues);
        return NextResponse.json(transformedLeagues);
      }
      
      // Wenn die Daten nicht dem erwarteten Format entsprechen
      console.error('Unerwartetes Datenformat:', data);
      return NextResponse.json(
        { message: 'Fehler beim Abrufen der Ligen: Unerwartetes Datenformat in der API-Antwort' },
        { status: 500 }
      );
      
    } catch (error) {
      console.error('Fehler beim Parsen der Antwort als JSON:', error);
      return NextResponse.json(
        { message: 'Fehler beim Abrufen der Ligen: Die API-Antwort konnte nicht als JSON verarbeitet werden' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Leagues fetch error:', error);
    return NextResponse.json(
      { message: error.message || 'Ein unerwarteter Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}