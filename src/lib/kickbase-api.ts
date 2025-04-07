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
 * Alle Spiele abrufen
 */
async getAllMatches(): Promise<any> {
  try {
    if (!this.token) {
      throw new Error('Nicht eingeloggt');
    }
    
    console.log('Frontend: Anfrage für alle Matches');
    
    const response = await fetch(`/api/matches`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    // Status-Code protokollieren
    console.log('Frontend: Alle Matches Anfrage Status:', response.status);
    
    // Antwort als Text lesen
    const responseText = await response.text();
    console.log('Frontend: Alle Matches Antwort Vorschau:', responseText.substring(0, 100));
    
    // Als JSON parsen
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      console.error('Frontend: Fehler beim Parsen der Alle-Matches-Antwort:', error);
      throw new Error('Fehler beim Abrufen aller Matches: Die Antwort konnte nicht als JSON verarbeitet werden');
    }
    
    // Fehlerprüfung
    if (!response.ok || data.message) {
      const errorMessage = data.message || 'Fehler beim Abrufen aller Matches';
      console.error('Frontend: Alle Matches Anfrage fehlgeschlagen:', errorMessage);
      throw new Error(errorMessage);
    }
    
    // Datenstruktur protokollieren
    console.log('Frontend: Alle Matches Datenstruktur:', Object.keys(data));
    
    return data;
  } catch (error) {
    console.error('Kickbase API Fehler:', error);
    throw error;
  }
}

/**
 * Debug-Methode: Testet verschiedene Endpoints, um Match-IDs zu finden
 */
async debugEndpoints(): Promise<any> {
  try {
    if (!this.token) {
      throw new Error('Nicht eingeloggt');
    }
    
    console.log('Frontend: Debug-Anfrage für Endpoints');
    
    const response = await fetch('/api/matches/debug', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    // Status-Code protokollieren
    console.log('Frontend: Debug-Anfrage Status:', response.status);
    
    // Antwort als Text lesen
    const responseText = await response.text();
    console.log('Frontend: Debug-Antwort Länge:', responseText.length);
    
    // Als JSON parsen
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      console.error('Frontend: Fehler beim Parsen der Debug-Antwort:', error);
      throw new Error('Fehler bei der Debug-Anfrage: Die Antwort konnte nicht als JSON verarbeitet werden');
    }
    
    // Fehlerprüfung
    if (!response.ok || data.message && data.message.includes('Fehler')) {
      const errorMessage = data.message || 'Fehler bei der Debug-Anfrage';
      console.error('Frontend: Debug-Anfrage fehlgeschlagen:', errorMessage);
      throw new Error(errorMessage);
    }
    
    // Erfolg
    console.log('Frontend: Debug-Daten erfolgreich geladen');
    
    return data;
  } catch (error) {
    console.error('Kickbase API Debug Fehler:', error);
    throw error;
  }
}

/**
 * Debug-Methode: Testet wettbewerbsspezifische Endpoints
 */
async debugCompetition(): Promise<any> {
  try {
    if (!this.token) {
      throw new Error('Nicht eingeloggt');
    }
    
    console.log('Frontend: Competition-Debug-Anfrage');
    
    const response = await fetch('/api/matches/competition', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    // Status-Code protokollieren
    console.log('Frontend: Competition-Debug-Anfrage Status:', response.status);
    
    // Antwort als Text lesen
    const responseText = await response.text();
    console.log('Frontend: Competition-Debug-Antwort Länge:', responseText.length);
    
    // Als JSON parsen
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      console.error('Frontend: Fehler beim Parsen der Competition-Debug-Antwort:', error);
      throw new Error('Fehler bei der Competition-Debug-Anfrage: Die Antwort konnte nicht als JSON verarbeitet werden');
    }
    
    // Fehlerprüfung
    if (!response.ok || data.message && data.message.includes('Fehler')) {
      const errorMessage = data.message || 'Fehler bei der Competition-Debug-Anfrage';
      console.error('Frontend: Competition-Debug-Anfrage fehlgeschlagen:', errorMessage);
      throw new Error(errorMessage);
    }
    
    // Erfolg
    console.log('Frontend: Competition-Debug-Daten erfolgreich geladen');
    
    return data;
  } catch (error) {
    console.error('Kickbase API Competition Debug Fehler:', error);
    throw error;
  }
}

