# League of Legends → WhatsApp Notifier

Minimal TypeScript backend that sends a WhatsApp message when a specific League of Legends account finishes a new match.

## Requirements

- [Node.js](https://nodejs.org/) 18 or newer
- A [Riot Developer API key](https://developer.riotgames.com/)
- WhatsApp on your phone (for QR login)

## Install

```bash
npm install
```

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

## Run

```bash
npm run dev
```

Send a one-off test message (after WhatsApp is linked):

```bash
npm run test:message
```

On first run:

1. A QR code appears in the terminal — scan it with WhatsApp (**Settings → Linked devices → Link a device**).
2. The app saves the latest match ID without sending a message (so you do not get a false “new match” alert).
3. After that, you get a WhatsApp message only when a **new** match appears.

Checks run **once at startup** and then **every hour** (`0 * * * *`).

## Environment variables

| Variable | Description |
|----------|-------------|
| `RIOT_API_KEY` | Your Riot API key |
| `RIOT_REGION` | Regional routing for Match V5 (e.g. `americas`, `europe`, `asia`) |
| `LOL_REGION` | Platform region (e.g. `br1`, `na1`) — reserved for future use; account lookup uses `RIOT_REGION` |
| `RIOT_GAME_NAME` | In-game name (before the `#`) |
| `RIOT_TAG_LINE` | Tag line (after the `#`) |
| `WHATSAPP_NUMBER` | Recipient number with country code, digits only (e.g. `5511999999999`) |

See `.env.example` for a template.

## Riot API key (`RIOT_API_KEY`)

1. Open **[developer.riotgames.com](https://developer.riotgames.com/)** and sign in with your Riot account (same region as the game is fine).
2. On the **Dashboard**, find **Development API Key**.
3. Click **REGENERATE** (or copy the key shown). That string is your `RIOT_API_KEY`.
4. Paste it into `.env`:
   ```env
   RIOT_API_KEY=RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```
5. **Important:** Development keys **expire every 24 hours**. After expiry, regenerate on the dashboard and update `.env`, then restart the app (`pm2 restart lol-notifier`).

For a key that does not expire daily, you must [register a product/application](https://developer.riotgames.com/) and apply for a **personal** or **production** key. For testing on your Mac, the 24h dev key is enough.

## Run in the background on Mac (pm2)

Use this after WhatsApp is linked once (`npm run dev` + QR scan, or existing `auth_info/` folder).

```bash
# 1. Install pm2 globally (once)
npm install -g pm2

# 2. From the project folder — fill .env first (RIOT_API_KEY, WHATSAPP_NUMBER, etc.)
cd /path/to/lol-whatsapp-notifier

# 3. Start the bot (survives closing Terminal)
pm2 start ecosystem.config.cjs

# 4. Useful commands
pm2 logs lol-notifier      # live logs
pm2 status                 # running?
pm2 restart lol-notifier   # after .env change
pm2 stop lol-notifier
pm2 delete lol-notifier

# 5. Start pm2 again when you reboot the Mac (run once, follow the command it prints)
pm2 save
pm2 startup
```

Your Mac must stay **on and awake** (or allow sleep only on battery settings you accept). Closing Terminal/iTerm is fine once pm2 is running.

## WhatsApp QR login

- Session files are stored in `auth_info/` (do not commit this folder).
- If you log out or change devices, delete `auth_info/` and run again to scan a new QR code.
- Messages are sent to `WHATSAPP_NUMBER` (your own number is fine for testing).

### “Check your connection and try again” on your phone

This usually means the QR expired or the app reconnected while you were scanning. Try:

1. Stop the app (`Ctrl+C`).
2. Clear any partial session: `rm -rf auth_info`
3. Run `npm run dev` again.
4. On your phone: **WhatsApp → Settings → Linked devices → Link a device**.
5. Scan the **new** QR within ~60 seconds. If it fails, wait for the terminal to print another QR (do not restart the app).
6. Use stable Wi‑Fi on your phone; disable VPN if you use one.
7. Make sure phone and computer can reach the internet (Baileys talks to WhatsApp servers directly).

## Project layout

```text
src/
  index.ts      # cron + startup
  riot.ts       # Riot API
  whatsapp.ts   # Baileys client
  state.ts      # JSON persistence
  types.ts      # shared types
state.json      # last seen match ID
.env
```

## Build for production

```bash
npm run build
npm start
```

## Example notification

```text
New match finished!

Champion: Ahri
Result: Victory
KDA: 12/4/8
Duration: 31 mins
```

## Running 24/7 (without keeping your laptop open)

This app must run somewhere continuously. If your laptop is off, nothing checks for matches.

**Simple options:**

| Option | Cost | Notes |
|--------|------|--------|
| **VPS** (DigitalOcean, Hetzner, Oracle free tier) | ~$4–6/mo | Best fit: copy repo, `npm install`, `npm run build`, run with **pm2** or **systemd**. Keep `auth_info/` and `.env` on the server (upload once after QR scan locally, or scan QR on the server via SSH). |
| **Raspberry Pi / home server** | One-time hardware | Same as VPS but at home; use a UPS if you care about uptime. |
| **Your Mac, always on** | Free | `pm2 start npm --name lol-wa -- run dev` — only works while the Mac is awake and online. |

**Not ideal:** serverless (Lambda/Vercel) — Baileys needs a long-lived WebSocket and local `auth_info/`.

**After deploy:** use `pm2` so the process restarts on crash/reboot:

```bash
npm install -g pm2
pm2 start npm --name lol-notifier -- run start
pm2 save
pm2 startup
```

Copy `auth_info/` from your Mac to the server so you do not need to scan QR again (treat it like a password).

## License

MIT
