// src/lib/kickbase-api.ts

import type { League } from '@/types/league.types';
import type { Player } from '@/types/player.types';

const BASE_URL = 'https://api.kickbase.com/v4';

interface KickbaseUser {
  token: string;
  user: {
    id: string;
    name?: string;
    email?: string;
  };
}

interface LoginResponseData {
  token: string;
  user: {
    id: string;
    name?: string;
    email?: string;
  };
  leagues: League[];
}

interface MarketPlayer extends Player {
    price: number;
    expiryDate: string;
    exs: number;
    mvt?: number;
    ap?: number;
    seller?: { id: string; name: string; profileImage?: string; } | null;
}

interface MarketResponse {
    marketPlayers: MarketPlayer[];
}

// Define the type for the competition table API response item
interface BundesligaTeam {
  tid: string;
  tn: string;
  cpl: number;
  sp: number;
  tim: string;
  // Add other fields if needed by the frontend later
}

// --- Team Profile Types ---
interface TeamProfilePlayer {
  i: string;      // Player ID
  n: string;      // Player Last Name
  lst?: number;    // Liga Status?
  st?: number;     // Status (Fit, Injured, etc.)
  pos?: number;    // Position
  mv?: number;     // Market Value
  mvt?: number;    // Market Value Trend
  ap?: number;     // Average Points
  iotm?: boolean;  // In official Transfer Market?
  ofc?: number;
  tid?: string;    // Team ID
  sdmvt?: number;  // Seven Day Market Value Trend?
  mvgl?: number;   // Market Value Gain/Loss (overall?)
  pim?: string;    // Player Image path
}

interface TeamProfileResponse {
  tid: string;         // Team ID
  tn: string;          // Team Name
  pl: number;          // Placement (Bundesliga Rank?)
  tv: number;          // Team Value
  tw: number;          // Team Wins
  td: number;          // Team Draws
  tl: number;          // Team Losses
  it: TeamProfilePlayer[]; // Array of Players
  npt: number;         // Number of Players Total?
  avpcl: boolean;
  tim: string;         // Team Image path
  pclpurl?: string;     // Placeholder Logo?
  plpurl?: string;      // Placeholder Logo?
}
// --- End Team Profile Types ---

class KickbaseAPI {
  token: string | null = null;
  userId: string | null = null;
  email: string | null = null;

  /**
   * Bei Kickbase einloggen und Token/User/Ligen speichern/zurückgeben
   */
  async login(email: string, password: string): Promise<LoginResponseData> {
    try {
      console.log('Frontend: Login-Versuch mit', email);

      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      let data: LoginResponseData;
      try {
        data = await response.json();
      } catch (error) {
        console.error('Frontend: JSON-Parse-Fehler von /api/auth', error);
        const statusText = response.statusText || 'Unbekannter Status';
        throw new Error(`Login fehlgeschlagen: Ungültiges Antwortformat von der internen API (Status: ${response.status} ${statusText})`);
      }

      if (!response.ok || data.message) {
         throw new Error((data as any).message || 'Login fehlgeschlagen (API-Antwort nicht ok)');
      }

      if (!data.token || !data.user) {
        console.error('Frontend: Kein Token oder User in der Antwort von /api/auth', data);
        throw new Error('Login fehlgeschlagen: Unvollständige Daten von interner API erhalten');
      }

      this.token = data.token;
      this.userId = data.user.id;
      this.email = email;

      console.log('Frontend: Login erfolgreich - Benutzer-ID:', this.userId);

      return data;
    } catch (error: any) {
      console.error('Kickbase Login Fehler:', error);
      throw error;
    }
  }

