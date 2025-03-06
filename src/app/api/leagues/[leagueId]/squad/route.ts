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
    
    console.log(`Squad-Anfrage für Liga ${leagueId} mit Token: ${token.substring(0, 15)}...`);
    
    // Verbesserte Error-Handling und Retries hinzufügen
    async function safeApiRequest(url: string, options: RequestInit) {
      const maxAttempts = 3;
      let lastError = null;
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          console.log(`API-Anfrage Versuch ${attempt} an ${url}`);
          const response = await fetch(url, options);
          
          console.log(`Status-Code: ${response.status}`);
          
          // Zuerst die Antwort als Text lesen
          const responseText = await response.text();
          console.log(`Antwort-Länge: ${responseText.length}`);
          console.log(`Antwort-Vorschau: ${responseText.substring(0, 150)}`);
          
          // Prüfen auf leere Antwort
          if (!responseText || responseText.trim() === '') {
            throw new Error('Leere Antwort vom Server');
          }
          
          // Prüfen auf HTML
          if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
            throw new Error('HTML statt JSON erhalten');
          }
          
          // Als JSON parsen
          try {
            const data = JSON.parse(responseText);
            
            // ClientTooOld-Fehler prüfen
            if (data.err === 5 && data.errMsg === "ClientTooOld") {
              console.error('API meldet veralteten Client');
              return { 
                error: 'ClientTooOld', 
                status: 400, 
                data: null 
              };
            }
            
            // OK Status oder andere Fehler
            if (!response.ok) {
              return {
                error: data.message || data.errMsg || response.statusText || 'Unbekannter API-Fehler',
                status: response.status,
                data: null
              };
            }
            
            // Alles OK - Daten zurückgeben
            return { error: null, status: 200, data };
            
          } catch (error) {
            console.error(`JSON-Parse-Fehler bei Versuch ${attempt}:`, error);
            throw new Error('Antwort konnte nicht als JSON verarbeitet werden');
          }
          
        } catch (error: any) {
          console.error(`Fehler bei Versuch ${attempt}:`, error.message);
          lastError = error;
          
          // Nur warten, wenn wir einen weiteren Versuch machen werden
          if (attempt < maxAttempts) {
            const waitTime = Math.pow(2, attempt) * 300; // 600ms, 1.2s, 2.4s...
            console.log(`Warte ${waitTime}ms vor dem nächsten Versuch...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }
      
      // Alle Versuche fehlgeschlagen
      return {
        error: lastError?.message || 'API-Anfrage fehlgeschlagen nach mehreren Versuchen',
        status: 500,
        data: null
      };
    }
    
    // Spieler-Squad abrufen
    const squadResult = await safeApiRequest(`https://api.kickbase.com/v4/leagues/${leagueId}/squad`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Kickbase/iOS 6.9.0',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    // Fehlerbehandlung für die Squad-Anfrage
    if (squadResult.error) {
      console.error(`Fehler beim Abrufen des Squads: ${squadResult.error}`);
      
      if (squadResult.error === 'ClientTooOld') {
        return NextResponse.json(
          { message: 'Fehler beim Abrufen des Squads: Die API meldet, dass der Client zu alt ist' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { message: `Fehler beim Abrufen des Squads: ${squadResult.error}` },
        { status: squadResult.status }
      );
    }
    
    const squadData = squadResult.data;
    
    // Prüfen, ob die erwarteten Daten vorhanden sind
    if (!squadData || !Array.isArray(squadData.pl)) {
      console.error('Unerwartetes Datenformat: Keine Spieler gefunden');
      
      // Leeres Array zurückgeben, damit die Frontend-Anwendung nicht abstürzt
      return NextResponse.json({
        pl: []
      });
    }
    
    // Log des Datenformats für Debugging
    console.log(`Squad Spieleranzahl: ${squadData.pl.length}`);
    if (squadData.pl.length > 0) {
      console.log('Beispiel-Spieler-Felder:', Object.keys(squadData.pl[0]));
    }
    
    // Die Daten zurückgeben
    return NextResponse.json(squadData);
      
  } catch (error: any) {
    console.error('Squad fetch error:', error);
    return NextResponse.json(
      { message: error.message || 'Ein unerwarteter Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}