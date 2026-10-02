import {
	type ChatInputCommandInteraction,
	EmbedBuilder,
	inlineCode,
	MessageFlags,
	ModalBuilder,
	PermissionFlagsBits,
	type Role,
	roleMention,
	SlashCommandBuilder,
	TextInputStyle,
} from "discord.js";
import { env } from "../../env";
import { readJson, writeJson } from "../../storage";
import type { Command } from "../types";
import { exempted } from "./config";

export const autorole: Command = {
	data: new SlashCommandBuilder()
		.setName("autorole")
		.setDescription("Manage the Dalao role")
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("import")
				.setDescription("Import usernames from a page of Activity Rank's /top"),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("clear")
				.setDescription("Clear the imported usernames"),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("assign")
				.setDescription("Assign the Dalao role to the imported usernames"),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("remove")
				.setDescription("Remove the Dalao and perk roles from everyone"),
		)
		.addSubcommandGroup((group) =>
			group
				.setName("perks")
				.setDescription("Manage the perk roles that come with Dalao")
				.addSubcommand((subcommand) =>
					subcommand
						.setName("list-roles")
						.setDescription("List the perk roles"),
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName("add-role")
						.setDescription("Add a role to the perk list")
						.addRoleOption((option) =>
							option
								.setName("role")
								.setDescription("The role to add")
								.setRequired(true),
						),
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName("remove-role")
						.setDescription("Remove a role from the perk list")
						.addRoleOption((option) =>
							option
								.setName("role")
								.setDescription("The role to remove")
								.setRequired(true),
						),
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName("reset-roles")
						.setDescription("Remove the perk roles from everyone"),
				),
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

		const group = interaction.options.getSubcommandGroup();
		const subcommand = interaction.options.getSubcommand();
		switch (group ? `${group} ${subcommand}` : subcommand) {
			case "import":
				await importUsernames(interaction);
				break;
			case "clear":
				await clear(interaction);
				break;
			case "assign":
				await assign(interaction, role);
				break;
			case "remove":
				await removeRoles(interaction, [role.id, ...perkRoles]);
				break;
			case "perks list-roles":
				await listPerkRoles(interaction);
				break;
			case "perks add-role":
				await addPerkRole(interaction);
				break;
			case "perks remove-role":
				await removePerkRole(interaction);
				break;
			case "perks reset-roles":
				await resetPerkRoles(interaction);
				break;
		}
	},
};

interface Store {
	imported: string[];
	perkRoles: string[];
}

const STORE_PATH = "data/autorole.json";
const store = readJson<Store>(STORE_PATH, { imported: [], perkRoles: [] });
const imported = new Set(store.imported);
const perkRoles = new Set(store.perkRoles);

function save() {
	writeJson<Store>(STORE_PATH, {
		imported: [...imported],
		perkRoles: [...perkRoles],
	});
}

const IMPORT_TIMEOUT_MS = 15 * 60 * 1000;
const MAX_DESCRIPTION_LENGTH = 4096;

async function importUsernames(
	interaction: ChatInputCommandInteraction<"cached">,
) {
	const customId = `autorole-import-${interaction.id}`;
	await interaction.showModal(
		new ModalBuilder()
			.setCustomId(customId)
			.setTitle("Import from Activity Rank")
			.addLabelComponents((label) =>
				label
					.setLabel("Paste a page of /top")
					.setTextInputComponent((input) =>
						input.setCustomId("top").setStyle(TextInputStyle.Paragraph),
					),
			),
	);

	const submission = await interaction
		.awaitModalSubmit({
			filter: (i) => i.customId === customId,
			time: IMPORT_TIMEOUT_MS,
		})
		.catch(() => null);
	if (!submission) return;

	const { found, skipped } = parseTop(
		submission.fields.getTextInputValue("top"),
	);
	const before = imported.size;
	for (const name of found) imported.add(name);
	save();

	const list = formatNames([...imported]);
	await submission.reply({
		content: `✅ Found ${found.length}, ${imported.size - before} new\n⏭️ Skipped: ${formatNames(skipped)}`,
		embeds: [
			new EmbedBuilder()
				.setTitle(`📋 ${imported.size} imported`)
				.setDescription(
					list.length > MAX_DESCRIPTION_LENGTH
						? `${list.slice(0, MAX_DESCRIPTION_LENGTH - 1)}…`
						: list,
				),
		],
		flags: MessageFlags.Ephemeral,
	});
}

