import "dotenv/config";
import { fetchAccountByRiotId, fetchLatestMatchId, fetchMatchSummary } from "./riot.js";
import { sendWhatsAppMessage } from "./whatsapp.js";

async function main(): Promise<void> {
  const account = await fetchAccountByRiotId();
  const latestMatchId = await fetchLatestMatchId(account.puuid);

  let lastGame = "No recent match found.";
  if (latestMatchId) {
    const summary = await fetchMatchSummary(latestMatchId, account.puuid);
    const result = summary.win ? "Victory" : "Defeat";
    lastGame = `Last game: ${summary.championName} — ${result} (${summary.kills}/${summary.deaths}/${summary.assists})`;
  }

  const message = [
    "LoL notifier test",
    "",
    `Tracking: ${account.gameName}#${account.tagLine}`,
    lastGame,
    "",
    "You will get a message here after each new match.",
  ].join("\n");

  await sendWhatsAppMessage(message);
  console.log("Test message sent.");
}

main().catch((error: unknown) => {
  console.error("Test failed:", error);
  process.exit(1);
});
