import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
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
    
    // Query Parameter holen, z.B. /api/matches/matchday?day=25
    const url = new URL(request.url);
    const dayParam = url.searchParams.get('day');
    // Default ist der aktuelle Spieltag
    const currentDay = dayParam ? parseInt(dayParam) : 25;
    
    console.log(`Matchday-Anfrage für Spieltag ${currentDay} mit Token: ${token.substring(0, 15)}...`);
    
    // Hilfsfunktion für API-Anfragen
    async function safeApiRequest(url: string, options: RequestInit) {
      console.log(`Versuche Anfrage an: ${url}`);
      try {
        const response = await fetch(url, options);
        console.log(`Status-Code: ${response.status}`);
        
        // Bei 404 oder anderen Fehlern geben wir ein Objekt mit Fehlerstatus zurück
        if (!response.ok) {
          return { 
            url,
            statusCode: response.status,
            error: response.statusText,
            data: null
          };
        }
        
        // Antwort als Text lesen
        const responseText = await response.text();
        console.log(`Antwort-Länge: ${responseText.length}`);
        
        // Prüfen auf leere Antwort
        if (!responseText || responseText.trim() === '') {
          return { 
            url,
            statusCode: response.status,
            error: 'Leere Antwort',
            data: null
          };
        }
        
        // Als JSON parsen
        try {
          const data = JSON.parse(responseText);
          return { 
            url,
            statusCode: response.status,
            error: null,
            data 
          };
        } catch (error) {
          return { 
            url,
            statusCode: response.status,
            error: 'JSON-Parse-Fehler',
            data: responseText.substring(0, 200) // Preview der Antwort
          };
        }
      } catch (error: any) {
        return { 
          url,
          statusCode: 0,
          error: error.message,
          data: null
        };
      }
    }
    
    const baseUrl = 'https://api.kickbase.com/v4';
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Kickbase/iOS 6.9.0',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    // Alle Spieltage abrufen
    const allMatchdaysResult = await safeApiRequest(`${baseUrl}/competitions/1/matchdays`, {
      method: 'GET', 
      headers
    });
    
    // Wenn der Abruf aller Spieltage fehlschlägt, frühzeitig abbrechen
    if (allMatchdaysResult.error) {
      console.error(`Fehler beim Abrufen aller Spieltage: ${allMatchdaysResult.error}`);
      return NextResponse.json(
        { message: `Fehler beim Abrufen der Spieltage: ${allMatchdaysResult.error}` },
        { status: allMatchdaysResult.statusCode || 500 }
      );
    }
    
    // Extrahiere die Daten
    const allMatchdays = allMatchdaysResult.data;
    console.log('Spieltags-Daten erhalten - Struktur:', JSON.stringify(Object.keys(allMatchdays)));
    
    // Debug-Ausgabe der Struktur - Schauen wir uns die ersten Ebenen an
    if (allMatchdays.it && Array.isArray(allMatchdays.it)) {
      console.log(`Gefunden: ${allMatchdays.it.length} Spieltage im 'it'-Array`);
      
      if (allMatchdays.it.length > 0) {
        console.log(`Erster Spieltag Keys:`, Object.keys(allMatchdays.it[0]));
        
        if (allMatchdays.it[0].it && Array.isArray(allMatchdays.it[0].it)) {
          console.log(`Erster Spieltag enthält ${allMatchdays.it[0].it.length} Spiele`);
          
          if (allMatchdays.it[0].it.length > 0) {
            console.log(`Erstes Spiel Keys:`, Object.keys(allMatchdays.it[0].it[0]));
            console.log(`Beispiel Spiel:`, JSON.stringify(allMatchdays.it[0].it[0]));
          }
        }
      }
    }
    
    // Finde den aktuellen Spieltag im Array
    let matchdayData = null;
    if (allMatchdays.it && Array.isArray(allMatchdays.it)) {
      matchdayData = allMatchdays.it.find(md => md.day === currentDay);
    }
    
    if (!matchdayData) {
      console.log(`Spieltag ${currentDay} nicht gefunden, verwende den aktuellen angegebenen Spieltag`);
      // Fallback: Verwende den aktuellen Spieltag aus den Daten
      if (allMatchdays.day && allMatchdays.it && Array.isArray(allMatchdays.it)) {
        matchdayData = allMatchdays.it.find(md => md.day === allMatchdays.day);
      }
    }
    
    if (!matchdayData && allMatchdays.it && Array.isArray(allMatchdays.it) && allMatchdays.it.length > 0) {
      console.log(`Kein passender Spieltag gefunden, verwende den ersten verfügbaren`);
      matchdayData = allMatchdays.it[0];
    }
    
    // Liste für die gefundenen Matches
    let matches = [];
    
    // Wenn wir einen Spieltag haben, extrahiere die Matches
    if (matchdayData && matchdayData.it && Array.isArray(matchdayData.it)) {
      console.log(`Extrahiere ${matchdayData.it.length} Spiele aus Spieltag ${matchdayData.day}`);
      
      // Durchlaufe alle Spiele dieses Spieltags
      matches = matchdayData.it.map(match => {
        // Extrahiere die relevanten Informationen für jedes Spiel
        // Verwende die richtigen Schlüssel basierend auf dem Debug-Output
        return {
          id: match.mi || '', // 'mi' ist der Schlüssel für Match-ID
          homeTeam: match.t1 || 'Unbekannt', // 't1' für Team 1
          awayTeam: match.t2 || 'Unbekannt', // 't2' für Team 2
          date: match.dt || 'Kein Datum', // 'dt' für Datum
          homeScore: match.t1g, // 't1g' für Team 1 Goals
          awayScore: match.t2g, // 't2g' für Team 2 Goals
          status: match.st || 0, // 'st' für Status
          // Additional info
          homeTeamImage: match.t1im,
          awayTeamImage: match.t2im,
          matchDay: match.day,
          // Original-Daten für Debugging
          raw: match
        };
      }).filter(match => match.id); // Nur Matches mit ID behalten
    } else {
      console.log('Keine Spieldaten gefunden oder ungültige Struktur');
    }
    
    console.log(`${matches.length} Spiele mit IDs gefunden`);
    
    // Ergebnisse zurückgeben
    return NextResponse.json({
      message: `Spieltag ${currentDay} erfolgreich abgerufen`,
      currentDay: matchdayData?.day || currentDay,
      matchCount: matches.length,
      matches,
      // Begrenzte Debug-Daten
      structure: {
        hasIt: Boolean(allMatchdays.it),
        itLength: allMatchdays.it?.length || 0,
        currentDay: allMatchdays.day || null,
        matchdayFound: Boolean(matchdayData),
        matchdayDay: matchdayData?.day || null,
        hasMatches: Boolean(matchdayData?.it),
        matchesLength: matchdayData?.it?.length || 0
      }
    });
    
  } catch (error: any) {
    console.error('Matchday fetch error:', error);
    return NextResponse.json(
      { message: error.message || 'Ein unerwarteter Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}