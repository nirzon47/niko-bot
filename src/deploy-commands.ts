import { REST, Routes } from "discord.js";
import { commands } from "./commands";
import { env } from "./env";
import { log } from "./logger";

const rest = new REST().setToken(env.DISCORD_TOKEN);

await rest.put(Routes.applicationGuildCommands(env.CLIENT_ID, env.GUILD_ID), {
	body: commands.map((command) => command.data.toJSON()),
});

log.info(`Deployed ${commands.length} commands`);
