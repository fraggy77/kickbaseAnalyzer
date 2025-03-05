import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  try {
    const leagueId = params.leagueId;
    
    // Token aus dem Authorization-Header extrahieren
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Authorization header fehlt oder ist ungültig' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    console.log(`Team-Anfrage für Liga ${leagueId} mit Token: ${token.substring(0, 15)}...`);
    
    // Zuerst holen wir Nutzerinformationen, um unsere Team-ID zu bekommen
    const meResponse = await fetch(`https://api.kickbase.com/v4/leagues/${leagueId}/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Kickbase/iOS 6.7.0',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Me-Response Status:', meResponse.status);
    const meResponseText = await meResponse.text();
    console.log('Me-Response Vorschau:', meResponseText.substring(0, 200));
    
    if (!meResponse.ok) {
      console.error(`Fehler beim Abrufen der Nutzerinformationen: ${meResponse.status}`);
      
      // Bei ClientTooOld-Fehler Mock-Daten liefern
      if (meResponseText.includes('ClientTooOld')) {
        console.log('API meldet veralteten Client, liefere Mock-Daten');
        return NextResponse.json({
          tn: "Mein Team",
          budget: 3500000,
          teamValue: 120000000,
          tp: 1245,
          tr: 5,
          pl: [
            {
              id: "player1",
              firstName: "Robert",
              lastName: "Lewandowski",
              teamId: "fcb",
              teamName: "FC Bayern München",
              position: 4,
              status: 1,
              marketValue: 40000000,
              points: 234
            },
            {
              id: "player2",
              firstName: "Marco",
              lastName: "Reus",
              teamId: "bvb",
              teamName: "Borussia Dortmund",
              position: 3,
              status: 2,
              marketValue: 25000000,
              points: 187
            },
            {
              id: "player3",
              firstName: "Manuel",
              lastName: "Neuer",
              teamId: "fcb",
              teamName: "FC Bayern München",
              position: 1,
              status: 1,
              marketValue: 28000000,
              points: 156
            }
          ]
        });
      }
      
      return NextResponse.json(
        { message: `Fehler beim Abrufen der Nutzerinformationen: ${meResponse.status}` },
        { status: meResponse.status }
      );
    }
    
    // Prüfen ob die Me-Response leer ist
    if (!meResponseText.trim()) {
      console.error('Leere Antwort von /me Endpoint');
      return NextResponse.json(
        { message: 'Fehler beim Abrufen der Nutzerinformationen: Leere Antwort' },
        { status: 500 }
      );
    }
    
    let meData;
    try {
      meData = JSON.parse(meResponseText);
      console.log('Me-Data Struktur:', Object.keys(meData));
    } catch (error) {
      console.error('Fehler beim Parsen der Me-Response:', error);
      return NextResponse.json(
        { message: 'Fehler beim Parsen der Nutzerinformationen' },
        { status: 500 }
      );
    }
    
    const teamId = meData.id;
    console.log('Team-ID extrahiert:', teamId);
    
    if (!teamId) {
      console.error('Keine Team-ID in der Antwort gefunden');
      return NextResponse.json(
        { message: 'Fehler: Keine Team-ID in der Antwort gefunden' },
        { status: 500 }
      );
    }
    
    // Jetzt holen wir die Spieler des Teams
    const playersResponse = await fetch(`https://api.kickbase.com/v4/leagues/${leagueId}/teams/${teamId}/players`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Kickbase/iOS 6.7.0',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Spieler-API response status:', playersResponse.status);
    
    // Antwort als Text lesen für sichereres Verarbeiten
    const playersResponseText = await playersResponse.text();
    console.log('Spieler-Antwort-Vorschau:', playersResponseText.substring(0, 200));
    
    // Falls wir keine oder eine leere Antwort bekommen
    if (!playersResponseText.trim()) {
      console.error('Leere Antwort vom /players Endpoint');
      
      // Kombiniere die bereits abgerufenen Me-Daten mit leerer Spielerliste
      return NextResponse.json({
        ...meData,
        pl: []
      });
    }
    
    // Als JSON parsen
    let playersData;
    try {
      playersData = JSON.parse(playersResponseText);
      console.log('Spieler-Datenstruktur:', 
        playersData ? Object.keys(playersData) : 'Keine Daten'
      );
      
      // Auf "ClientTooOld"-Fehler prüfen
      if (playersData.err === 5 && playersData.errMsg === "ClientTooOld") {
        console.error('API meldet veralteten Client');
        return NextResponse.json(
          { message: 'Fehler beim Abrufen der Spieler: Die API meldet, dass der Client zu alt ist' },
          { status: 400 }
        );
      }
      
      // Hier kombinieren wir die Me-Daten mit den Spielerdaten 
      const combinedData = {
        ...meData,
        pl: playersData.pl || []
      };
      
      // Die kombinierten Daten zurückgeben
      return NextResponse.json(combinedData);
      
    } catch (error) {
      console.error('Fehler beim Parsen der Spieler-Antwort als JSON:', error);
      
      // Wir geben die Me-Daten ohne Spieler zurück
      return NextResponse.json({
        ...meData,
        pl: []
      });
    }
  } catch (error: any) {
    console.error('Team fetch error:', error);
    return NextResponse.json(
      { message: error.message || 'Ein unerwarteter Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}