/**
 * Spieltags-Daten mit Match-IDs abrufen
 */
async getMatchday(day?: number): Promise<any> {
  try {
    if (!this.token) {
      throw new Error('Nicht eingeloggt');
    }
    
    console.log('Frontend: Spieltags-Anfrage' + (day ? ` für Tag ${day}` : ''));
    
    // Spieltag als Query-Parameter anhängen, falls vorhanden
    const url = day ? `/api/matches/matchday?day=${day}` : '/api/matches/matchday';
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    // Status-Code protokollieren
    console.log('Frontend: Spieltags-Anfrage Status:', response.status);
    
    // Antwort als Text lesen
    const responseText = await response.text();
    console.log('Frontend: Spieltags-Antwort Länge:', responseText.length);
    
    // Als JSON parsen
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      console.error('Frontend: Fehler beim Parsen der Spieltags-Antwort:', error);
      throw new Error('Fehler bei der Spieltags-Anfrage: Die Antwort konnte nicht als JSON verarbeitet werden');
    }
    
    // Fehlerprüfung
    if (!response.ok || data.message && data.message.includes('Fehler')) {
      const errorMessage = data.message || 'Fehler bei der Spieltags-Anfrage';
      console.error('Frontend: Spieltags-Anfrage fehlgeschlagen:', errorMessage);
      throw new Error(errorMessage);
    }
    
    // Erfolg
    console.log('Frontend: Spieltags-Daten erfolgreich geladen');
    console.log(`Frontend: ${data.matchIds?.length || 0} Match-IDs gefunden`);
    
    return data;
  } catch (error) {
    console.error('Kickbase API Spieltags-Anfrage Fehler:', error);
    throw error;
  }
}
  /**
 * Spiele einer Liga abrufen
 */
async getMatches(leagueId: string): Promise<any> {
  try {
    if (!this.token) {
      throw new Error('Nicht eingeloggt');
    }
    
    console.log('Frontend: Matches-Anfrage für Liga', leagueId);
    
    const response = await fetch(`/api/leagues/${leagueId}/matches`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    // Status-Code protokollieren
    console.log('Frontend: Matches-Anfrage Status:', response.status);
    
    // Antwort als Text lesen
    const responseText = await response.text();
    console.log('Frontend: Matches-Antwort Vorschau:', responseText.substring(0, 100));
    
    // Als JSON parsen
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      console.error('Frontend: Fehler beim Parsen der Matches-Antwort:', error);
      throw new Error('Fehler beim Abrufen der Matches: Die Antwort konnte nicht als JSON verarbeitet werden');
    }
    
    // Fehlerprüfung
    if (!response.ok || data.message) {
      const errorMessage = data.message || 'Fehler beim Abrufen der Matches';
      console.error('Frontend: Matches-Anfrage fehlgeschlagen:', errorMessage);
      throw new Error(errorMessage);
    }
    
    // Datenstruktur protokollieren
    console.log('Frontend: Matches-Datenstruktur:', Object.keys(data));
    
    return data;
  } catch (error) {
    console.error('Kickbase API Fehler:', error);
    throw error;
  }
}

  /**
 * Wettlink für ein bestimmtes Spiel abrufen
 */
