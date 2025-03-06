// src/lib/kickbase-api.ts

const BASE_URL = 'https://api.kickbase.com/v4';

interface KickbaseUser {
  token: string;
  user: {
    id: string;
    name?: string;
    email?: string;
  };
}

interface League {
  id: string;
  name: string;
  memberCount: number;
  // weitere Eigenschaften je nach API-Antwort
}

class KickbaseAPI {
  token: string | null = null;
  userId: string | null = null;
  email: string | null = null;

  /**
   * Bei Kickbase einloggen und Token speichern
   */
  async login(email: string, password: string): Promise<KickbaseUser> {
    try {
      console.log('Frontend: Login-Versuch mit', email);
      
      // Wichtig: Hier verwenden wir UNSERE eigene API-Route, nicht direkt die Kickbase-API
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
  
      console.log('Frontend: Response-Status:', response.status);
      
      // First, get the response as text
      const responseText = await response.text();
      console.log('Frontend: Response-Vorschau:', responseText.substring(0, 200));
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (error) {
        console.error('Frontend: JSON-Parse-Fehler', error);
        console.log('Frontend: Vollständige Antwort:', responseText);
        throw new Error('Login fehlgeschlagen: Ungültiges Antwortformat');
      }
      
      if (!response.ok || data.message) {
        throw new Error(data.message || 'Login fehlgeschlagen');
      }
      
      // Make sure we have a token
      if (!data.token) {
        console.error('Frontend: Kein Token in der Antwort', data);
        throw new Error('Login fehlgeschlagen: Kein Token erhalten');
      }
  
      // Token und Benutzerdaten speichern
      this.token = data.token;
      this.userId = data.user?.id;
      this.email = email;
      
      // Erfolgreichen Login in der Konsole bestätigen
      console.log('Frontend: Login erfolgreich - Token:', this.token.substring(0, 15) + '...');
      console.log('Frontend: Benutzer-ID:', this.userId);
      
      return data;
    } catch (error: any) {
      console.error('Kickbase Login Fehler:', error);
      throw error;
    }
  }

