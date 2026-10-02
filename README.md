# niko-bot

Discord bot built with Bun and discord.js.

## Setup

1. `bun install`
2. Copy `.env.example` to `.env` and fill it in.
3. In the Discord Developer Portal, turn on **Server Members Intent** for the bot.
4. `bun run deploy` to register the slash commands.

## Scripts

- `bun start`: run the bot
- `bun run deploy`: register slash commands in the server (rerun after changing commands)
- `bun run check`: lint, format check and typecheck
- `bun run format`: format all files
