/**
 * Game related type definitions
 */

/**
 * Player position types for team-based system
 */
export type PlayerPosition = "team1" | "team2" | "spectator" | string;

/**
 * Player in a game session
 */
export interface Player {
  nickname: string;
  position: PlayerPosition; // 팀 기반 포지션으로 변경
  isReady: boolean;
  isHost: boolean;
  clientId?: string; // 클라이언트 식별을 위한 고유 ID
}

/**
 * Game information structure returned by the API
 */
export interface GameInfo {
  code?: string; // 서버에서 반환하는 게임 코드 (대안)
  game: {
    gameCode: string;
    createdAt: number;
  };
  settings: {
    version: string;
    draftType: string; // "tournament", "hardFearless", "softFearless"
    playerType: string; // "single", "1v1"
    matchFormat: string; // "bo1", "bo3", "bo5"
    timeLimit: boolean;
    gameName?: string; // 경기 이름 필드 추가
    globalBans?: string[];
    bannerImage?: string;
  };
  status: {
    phase: number;
    team1Name: string; // 팀 1 이름
    team2Name: string; // 팀 2 이름
    team1Side: "blue" | "red"; // 팀 1의 현재 진영
    team2Side: "blue" | "red"; // 팀 2의 현재 진영
    lastUpdatedAt: number;
    phaseData: string[];
    setNumber: number; // Current set in the match
    previousSetPicks?: { [setKey: string]: string[] }; // 하드피어리스 모드를 위한 이전 세트 픽 정보
    // 하위 호환성을 위한 필드들
    blueTeamName: string;
    redTeamName: string;
  };
  clients: Player[]; // Connected clients/players
  team1Score?: number; // 팀 1 점수
  team2Score?: number; // 팀 2 점수
  results?: string[][]; // 각 세트별 결과 데이터 (phaseData 배열들)
  // 하위 호환성을 위한 필드들
  blueScore?: number; // Now at top level
  redScore?: number; // Now at top level
  bannerImage?: string; // Support for top-level banner image
}

/**
 * 챔피언 포지션 타입
 */
export type ChampionPosition = "탑" | "정글" | "미드" | "원딜" | "서폿";

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
  positions: ChampionPosition[]; // Champion positions
}
