// Mapping zwischen Team-IDs und vollständigen Namen
export const teamIdToName: Record<string, string> = {
    "1": "FC Bayern München",
    "2": "Borussia Dortmund",
    "3": "Eintracht Frankfurt",
    "4": "1. FC Köln",
    "5": "VfB Stuttgart",
    "6": "VfL Wolfsburg",
    "7": "Bayer 04 Leverkusen",
    "8": "TSG Hoffenheim",
    "9": "SV Werder Bremen",
    "10": "FC Schalke 04",
    "11": "1. FSV Mainz 05",
    "12": "SC Freiburg",
    "13": "FC Augsburg",
    "14": "Hertha BSC",
    "15": "Borussia Mönchengladbach",
    "16": "Hamburger SV",
    "17": "Hannover 96",
    "18": "1. FC Nürnberg",
    "19": "Fortuna Düsseldorf",
    "20": "SC Paderborn 07",
    "21": "1. FC Union Berlin",
    "22": "Arminia Bielefeld",
    "23": "VfL Bochum",
    "24": "SpVgg Greuther Fürth",
    "25": "SV Darmstadt 98",
    "26": "1. FC Heidenheim",
    "36": "RB Leipzig",
    "40": "FC St. Pauli",
    // Füge weitere Teams hinzu, wenn nötig
  };
  
  // Funktion zum Abrufen des Teamnamens aus der ID
  export function getTeamName(id: string | undefined): string {
    if (!id) return "Unbekannt";
    return teamIdToName[id] || id; // Wenn kein Name gefunden wird, gib die ID zurück
  }
  
  // Funktion zum Abrufen eines kurzen Teamnamens (ohne FC, etc.)
  export function getShortTeamName(id: string | undefined): string {
    if (!id) return "Unbekannt";
    const fullName = teamIdToName[id] || id;
    
    // Entferne typische Präfixe
    return fullName
      .replace("1. FC ", "")
      .replace("FC ", "")
      .replace("VfL ", "")
      .replace("VfB ", "")
      .replace("SC ", "")
      .replace("SV ", "")
      .replace("TSG ", "")
      .replace("SpVgg ", "")
      .replace("Borussia ", "");
  }