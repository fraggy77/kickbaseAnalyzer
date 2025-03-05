// src/lib/kickbase-api.ts

const BASE_URL = 'https://api.kickbase.de/v4';

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
  // Ändere die Methode login
  async login(email: string, password: string): Promise<KickbaseUser> {
    try {
      console.log('Frontend: Login attempt with', email);
      
      // Wichtig: Hier verwenden wir UNSERE eigene API-Route, nicht direkt die Kickbase-API
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
  
      console.log('Frontend: Response status:', response.status);
      
      const responseText = await response.text();
      console.log('Frontend: Response text preview:', responseText.substring(0, 200));
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (error) {
        console.error('Frontend: JSON parse error', error);
        console.log('Frontend: Full response:', responseText);
        throw new Error('Login fehlgeschlagen: Ungültiges Antwortformat');
      }
      
      if (!response.ok) {
        throw new Error(data.message || 'Login fehlgeschlagen');
      }
  
      this.token = data.token;
      this.userId = data.user?.id;
      this.email = email;
      
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
      'User-Agent': 'Kickbase Analyzer',
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
   * Ligen des Benutzers abrufen
   */
  async getLeagues(): Promise<League[]> {
    try {
      if (!this.token) {
        throw new Error('Nicht eingeloggt');
      }
      
      const response = await fetch('/api/leagues', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Abrufen der Ligen');
      }
  
      return await response.json();
    } catch (error) {
      console.error('Kickbase API Fehler:', error);
      throw error;
    }
  }

  /**
   * Team des Benutzers in einer bestimmten Liga abrufen
   */
  async getTeam(leagueId: string): Promise<any> {
    return this.fetch(`/leagues/${leagueId}/me`);
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