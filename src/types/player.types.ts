export interface Player { // Füge 'export' hinzu
    id: string;
    firstName?: string;
    lastName?: string;
    teamId?: string;
    teamName?: string;
    position?: number;
    status?: number;
    marketValue?: number;
    points?: number;
    // Kickbase API fields
    i?: string;
    n?: string;
    fn?: string;
    ln?: string;
    pos?: number;
    st?: number;
    mv?: number;
    p?: number;
    ti?: string;
    tn?: string;
    // Weitere Eigenschaften
    originalData?: any;
    // Zusätzliche Felder aus API/Transformation
    mvgl?: number;  // Marktwert Gewinn/Verlust
    pim?: string;   // Player Image
  }