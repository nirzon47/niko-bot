import {
	type ChatInputCommandInteraction,
	MessageFlags,
	PermissionFlagsBits,
	type Role,
	SlashCommandBuilder,
} from "discord.js";
import { env } from "../../env";
import type { Command } from "../types";
import { exempted, usernames } from "./config";

export const autorole: Command = {
	data: new SlashCommandBuilder()
		.setName("autorole")
		.setDescription("Manage the Dalao role")
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("add")
				.setDescription("Assign the Dalao role to the configured members"),
		),

	async execute(interaction) {
		if (!interaction.inCachedGuild()) return;

		if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
			await interaction.reply({
				content: "❌ Only admins can use this command.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const role = interaction.guild.roles.cache.get(env.DALAO_ROLE_ID);
		if (!role) {
			await interaction.reply({
				content: "❌ Role not found. Check DALAO_ROLE_ID.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		if (!role.editable) {
			await interaction.reply({
				content: `❌ I can't manage ${role}. I need Manage Roles, and my highest role must be above it.`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		switch (interaction.options.getSubcommand()) {
			case "add":
				await add(interaction, role);
				break;
		}
	},
};

async function add(
	interaction: ChatInputCommandInteraction<"cached">,
	role: Role,
) {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	const members = await interaction.guild.members.fetch();
	let added = 0;
	const notFound: string[] = [];

	for (const username of usernames) {
		if (exempted.includes(username)) continue;

		const member = members.find((m) => m.user.username === username);
		if (!member) {
			notFound.push(username);
			continue;
		}

		try {
			await member.roles.add(role);
			added++;
		} catch (error) {
			console.error(`Failed to add ${role.name} to ${username}:`, error);
		}
	}

	await interaction.editReply(
		`✅ Assigned ${role} to ${added} members.\n❌ Not found: ${notFound.join(", ") || "none"}`,
	);
}
