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
    
    console.log(`Competition-Spezifische Anfrage mit Token: ${token.substring(0, 15)}...`);
    
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
    
    // Wir wissen jetzt, dass die Bundesliga die ID 1 hat
    const competitionId = '1';
    
    // Liste aller zu testenden Endpoints mit der Bundesliga-ID
    const endpoints = [
      // Wettbewerb-spezifische Endpoints
      `/competitions/${competitionId}`,
      `/competitions/${competitionId}/matches`,
      `/competitions/${competitionId}/matchday`,
      `/competitions/${competitionId}/fixtures`,
      `/competitions/${competitionId}/stats`,
      
      // Verschiedene Varianten des Spieltag-Endpoints
      `/competitions/${competitionId}/matchdays`,
      `/competitions/${competitionId}/matchday/current`,
      `/competitions/${competitionId}/matchday/1`,
      `/competitions/${competitionId}/matchday/25`,
      
      // URLs für Live-Daten
      `/live/matches`,
      
      // Fixtures für die Bundesliga
      `/fixtures/${competitionId}`,
      
      // Season-basierte Endpoints
      `/season/2023/matches`,
      `/season/2024/matches`,
      
      // Team-spezifische Endpoints (für Teams aus der Liga)
      `/teams/7/matches`,  // Team mit ID 7 aus der tpc-Liste
      `/teams/2/matches`,  // Team mit ID 2 aus der tpc-Liste
      
      // Direkter Spieltag-Zugriff
      `/matchday/current`,
      `/matchday/25`
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
    
    // Ergebnisse zurückgeben
    return NextResponse.json({
      message: 'Competition-spezifische Abfrage abgeschlossen',
      results
    });
    
  } catch (error: any) {
    console.error('Competition debug fetch error:', error);
    return NextResponse.json(
      { message: error.message || 'Ein unerwarteter Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}