const USERNAME_PATTERN = /^[a-z0-9_.]{2,32}$/;

function parseTop(text: string) {
	const found: string[] = [];
	const skipped: string[] = [];

	for (const line of text.split("\n")) {
		const [rank, name] = line.trim().split(/\s+/);
		if (!rank?.startsWith("#") || !name) continue;

		if (USERNAME_PATTERN.test(name) && !exempted.includes(name)) {
			found.push(name);
		} else {
			skipped.push(name);
		}
	}

	return { found, skipped };
}

function formatNames(names: string[]) {
	return names.map((name) => inlineCode(name)).join(", ") || "none";
}

async function clear(interaction: ChatInputCommandInteraction<"cached">) {
	const count = imported.size;
	imported.clear();
	save();
	await interaction.reply({
		content: `🗑️ Cleared ${count} imported usernames.`,
		flags: MessageFlags.Ephemeral,
	});
}

async function assign(
	interaction: ChatInputCommandInteraction<"cached">,
	role: Role,
) {
	if (imported.size === 0) {
		await interaction.reply({
			content: "❌ Nothing imported yet. Run /autorole import first.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	const members = await interaction.guild.members.fetch();
	let added = 0;
	const notFound: string[] = [];

	for (const username of imported) {
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
		`✅ Assigned ${role} to ${added} members.\n❌ Not found: ${formatNames(notFound)}`,
	);
}

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 500;

async function removeRoles(
	interaction: ChatInputCommandInteraction<"cached">,
	roleIds: string[],
) {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	const members = await interaction.guild.members.fetch();
	const holders = [
		...members
			.filter((m) => roleIds.some((id) => m.roles.cache.has(id)))
			.values(),
	];
	const channel = interaction.channel?.isSendable()
		? interaction.channel
		: null;

	await interaction.editReply(
		"⏳ Removing roles in batches. Watch the channel for updates.",
	);

	for (let i = 0; i < holders.length; i += BATCH_SIZE) {
		const batch = holders.slice(i, i + BATCH_SIZE);
		await Promise.all(
			batch.map(async (member) => {
				try {
					await member.roles.remove(
						roleIds.filter((id) => member.roles.cache.has(id)),
					);
				} catch (error) {
					console.error(
						`Failed to remove roles from ${member.user.tag}:`,
						error,
					);
					return;
				}

				// Not awaited, so rate-limited progress messages don't hold up removals
				channel
					?.send(`✅ Removed roles from ${member.user.tag}`)
					.catch((error) =>
						console.error(
							`Failed to post progress for ${member.user.tag}:`,
							error,
						),
					);
			}),
		);
		await Bun.sleep(BATCH_DELAY_MS);
	}
}

async function listPerkRoles(
	interaction: ChatInputCommandInteraction<"cached">,
) {
	const roles = [...perkRoles].map((id) => roleMention(id)).join(", ");
	await interaction.reply({
		content: `🎁 Perk roles: ${roles || "none"}`,
		flags: MessageFlags.Ephemeral,
	});
}

async function addPerkRole(interaction: ChatInputCommandInteraction<"cached">) {
	const role = interaction.options.getRole("role", true);
	if (!role.editable) {
		await interaction.reply({
			content: `❌ I can't manage ${role}. I need Manage Roles, and my highest role must be above it.`,
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	perkRoles.add(role.id);
	save();
	await interaction.reply({
		content: `✅ Added ${role} to the perk roles.`,
		flags: MessageFlags.Ephemeral,
	});
}

async function removePerkRole(
	interaction: ChatInputCommandInteraction<"cached">,
) {
	const role = interaction.options.getRole("role", true);
	const removed = perkRoles.delete(role.id);
	save();
	await interaction.reply({
		content: removed
			? `✅ Removed ${role} from the perk roles.`
			: `❌ ${role} isn't a perk role.`,
		flags: MessageFlags.Ephemeral,
	});
}

async function resetPerkRoles(
	interaction: ChatInputCommandInteraction<"cached">,
) {
	if (perkRoles.size === 0) {
		await interaction.reply({
			content: "❌ No perk roles yet. Add some with /autorole perks add-role.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	await removeRoles(interaction, [...perkRoles]);
}
