export interface League {
  id: string;
  name: string;
  memberCount: number;
  image?: string; // Aus der transformierten Antwort in /api/leagues
  // Füge hier weitere Felder hinzu, falls von anderen Endpunkten benötigt
}

// Optional könntest du hier auch Typen für die Roh-API-Antwort definieren,
// falls du eine striktere Typisierung in den API-Routen selbst möchtest.
// export interface RawKickbaseLeague {
//   i: string;
//   n: string;
//   lpc?: number;
//   f?: string; // Original Feld für Bild
// }
