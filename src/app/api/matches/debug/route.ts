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
    
    console.log(`Debug-Anfrage für verschiedene Endpoints mit Token: ${token.substring(0, 15)}...`);
    
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
    
    // Sammeln der Ergebnisse aus verschiedenen Endpoints
    const results = {};
    const baseUrl = 'https://api.kickbase.com/v4';
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Kickbase/iOS 6.9.0',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    // Liste aller zu testenden Endpoints
    const endpoints = [
      // Liga-basierte Endpoints
      '/leagues/selection',
      
      // League ID wird benötigt
      // '/leagues/{leagueId}/overview',
      // '/leagues/{leagueId}/me',
      
      // Bundesliga-basierte Endpoints
      '/competitions',
      '/competitions/stats',
      '/competitions/bl1', // Bundesliga
      '/competitions/bl1/matchday', // Aktueller Spieltag
      '/competitions/bl1/matchday/current', // Aktueller Spieltag
      '/competitions/bl1/matchday/25', // Spieltag 25
      '/fixtures', // Möglicherweise Spielplan
      '/fixtures/next', // Nächste Spiele
      '/fixtures/current', // Aktuelle Spiele
      
      // Andere mögliche Endpoints
      '/live', // Live-Daten
      '/match/live', // Live-Spiele
      '/match/day', // Tages-Spiele
      '/match/week', // Wochen-Spiele
    ];
    
    // Alle Endpoints parallel abfragen
    const requests = endpoints.map(endpoint => 
      safeApiRequest(`${baseUrl}${endpoint}`, { method: 'GET', headers })
      .then(result => {
        results[endpoint] = result;
        return result;
      })
    );
    
    // Auf alle Anfragen warten
    await Promise.all(requests);
    
    // Liga-ID aus selection abrufen, wenn möglich
    let leagueId = null;
    if (results['/leagues/selection']?.data?.it && Array.isArray(results['/leagues/selection'].data.it) && results['/leagues/selection'].data.it.length > 0) {
      leagueId = results['/leagues/selection'].data.it[0].i;
      console.log(`Erste Liga-ID gefunden: ${leagueId}`);
      
      // Mit dieser Liga-ID jetzt auch Liga-spezifische Endpoints abfragen
      if (leagueId) {
        const leagueEndpoints = [
          `/leagues/${leagueId}/overview`,
          `/leagues/${leagueId}/me`,
          `/leagues/${leagueId}/competition/stats`,
          `/leagues/${leagueId}/fixtures`,
        ];
        
        const leagueRequests = leagueEndpoints.map(endpoint => 
          safeApiRequest(`${baseUrl}${endpoint}`, { method: 'GET', headers })
          .then(result => {
            results[endpoint] = result;
            return result;
          })
        );
        
        await Promise.all(leagueRequests);
      }
    }
    
    // Ergebnisse zurückgeben
    return NextResponse.json({
      message: 'Debug-Abfrage abgeschlossen',
      leagueId,
      results
    });
    
  } catch (error: any) {
    console.error('Debug fetch error:', error);
    return NextResponse.json(
      { message: error.message || 'Ein unerwarteter Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}