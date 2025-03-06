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
    
    // 1. Zuerst holen wir die ME-Daten für Liga-Info
    const meResult = await safeApiRequest(`https://api.kickbase.com/v4/leagues/${leagueId}/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Kickbase/iOS 6.9.0',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (meResult.error) {
      console.error(`Fehler beim Abrufen der ME-Daten: ${meResult.error}`);
      return NextResponse.json(
        { message: `Fehler beim Abrufen der Teamdaten: ${meResult.error}` },
        { status: meResult.status || 500 }
      );
    }
    
    const meData = meResult.data;
    console.log('ME-Daten erhalten:', Object.keys(meData));
    
    // 2. Jetzt holen wir die Squad-Daten mit dem korrekten Endpunkt
    const squadResult = await safeApiRequest(`https://api.kickbase.com/v4/leagues/${leagueId}/squad`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Kickbase/iOS 6.9.0',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (squadResult.error) {
      console.error(`Fehler beim Abrufen der Squad-Daten: ${squadResult.error}`);
      // Wir liefern trotzdem die ME-Daten mit leerer Spielerliste
      return NextResponse.json({
        ...meData,
        pl: []
      });
    }
    
    const squadData = squadResult.data;
    console.log('Squad-Daten erhalten:', squadData ? `${squadData.pl?.length || 0} Spieler gefunden` : 'Keine Spieler');
    
    // Kombiniere ME-Daten mit Squad-Daten
    const combinedData = {
      ...meData,
      budget: meData.b || 0,
      teamValue: meData.tv || 0,
      pl: squadData.pl || []
    };
    
    return NextResponse.json(combinedData);
    
  } catch (error: any) {
    console.error('Team fetch error:', error);
    return NextResponse.json(
      { message: error.message || 'Ein unerwarteter Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}