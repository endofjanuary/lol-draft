/**
 * Game related type definitions
 */

/**
 * Player in a game session
 */
export interface Player {
  nickname: string;
  position: string;
  isReady: boolean;
  isHost: boolean;
}

/**
 * Game information structure returned by the API
 */
export interface GameInfo {
  game: {
    gameCode: string;
    createdAt: number;
  };
  settings: {
    version: string;
    draftType: string; // "tournament", "hardFearless", "softFearless"
    playerType: string; // "single", "1v1", "5v5"
    matchFormat: string; // "bo1", "bo3", "bo5"
    timeLimit: boolean;
  };
  status: {
    phase: number;
    blueTeamName: string;
    redTeamName: string;
    lastUpdatedAt: number;
    phaseData: string[];
    setNumber: number; // Current set in the match
    // Scores removed from here as they are now at the top level
  };
  clients: Player[]; // Connected clients/players
  blueScore?: number; // Now at top level
  redScore?: number; // Now at top level
}

/**
 * Champion data from Riot API
 */
export interface ChampionData {
  id: string; // Champion identifier (e.g., "Aatrox")
  key: string; // Champion numeric key
  name: string; // Champion display name
  image: {
    full: string; // Filename of champion image
  };
}
