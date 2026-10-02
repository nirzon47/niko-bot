import {
	Client,
	Events,
	GatewayIntentBits,
	MessageFlags,
	Partials,
} from "discord.js";
import { commands } from "./commands";
import { trackMessage, trackReaction } from "./commands/emotes/usage";
import { env } from "./env";
import { log } from "./logger";
import { replyToMention } from "./mentions";

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildExpressions,
	],
	partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.once(Events.ClientReady, (readyClient) => {
	log.info(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return;

	const command = commands.find((c) => c.data.name === interaction.commandName);
	if (!command) return;

	log.info(`${interaction.user.username} ran ${interaction.toString()}`);
	try {
		await command.execute(interaction);
	} catch (error) {
		log.error(`${interaction.toString()} failed`, error);
		const content = "❌ Something went wrong.";
		const logReplyError = (replyError: unknown) =>
			log.error("Failed to send the error reply", replyError);
		if (interaction.deferred || interaction.replied) {
			await interaction.editReply({ content }).catch(logReplyError);
		} else {
			await interaction
				.reply({ content, flags: MessageFlags.Ephemeral })
				.catch(logReplyError);
		}
	}
});

client.on(Events.MessageCreate, replyToMention);
client.on(Events.MessageCreate, trackMessage);
client.on(Events.MessageReactionAdd, trackReaction);

client.on(Events.Error, (error) => log.error("Client error", error));
client.on(Events.Warn, (message) => log.warn(message));

process.on("unhandledRejection", (error) => {
	log.error("Unhandled rejection", error);
	process.exit(1);
});
process.on("uncaughtException", (error) => {
	log.error("Uncaught exception", error);
	process.exit(1);
});

client.login(env.DISCORD_TOKEN);