  /**
   * Hilfsfunktion für authentifizierte API-Anfragen
   */
  async fetch(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.token) {
      throw new Error('Nicht eingeloggt');
    }

    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
      'User-Agent': 'Kickbase/iOS 6.7.0', // Aktuellere Version
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || response.statusText;
        } catch {
          errorMessage = errorText || response.statusText;
        }
        
        throw new Error(`API-Fehler: ${response.status} - ${errorMessage}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Kickbase API Fehler:', error);
      throw error;
    }
  }

  /**
   * Liga-Details abrufen
   */
  async getLeagueDetails(leagueId: string): Promise<any> {
    try {
      if (!this.token) {
        throw new Error('Nicht eingeloggt');
      }
      
      console.log('Frontend: Liga-Details-Anfrage für ID', leagueId);
      
      const response = await fetch(`/api/leagues/${leagueId}/overview`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });
  
      // Status-Code protokollieren
      console.log('Frontend: Liga-Details-Anfrage Status:', response.status);
      
      // Antwort als Text lesen
      const responseText = await response.text();
      console.log('Frontend: Liga-Details-Antwort Vorschau:', responseText.substring(0, 100));
      
      // Als JSON parsen
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (error) {
        console.error('Frontend: Fehler beim Parsen der Liga-Details-Antwort:', error);
        throw new Error('Fehler beim Abrufen der Liga-Details: Die Antwort konnte nicht als JSON verarbeitet werden');
      }
      
      // Fehlerprüfung
      if (!response.ok || data.message) {
        const errorMessage = data.message || 'Fehler beim Abrufen der Liga-Details';
        console.error('Frontend: Liga-Details-Anfrage fehlgeschlagen:', errorMessage);
        throw new Error(errorMessage);
      }
      
      // Datenstruktur protokollieren
      console.log('Frontend: Liga-Details-Datenstruktur:', Object.keys(data));
      
      // Daten zurückgeben
      return data;
    } catch (error) {
      console.error('Kickbase API Fehler:', error);
      throw error;
    }
  }

  /**
   * Ligen des Benutzers abrufen
   */
  async getLeagues(): Promise<League[]> {
    try {
      if (!this.token) {
        throw new Error('Nicht eingeloggt');
      }
      
      console.log('Frontend: Ligen-Anfrage mit Token', this.token.substring(0, 15) + '...');
      
      const response = await fetch('/api/leagues', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      // Status-Code protokollieren
      console.log('Frontend: Ligen-Anfrage Status:', response.status);
      
      // Antwort als Text lesen
      const responseText = await response.text();
      console.log('Frontend: Ligen-Antwort Vorschau:', responseText.substring(0, 100));
      
      // Als JSON parsen
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (error) {
        console.error('Frontend: Fehler beim Parsen der Ligen-Antwort:', error);
        throw new Error('Fehler beim Abrufen der Ligen: Die Antwort konnte nicht als JSON verarbeitet werden');
      }
      
      // Fehlerprüfung
      if (!response.ok || data.message) {
        const errorMessage = data.message || 'Fehler beim Abrufen der Ligen';
        console.error('Frontend: Ligen-Anfrage fehlgeschlagen:', errorMessage);
        throw new Error(errorMessage);
      }
      
      // Datenstruktur protokollieren
      console.log('Frontend: Ligen-Datenstruktur:', {
        isArray: Array.isArray(data),
        anzahl: Array.isArray(data) ? data.length : 'kein Array',
        erstesElement: Array.isArray(data) && data.length > 0 ? Object.keys(data[0]) : 'keine Elemente'
      });
      
      // Datenformat prüfen
      if (!Array.isArray(data)) {
        console.error('Frontend: Unerwartetes Datenformat, Array erwartet:', data);
        throw new Error('Fehler beim Abrufen der Ligen: Unerwartetes Datenformat');
      }
      
      // Ligen zurückgeben
      return data;
    } catch (error) {
      console.error('Kickbase API Fehler:', error);
      throw error;
    }
  }

  /**
   * Team des Benutzers in einer bestimmten Liga abrufen
   */
/**
 * Team des Benutzers in einer bestimmten Liga abrufen
 */
async getTeam(leagueId: string): Promise<any> {
  try {
    if (!this.token) {
      throw new Error('Nicht eingeloggt');
    }
    
    console.log('Frontend: Team-Anfrage für Liga', leagueId);
    
    const response = await fetch(`/api/leagues/${leagueId}/team`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    // Status-Code protokollieren
    console.log('Frontend: Team-Anfrage Status:', response.status);
    
    // Antwort als Text lesen
    const responseText = await response.text();
    console.log('Frontend: Team-Antwort Vorschau:', responseText.substring(0, 100));
    
    // Als JSON parsen
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      console.error('Frontend: Fehler beim Parsen der Team-Antwort:', error);
      throw new Error('Fehler beim Abrufen des Teams: Die Antwort konnte nicht als JSON verarbeitet werden');
    }
    
    // Fehlerprüfung
    if (!response.ok || data.message) {
      const errorMessage = data.message || 'Fehler beim Abrufen des Teams';
      console.error('Frontend: Team-Anfrage fehlgeschlagen:', errorMessage);
      throw new Error(errorMessage);
    }
    
    // Datenstruktur protokollieren
    console.log('Frontend: Team-Datenstruktur:', Object.keys(data));
    
    // Daten normalisieren - sicherstellen, dass ein konsistentes Datenformat zurückgegeben wird
    const normalizedData = {
      // Team-ID könnte in verschiedenen Feldern sein
      id: data.id || data.un || data.cpi || 'unknown',
      // Team-Name oder Default
      tn: data.tn || data.lnm || 'Mein Team',
      // Budget mit Fallback auf 0
      budget: data.b || data.budget || 0,
      // Teamwert mit Fallback auf 0
      teamValue: data.teamValue || 0,
      // Spielerliste mit Fallback auf leeres Array
      pl: data.pl || [],
      // Andere Daten
      tp: data.tp || 0, // Punkte
      tr: data.tr || 0, // Rang
      // Original-Daten für den Fall, dass wir sie später brauchen
      originalData: data
    };
    
    console.log('Frontend: Normalisierte Team-Daten:', {
      id: normalizedData.id,
      tn: normalizedData.tn,
      spielerAnzahl: normalizedData.pl.length
    });
    
    // Normalisierte Daten zurückgeben
    return normalizedData;
  } catch (error) {
    console.error('Kickbase API Fehler:', error);
    throw error;
  }
}

/**
 * Squad (Kader) des Benutzers in einer bestimmten Liga abrufen
 */
async getSquad(leagueId: string): Promise<any> {
  try {
    if (!this.token) {
      throw new Error('Nicht eingeloggt');
    }
    
    console.log('Frontend: Squad-Anfrage für Liga', leagueId);
    
    const response = await fetch(`/api/leagues/${leagueId}/squad`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    // Status-Code protokollieren
    console.log('Frontend: Squad-Anfrage Status:', response.status);
    
    // Antwort als Text lesen
    const responseText = await response.text();
    console.log('Frontend: Squad-Antwort Vorschau:', responseText.substring(0, 100));
    
    // Als JSON parsen
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      console.error('Frontend: Fehler beim Parsen der Squad-Antwort:', error);
      throw new Error('Fehler beim Abrufen des Squads: Die Antwort konnte nicht als JSON verarbeitet werden');
    }
    
    // Fehlerprüfung
    if (!response.ok || data.message) {
      const errorMessage = data.message || 'Fehler beim Abrufen des Squads';
      console.error('Frontend: Squad-Anfrage fehlgeschlagen:', errorMessage);
      throw new Error(errorMessage);
    }
    
    // Datenstruktur protokollieren
    console.log('Frontend: Squad-Datenstruktur:', Object.keys(data));
    
    // Prüfen, ob die Spielerliste existiert
    if (!data.pl || !Array.isArray(data.pl)) {
      console.warn('Frontend: Keine Spieler im Squad gefunden oder ungültiges Format');
      data.pl = []; // Leeres Array setzen, damit die Anwendung nicht abstürzt
    } else {
      console.log(`Frontend: ${data.pl.length} Spieler im Squad gefunden`);
    }
    
    return data;
  } catch (error) {
    console.error('Kickbase API Fehler:', error);
    throw error;
  }
}

  /**
   * Spieler des Teams abrufen
   */
  async getPlayers(leagueId: string): Promise<any> {
    return this.fetch(`/leagues/${leagueId}/me/players`);
  }
}

// Singleton-Instanz exportieren
export const kickbaseAPI = new KickbaseAPI();