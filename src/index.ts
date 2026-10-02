import { Client, Events, GatewayIntentBits, MessageFlags } from "discord.js";
import { commands } from "./commands";
import { env } from "./env";

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once(Events.ClientReady, (readyClient) => {
	console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return;

	const command = commands.find((c) => c.data.name === interaction.commandName);
	if (!command) return;

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(`/${interaction.commandName} failed:`, error);
		const content = "❌ Something went wrong.";
		if (interaction.deferred || interaction.replied) {
			await interaction.editReply({ content }).catch(console.error);
		} else {
			await interaction
				.reply({ content, flags: MessageFlags.Ephemeral })
				.catch(console.error);
		}
	}
});

client.login(env.DISCORD_TOKEN);
