import "dotenv/config";
import cron from "node-cron";
import pino from "pino";
import {
  fetchAccountByRiotId,
  fetchLatestMatchId,
  fetchMatchSummary,
  formatMatchMessage,
} from "./riot.js";
import { readState, writeState } from "./state.js";
import { connectWhatsApp, sendWhatsAppMessage } from "./whatsapp.js";

const log = pino({ level: "info" });

let checkInProgress = false;

async function checkForNewMatch(): Promise<void> {
  if (checkInProgress) {
    log.info("Previous check still running, skipping.");
    return;
  }

  checkInProgress = true;

  try {
    log.info("Checking for new matches...");

    const account = await fetchAccountByRiotId();
    log.info({ puuid: account.puuid }, "Riot account loaded");

    const latestMatchId = await fetchLatestMatchId(account.puuid);
    if (!latestMatchId) {
      log.info("No matches found for this account.");
      return;
    }

    const state = await readState();

    if (!state.lastMatchId) {
      await writeState({ lastMatchId: latestMatchId });
      log.info(
        { matchId: latestMatchId },
        "First run: saved latest match without notifying.",
      );
      return;
    }

    if (latestMatchId === state.lastMatchId) {
      log.info({ matchId: latestMatchId }, "No new match.");
      return;
    }

    log.info({ matchId: latestMatchId }, "New match detected!");

    const summary = await fetchMatchSummary(latestMatchId, account.puuid);
    const message = formatMatchMessage(summary);

    await sendWhatsAppMessage(message);
    await writeState({ lastMatchId: latestMatchId });

    log.info({ matchId: latestMatchId }, "Notification sent and state updated.");
  } catch (error) {
    log.error({ err: error }, "Match check failed");
  } finally {
    checkInProgress = false;
  }
}

async function main(): Promise<void> {
  log.info("LoL → WhatsApp notifier starting...");

  await connectWhatsApp();

  await checkForNewMatch();

  cron.schedule("0 * * * *", () => {
    void checkForNewMatch();
  });

  log.info("Scheduled hourly checks (0 * * * *).");
}

main().catch((error: unknown) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
