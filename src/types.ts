export interface AppState {
  lastMatchId: string;
}

export interface MatchSummary {
  matchId: string;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  gameDurationSeconds: number;
}

export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface RiotMatchParticipant {
  puuid: string;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
}

export interface RiotMatchInfo {
  gameDuration: number;
  participants: RiotMatchParticipant[];
}

export interface RiotMatchResponse {
  metadata: { matchId: string };
  info: RiotMatchInfo;
}
