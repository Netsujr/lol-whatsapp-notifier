import axios, { type AxiosInstance } from "axios";
import type { MatchSummary, RiotAccount, RiotMatchResponse } from "./types.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function createRiotClient(): AxiosInstance {
  const apiKey = requireEnv("RIOT_API_KEY");
  return axios.create({
    headers: { "X-Riot-Token": apiKey },
    timeout: 15_000,
  });
}

function regionalBaseUrl(): string {
  return `https://${requireEnv("RIOT_REGION")}.api.riotgames.com`;
}

export async function fetchAccountByRiotId(): Promise<RiotAccount> {
  const client = createRiotClient();
  const gameName = requireEnv("RIOT_GAME_NAME");
  const tagLine = requireEnv("RIOT_TAG_LINE");
  const encodedName = encodeURIComponent(gameName);
  const encodedTag = encodeURIComponent(tagLine);
  const url = `${regionalBaseUrl()}/riot/account/v1/accounts/by-riot-id/${encodedName}/${encodedTag}`;

  const { data } = await client.get<RiotAccount>(url);
  return data;
}

export async function fetchLatestMatchId(puuid: string): Promise<string | null> {
  const client = createRiotClient();
  const url = `${regionalBaseUrl()}/lol/match/v5/matches/by-puuid/${puuid}/ids`;
  const { data } = await client.get<string[]>(url, {
    params: { start: 0, count: 1 },
  });

  return data[0] ?? null;
}

export async function fetchMatchSummary(
  matchId: string,
  puuid: string,
): Promise<MatchSummary> {
  const client = createRiotClient();
  const url = `${regionalBaseUrl()}/lol/match/v5/matches/${matchId}`;
  const { data } = await client.get<RiotMatchResponse>(url);

  const participant = data.info.participants.find((p) => p.puuid === puuid);
  if (!participant) {
    throw new Error(`Participant not found in match ${matchId}`);
  }

  return {
    matchId: data.metadata.matchId,
    championName: participant.championName,
    kills: participant.kills,
    deaths: participant.deaths,
    assists: participant.assists,
    win: participant.win,
    gameDurationSeconds: data.info.gameDuration,
  };
}

export function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 1) {
    return "< 1 min";
  }
  return `${totalMinutes} min${totalMinutes === 1 ? "" : "s"}`;
}

export function formatMatchMessage(summary: MatchSummary): string {
  const result = summary.win ? "Victory" : "Defeat";
  const kda = `${summary.kills}/${summary.deaths}/${summary.assists}`;
  const duration = formatDuration(summary.gameDurationSeconds);

  return [
    "New match finished!",
    "",
    `Champion: ${summary.championName}`,
    `Result: ${result}`,
    `KDA: ${kda}`,
    `Duration: ${duration}`,
  ].join("\n");
}
