import { Player } from '@/types/player.types';
import { teamMapping } from './teamMapping';

export const getPositionName = (position: number) => {
    switch (position) {
      case 1: return 'Torwart';
      case 2: return 'Abwehr';
      case 3: return 'Mittelfeld';
      case 4: return 'Sturm';
      default: return 'Unbekannt';
    }
  };

  export const getStatusName = (status: number) => { // TODO  STRICKEN UND REHAB ADDEN
    switch (status) {
      case 0: return 'Fit';
      case 1: return 'Fit';
      case 2: return 'Angeschlagen';
      case 3: return 'Fraglich';
      default: return 'Fit';
    }
  };

  export const getTeamName = (teamId: string): string => {
    console.log(`getTeamName called with ID: '${teamId}' (Type: ${typeof teamId})`); // Logge die ID und ihren Typ
    const mappedName = teamMapping[teamId];
    console.log(` -> Mapped name: ${mappedName}`); // Logge das Ergebnis des Mappings
    return mappedName || `Team ID: ${teamId}`;
  };

    // Normalisiert Spielerdaten für einheitliche Darstellung
   export const normalizePlayer = (player: Player) => {
    // Logge die relevanten Felder aus den Originaldaten
    console.log(`Normalizing player: ${player.n || player.lastName}, Original ti: ${player.ti}, Original tn: ${player.tn}, Original teamId: ${player.teamId}`);

    const normalized = {
      id: player.id || player.i || '',
      firstName: player.firstName || player.fn || '',
      lastName: player.lastName || player.n || player.ln || '',
      teamId: player.teamId || player.ti || '',
      teamName: player.teamName || player.tn || '',
      position: player.position || player.pos || 0,
      status: player.status || player.st || 0,
      marketValue: player.marketValue || player.mv || 0,
      points: player.points || player.p || 0,
      mvgl: player.mvgl || (player.originalData && player.originalData.mvgl) || 0,
      pim: player.pim || (player.originalData && player.originalData.pim) || ''
    };

    console.log(` -> Resulting teamId: ${normalized.teamId}`); // Logge die ermittelte ID
    return normalized;
  };