  /**
   * Hilfsfunktion für authentifizierte API-Anfragen (Intern, keine Logs hier)
   */
  private async _fetchInternal(apiPath: string, method: 'GET' | 'POST' = 'GET'): Promise<any> {
    if (!this.token) {
      throw new Error('Nicht eingeloggt');
    }
    const response = await fetch(apiPath, {
      method: method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    const responseText = await response.text();

    if (!response.ok) {
      let errorMessage = `Fehler bei Anfrage ${apiPath}: ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorMessage;
      } catch { /* Ignore parse error for error message */ }
      console.error(`Frontend: Anfrage fehlgeschlagen (${apiPath}):`, errorMessage, responseText.substring(0, 100));
      if (response.status === 401) { // Handle 401 specifically
          localStorage.removeItem('kickbaseUser'); // Clear local storage
          // Optionally redirect to login, maybe throw specific error
          throw new Error('Authentifizierung fehlgeschlagen (401)');
      }
      throw new Error(errorMessage);
    }

    try {
      const data = JSON.parse(responseText);
      // console.log(`Frontend: Daten für ${apiPath} empfangen`); // Optional: Enable for debugging
      return data;
    } catch (error) {
      console.error(`Frontend: Fehler beim Parsen der Antwort für ${apiPath}:`, error, responseText.substring(0, 100));
      throw new Error(`Fehler beim Verarbeiten der Daten für ${apiPath}`);
    }
  }
  
  

  /**
   * Liga-Details abrufen
   */
  async getLeagueDetails(leagueId: string): Promise<any> {
    try {
      // console.log('Frontend: Liga-Details-Anfrage für ID', leagueId); // Optional: Enable for debugging
      return await this._fetchInternal(`/api/leagues/${leagueId}/overview`);
    } catch (error) {
      console.error(`Kickbase API Fehler (getLeagueDetails ${leagueId}):`, error);
      throw error;
    }
  }

  /**
   * Ligen des Benutzers abrufen
   */
  async getLeagues(): Promise<League[]> {
    try {
      // console.log('Frontend: Ligen-Anfrage'); // Optional: Enable for debugging
      const data = await this._fetchInternal('/api/leagues');
      if (!Array.isArray(data)) {
        console.error('Frontend: Unerwartetes Datenformat, Array erwartet:', data);
        throw new Error('Fehler beim Abrufen der Ligen: Unerwartetes Datenformat');
      }
      return data;
    } catch (error) {
      console.error('Kickbase API Fehler (getLeagues):', error);
      throw error;
    }
  }

  /**
   * Ruft die /me-Daten für eine Liga ab (Budget etc.)
   */
  async getLeagueMe(leagueId: string): Promise<any> {
    try {
      // console.log('Frontend: /me Anfrage für Liga', leagueId); // Optional: Enable for debugging
      return await this._fetchInternal(`/api/leagues/${leagueId}/me`);
    } catch (error) {
      console.error(`Kickbase API Fehler (getLeagueMe ${leagueId}):`, error);
      throw error;
    }
  }

  /**
   * Ruft den Kader eines bestimmten Managers in einer Liga ab.
   */
  async getManagerSquad(leagueId: string, userId: string): Promise<any> {
    try {
      // console.log(`Frontend: Manager-Squad Anfrage für Liga ${leagueId}, User ${userId}`); // Optional: Enable for debugging
      return await this._fetchInternal(`/api/leagues/${leagueId}/managers/${userId}/squad`);
    } catch (error) {
      console.error(`Kickbase API Fehler (getManagerSquad ${leagueId}/${userId}):`, error);
      throw error;
    }
  }

  /**
   * Ruft die Performance-Daten eines Managers ab.
   */
  async getManagerPerformance(leagueId: string, userId: string): Promise<any> {
    try {
      // console.log(`Frontend: Performance Anfrage für Liga ${leagueId}, User ${userId}`); // Optional: Enable for debugging
      return await this._fetchInternal(`/api/leagues/${leagueId}/managers/${userId}/performance`);
    } catch (error) {
      console.error(`Kickbase API Fehler (getManagerPerformance ${leagueId}/${userId}):`, error);
      throw error;
    }
  }

  /**
   * Spieltags-Daten mit Match-IDs abrufen
   */
  async getMatchday(day?: number): Promise<any> {
    try {
      const url = day ? `/api/matches/matchday?day=${day}` : '/api/matches/matchday';
      // console.log('Frontend: Spieltags-Anfrage' + (day ? ` für Tag ${day}` : '')); // Optional: Enable for debugging
      return await this._fetchInternal(url);
    } catch (error) {
      console.error(`Kickbase API Fehler (getMatchday ${day || 'current'}):`, error);
      throw error;
    }
  }

  /**
   * Team des Benutzers in einer bestimmten Liga abrufen (identisch zu getSquad für den eingeloggten User)
   */
  async getSquad(leagueId: string): Promise<any> {
    try {
      // console.log('Frontend: Squad-Anfrage für Liga', leagueId); // Optional: Enable for debugging
      return await this._fetchInternal(`/api/leagues/${leagueId}/squad`);
    } catch (error) {
      console.error(`Kickbase API Fehler (getSquad ${leagueId}):`, error);
      throw error;
    }
  }

  /**
   * Liga-Tabelle abrufen
   */
  async getLeagueRanking(leagueId: string): Promise<any> {
    try {
      // console.log('Frontend: Liga-Ranking-Anfrage für ID', leagueId); // Optional: Enable for debugging
      const data = await this._fetchInternal(`/api/leagues/${leagueId}/ranking`);

      // Bild-URLs korrigieren
      if (data && data.us && Array.isArray(data.us)) {
        data.us = data.us.map(user => {
          if (user.uim && !user.uim.startsWith('http')) {
            // Prüfen ob es schon der cdn pfad ist
            if (!user.uim.startsWith('users/')) {
                 user.uim = `https://kickbase.b-cdn.net/${user.uim}`;
            } else {
                 user.uim = `https://kickbase.b-cdn.net/user/${user.i}/${user.uim}`; // Annahme: user ID 'i' ist verfügbar
            }
          }
          return user;
        });
      }
      return data;
    } catch (error) {
      console.error(`Kickbase API Fehler (getLeagueRanking ${leagueId}):`, error);
      throw error;
    }
  }

  /**
   * Ruft die Startelf-IDs eines Managers ab.
   */
  async getManagerTeamcenter(leagueId: string, userId: string): Promise<{ startingPlayerIds: string[] }> {
    try {
      // console.log(`Frontend: Teamcenter Anfrage für Liga ${leagueId}, User ${userId}`); // Optional
      // *** KORREKTER PFAD HIER: /managers/ statt /users/ ***
      const data = await this._fetchInternal(`/api/leagues/${leagueId}/managers/${userId}/teamcenter`);
      // Erwarte ein Objekt { startingPlayerIds: [...] } zurück
      if (!data || !Array.isArray(data.startingPlayerIds)) {
          console.warn("Unerwartete Antwort von /api/.../managers/.../teamcenter:", data);
          return { startingPlayerIds: [] }; // Leeres Array als Fallback
      }
      return data;
    } catch (error) {
      console.error(`Kickbase API Fehler (getManagerTeamcenter ${leagueId}/${userId}):`, error);
      // Gib bei Fehler ein leeres Array zurück, damit das Frontend nicht crasht
      return { startingPlayerIds: [] };
    }
  }

  /**
   * Ruft die Transfermarkt-Daten für eine Liga ab.
   */
  async getMarket(leagueId: string): Promise<MarketResponse> {
    try {
      // console.log(`Frontend: Market Anfrage für Liga ${leagueId}`); // Optional
      const data = await this._fetchInternal(`/api/leagues/${leagueId}/market`);

      // Erwarte ein Objekt { marketPlayers: [...] }
      if (!data || !Array.isArray(data.marketPlayers)) {
          console.warn("Unerwartete Antwort von /api/leagues/.../market:", data);
          return { marketPlayers: [] }; // Leeres Array als Fallback
      }
      return data;
    } catch (error) {
      console.error(`Kickbase API Fehler (getMarket ${leagueId}):`, error);
      return { marketPlayers: [] }; // Leeres Array bei Fehler
    }
  }

  /**
   * Ruft die Tabelle einer Competition (z.B. Bundesliga) ab.
   * Calls the internal API route using the authenticated fetch helper.
   */
  async getCompetitionTable(competitionId: string): Promise<BundesligaTeam[]> {
    try {
      // Use _fetchInternal to automatically send auth token to our internal route
      const data = await this._fetchInternal(`/api/competitions/${competitionId}/table`);
      
      // Validation happens within _fetchInternal and the API route
      if (!Array.isArray(data)) {
          console.error("Unerwartete Antwort von /api/competitions/.../table, Array erwartet:", data);
          throw new Error("Ungültiges Datenformat für Competition-Tabelle erhalten");
      }
      return data;
    } catch (error) {
      console.error(`Kickbase API Fehler (getCompetitionTable ${competitionId}):`, error);
      throw error; // Re-throw
    }
  }

  /**
   * Ruft das Profil eines Bundesliga-Teams ab.
   * Calls the internal API route using the authenticated fetch helper.
   */
  async getTeamProfile(competitionId: string, teamId: string): Promise<TeamProfileResponse> {
    try {
      // console.log(`Frontend: Team Profile Anfrage für Comp ${competitionId}, Team ${teamId}`);
      const data = await this._fetchInternal(`/api/competitions/${competitionId}/teams/${teamId}/profile`);
      
      // Basic validation (more specific checks could be added)
      if (!data || typeof data !== 'object' || !Array.isArray(data.it)) {
          console.error("Unerwartete Antwort von /api/competitions/.../teams/.../profile:", data);
          throw new Error("Ungültiges Datenformat für Team-Profil erhalten");
      }
      return data as TeamProfileResponse; // Cast to the specific type
    } catch (error) {
      console.error(`Kickbase API Fehler (getTeamProfile ${competitionId}/${teamId}):`, error);
      throw error; // Re-throw
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

// Exportiere formatCurrency, falls es woanders genutzt wird
export { formatCurrency };