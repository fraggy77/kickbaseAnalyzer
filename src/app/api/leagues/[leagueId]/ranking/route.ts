import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  try {
    // In Next.js 13+ müssen wir params mit await verwenden
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
    
    console.log(`Liga-Ranking-Anfrage für ID ${leagueId} mit Token: ${token.substring(0, 15)}...`);
    
    // Anfrage an die Kickbase-API mit dem Token vom Login
    const response = await fetch(`https://api.kickbase.com/v4/leagues/${leagueId}/ranking`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Kickbase/iOS 6.7.0',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Kickbase API response status:', response.status);
    
    // Antwort als Text lesen für sichereres Verarbeiten
    const responseText = await response.text();
    console.log('Antwort-Vorschau:', responseText.substring(0, 200));
    
    // Als JSON parsen
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Antwort-Datenstruktur:', Object.keys(data));
      
      // Die Daten direkt zurückgeben
      return NextResponse.json(data);
      
    } catch (error) {
      console.error('Fehler beim Parsen der Antwort als JSON:', error);
      return NextResponse.json(
        { message: 'Fehler beim Abrufen des Liga-Rankings: Die API-Antwort konnte nicht als JSON verarbeitet werden' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('League ranking fetch error:', error);
    return NextResponse.json(
      { message: error.message || 'Ein unerwarteter Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}