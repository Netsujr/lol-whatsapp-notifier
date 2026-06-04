import "dotenv/config";
import { sendWhatsAppMessage } from "./whatsapp.js";

const gameName = process.env.RIOT_GAME_NAME ?? "Zaczao";
const tagLine = process.env.RIOT_TAG_LINE ?? "007";

await sendWhatsAppMessage(
  [
    "LoL notifier test",
    "",
    `Tracking: ${gameName}#${tagLine}`,
    "WhatsApp is working. Match alerts will appear here after each new game.",
  ].join("\n"),
);

console.log("Test message sent.");
