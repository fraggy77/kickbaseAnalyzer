// src/lib/kickbase-api.ts

const BASE_URL = 'https://api.kickbase.de/v1';

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
      const response = await fetch(`${BASE_URL}/user/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Kickbase Analyzer',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Login fehlgeschlagen: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      this.token = data.token;
      this.userId = data.user.id;
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
    return this.fetch('/leagues');
  }

  /**
   * Detaillierte Informationen über eine Liga abrufen
   */
  async getLeagueDetails(leagueId: string): Promise<any> {
    return this.fetch(`/leagues/${leagueId}`);
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