async getBetlink(matchId: string): Promise<any> {
  try {
    if (!this.token) {
      throw new Error('Nicht eingeloggt');
    }
    
    console.log('Frontend: Betlink-Anfrage für Match', matchId);
    
    const response = await fetch(`/api/matches/${matchId}/betlink`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    // Status-Code protokollieren
    console.log('Frontend: Betlink-Anfrage Status:', response.status);
    
    // Antwort als Text lesen
    const responseText = await response.text();
    console.log('Frontend: Betlink-Antwort Vorschau:', responseText.substring(0, 100));
    
    // Als JSON parsen
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      console.error('Frontend: Fehler beim Parsen der Betlink-Antwort:', error);
      throw new Error('Fehler beim Abrufen des Betlinks: Die Antwort konnte nicht als JSON verarbeitet werden');
    }
    
    // Fehlerprüfung
    if (!response.ok || data.message) {
      const errorMessage = data.message || 'Fehler beim Abrufen des Betlinks';
      console.error('Frontend: Betlink-Anfrage fehlgeschlagen:', errorMessage);
      throw new Error(errorMessage);
    }
    
    // Datenstruktur protokollieren
    console.log('Frontend: Betlink-Datenstruktur:', Object.keys(data));
    
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
async getSquad(leagueId: string): Promise<any> {
  try {
    if (!this.token) {
      throw new Error('Nicht eingeloggt');
    }
    
    console.log('Frontend: Squad-Anfrage für Liga', leagueId);
    
    // Korrekter Endpunkt für Squad-Daten
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
    
    return data;
  } catch (error) {
    console.error('Kickbase API Fehler:', error);
    throw error;
  }
}

/**
 * Die getTeam Methode anpassen, um den Squad-Endpunkt zu nutzen, wenn das nicht schon gemacht wurde
 */
async getTeam(leagueId: string): Promise<any> {
  // Wir könnten hier entweder den getSquad-Aufruf verwenden
  // return this.getSquad(leagueId);
  
  // Oder wir behalten die vorhandene Implementierung bei, aber ändern den Pfad
  try {
    if (!this.token) {
      throw new Error('Nicht eingeloggt');
    }
    
    console.log('Frontend: Team-Anfrage für Liga', leagueId);
    
    // Hier sollte der Endpunkt korrigiert werden
    const response = await fetch(`/api/leagues/${leagueId}/squad`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    // Rest der Methode bleibt gleich...
    // ...

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
    
    return data;
  } catch (error) {
    console.error('Kickbase API Fehler:', error);
    throw error;
  }
}



  /**
   * Liga-Tabelle abrufen
   */
  async getLeagueRanking(leagueId: string): Promise<any> {
    try {
      if (!this.token) {
        throw new Error('Nicht eingeloggt');
      }
      
      console.log('Frontend: Liga-Ranking-Anfrage für ID', leagueId);
      
      const response = await fetch(`/api/leagues/${leagueId}/ranking`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      // Status-Code protokollieren
      console.log('Frontend: Liga-Ranking-Anfrage Status:', response.status);
      
      // Antwort als Text lesen
      const responseText = await response.text();
      console.log('Frontend: Liga-Ranking-Antwort Vorschau:', responseText.substring(0, 100));
      
      // Als JSON parsen
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (error) {
        console.error('Frontend: Fehler beim Parsen der Liga-Ranking-Antwort:', error);
        throw new Error('Fehler beim Abrufen der Liga-Tabelle: Die Antwort konnte nicht als JSON verarbeitet werden');
      }
      
      // Fehlerprüfung
      if (!response.ok || data.message) {
        const errorMessage = data.message || 'Fehler beim Abrufen der Liga-Tabelle';
        console.error('Frontend: Liga-Ranking-Anfrage fehlgeschlagen:', errorMessage);
        throw new Error(errorMessage);
      }
      
      // Datenstruktur protokollieren
      console.log('Frontend: Liga-Ranking-Datenstruktur:', Object.keys(data));
      if (data && data.us && Array.isArray(data.us)) {
        data.us = data.us.map(user => {
          if (user.uim && !user.uim.startsWith('http')) {
            user.uim = `https://kickbase.b-cdn.net/${user.uim}`;
          }
          return user;
        });
      }
      // Daten zurückgeben
      return data;
    } catch (error) {
      console.error('Kickbase API Fehler:', error);
      throw error;
    }
  }
}

// Singleton-Instanz exportieren
export const kickbaseAPI = new KickbaseAPI();

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(value);
};