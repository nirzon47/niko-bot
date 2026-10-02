import {
	EmbedBuilder,
	inlineCode,
	MessageFlags,
	PermissionFlagsBits,
	SlashCommandBuilder,
	TimestampStyles,
	time,
} from "discord.js";
import type { Command } from "../types";
import { usage } from "./usage";

const MAX_LIST_LENGTH = 4000;

interface Row {
	rank: number;
	label: string;
	count: number;
	lastUsed?: string;
}

export const emotes: Command = {
	data: new SlashCommandBuilder()
		.setName("emotes")
		.setDescription("See how often the server's emojis and stickers are used")
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("rank")
				.setDescription("Rank the server's emojis or stickers by use")
				.addStringOption((option) =>
					option
						.setName("type")
						.setDescription("What to rank (default: emojis)")
						.addChoices(
							{ name: "Emojis", value: "emojis" },
							{ name: "Stickers", value: "stickers" },
						),
				)
				.addStringOption((option) =>
					option
						.setName("order")
						.setDescription("Which end to start from (default: most used)")
						.addChoices(
							{ name: "Most used first", value: "most" },
							{ name: "Least used first", value: "least" },
						),
				),
		),

	async execute(interaction) {
		if (!interaction.inCachedGuild()) return;

		const stickers = interaction.options.getString("type") === "stickers";
		const entries = stickers ? usage.stickers : usage.emojis;
		const items = stickers
			? interaction.guild.stickers.cache.map((sticker) => ({
					id: sticker.id,
					label: inlineCode(sticker.name),
				}))
			: interaction.guild.emojis.cache.map((emoji) => ({
					id: emoji.id,
					label: emoji.toString(),
				}));

		if (items.length === 0) {
			await interaction.reply({
				content: `❌ This server has no ${stickers ? "stickers" : "emojis"}.`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const rows: Row[] = items
			.map(({ id, label }) => ({
				label,
				count: entries[id]?.count ?? 0,
				lastUsed: entries[id]?.lastUsed,
			}))
			.sort(
				(a, b) =>
					b.count - a.count ||
					(b.lastUsed ?? "").localeCompare(a.lastUsed ?? ""),
			)
			.map((row, i) => ({ ...row, rank: i + 1 }));
		if (interaction.options.getString("order") === "least") rows.reverse();

		await interaction.reply({
			embeds: [
				new EmbedBuilder()
					.setTitle(`📊 ${stickers ? "Sticker" : "Emoji"} ranking`)
					.setDescription(buildDescription(rows)),
			],
			flags: MessageFlags.Ephemeral,
		});
	},
};

function buildDescription(rows: Row[]) {
	let description = `Tracking since ${time(new Date(usage.since), TimestampStyles.LongDate)}\n`;
	for (const [i, row] of rows.entries()) {
		const line = `\n${formatRow(row)}`;
		if (description.length + line.length > MAX_LIST_LENGTH) {
			return `${description}\n…and ${rows.length - i} more`;
		}
		description += line;
	}
	return description;
}

function formatRow({ rank, label, count, lastUsed }: Row) {
	if (!lastUsed) return `${rank}. ${label} · never used`;
	const uses = count === 1 ? "1 use" : `${count} uses`;
	return `${rank}. ${label} · ${uses} · last used ${time(new Date(lastUsed), TimestampStyles.RelativeTime)}`;
}
