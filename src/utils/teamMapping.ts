// src/utils/teamMapping.ts (Empfohlener Ort)

export interface TeamMapEntry {
  name: string;
  logo: string; // Path to the logo (SVG oder PNG)
}

export const teamMapping: Record<string, TeamMapEntry> = {
  "13": { name: "Augsburg", logo: "content/file/8d68c946b9774505b8292adfa910d0a0.svg" },
  "2": { name: "Bayern", logo: "content/file/ff70df040a9f4179a7b45219225a2273.svg" },
  "24": { name: "Bochum", logo: "content/file/14ab924f96264bc89ada2be8fb3a0421.svg" }, // API sagt ID 24, nicht 23
  "9": { name: "Stuttgart", logo: "content/file/9a1bb78d0ccf45f895797c0c6d8c4d40.svg" }, // API sagt ID 9, nicht 5
  "18": { name: "Mainz", logo: "content/file/d4ac9675b44944039d463837f888cb1c.svg" }, // API sagt ID 18, nicht 11
  "51": { name: "Kiel", logo: "content/file/69548ff0da384343aaa6e2c9abe9f192.svg" },
  "5": { name: "Freiburg", logo: "content/file/6c1a9f14b668493283f966834891aa70.svg" }, // API sagt ID 5, nicht 12
  "3": { name: "Dortmund", logo: "content/file/dc3d63ae79bf4282a4107bafcd572b99.svg" }, // API sagt ID 3, nicht 2
  "50": { name: "Heidenheim", logo: "content/file/f387dd39aafb47d0b4863381fc4a521c.svg" }, // API sagt ID 50, nicht 26
  "7": { name: "Leverkusen", logo: "content/file/e06a055a6eaf4fd7bebfadb35037f957.svg" },
  "43": { name: "Leipzig", logo: "content/file/29ceb88867954b548ca9e27d39d050c2.svg" }, // API sagt ID 43, nicht 36
  "14": { name: "Hoffenheim", logo: "content/file/5212904732a04199aab426e44067347c.svg" }, // API sagt ID 14, nicht 8
  "10": { name: "Bremen", logo: "content/file/a7e609e72fb04c6d8c96e8ed82f0315d.svg" }, // API sagt ID 10, nicht 9
  "4": { name: "Frankfurt", logo: "content/file/422de82bee3b47eb898699d6d27095ba.svg" }, // API sagt ID 4, nicht 3
  "39": { name: "St. Pauli", logo: "content/file/cae200d5499e43c4a5c382a1fbb25435.svg" }, // API sagt ID 39, nicht 40
  "15": { name: "M'gladbach", logo: "content/file/7178ef92ad0747a5ad1a05d0783f5088.svg" },
  "40": { name: "Union Berlin", logo: "content/file/8f4c7c08ee9b4dca85c28260fc5917bd.svg" }, // API sagt ID 40, nicht 21
  "11": { name: "Wolfsburg", logo: "content/file/f23d72a0cf2d48a2a29ede777110aece.svg" }, // API sagt ID 11, nicht 6

};

// Fallback bleibt gleich
export const fallbackTeamData: TeamMapEntry = {
  name: "Unbekannt",
  logo: ""
};