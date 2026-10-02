# niko-bot

Discord bot built with Bun and discord.js.

## Setup

1. `bun install`
2. Copy `.env.example` to `.env` and fill it in.
3. In the Discord Developer Portal, turn on **Server Members Intent** and **Message Content Intent** for the bot.
4. `bun run deploy` to register the slash commands.

## Docker

1. Do steps 2 and 3 of Setup.
2. `mkdir -p data`, so the bot can write its saved lists and logs there as your user.
3. `docker compose up -d --build` to build and start the bot. It restarts by itself after a crash, and after a reboot if Docker starts on boot.
4. `docker compose exec bot bun run deploy` to register the slash commands (rerun after changing commands).

The saved lists and logs live in `data/`. Log times are in UTC unless you set `TZ` in `.env` to your timezone, for example `TZ=America/New_York`.

## Scripts

- `bun start`: run the bot
- `bun run deploy`: register slash commands in the server (rerun after changing commands)
- `bun run check`: lint, format check and typecheck
- `bun run format`: format all files
