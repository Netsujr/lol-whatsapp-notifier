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

## Riot API key

1. Log in at [developer.riotgames.com](https://developer.riotgames.com/).
2. Register an app / product and copy your **API key**.
3. Development keys expire after 24 hours; renew or use a production key for long-running use.

## WhatsApp QR login

- Session files are stored in `auth_info/` (do not commit this folder).
- If you log out or change devices, delete `auth_info/` and run again to scan a new QR code.
- Messages are sent to `WHATSAPP_NUMBER` (your own number is fine for testing).

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

## License

MIT
