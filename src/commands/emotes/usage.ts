import type {
	Message,
	MessageReaction,
	PartialMessageReaction,
	PartialUser,
	User,
} from "discord.js";
import { env } from "../../env";
import { log } from "../../logger";
import { readJson, writeJson } from "../../storage";

interface Usage {
	count: number;
	lastUsed: string;
}

interface UsageStore {
	since: string;
	emojis: Record<string, Usage>;
	stickers: Record<string, Usage>;
}

const USAGE_PATH = "data/emotes.json";
const SAVE_DELAY_MS = 10 * 1000;
const EMOJI_PATTERN = /<a?:\w+:(\d+)>/g;

export const usage = readJson<UsageStore>(USAGE_PATH, {
	since: new Date().toISOString(),
	emojis: {},
	stickers: {},
});

let savePending = false;

function record(entries: Record<string, Usage>, id: string) {
	const entry = entries[id] ?? { count: 0, lastUsed: "" };
	entry.count++;
	entry.lastUsed = new Date().toISOString();
	entries[id] = entry;
	if (!savePending) {
		savePending = true;
		setTimeout(save, SAVE_DELAY_MS);
	}
}

function save() {
	savePending = false;
	try {
		writeJson<UsageStore>(USAGE_PATH, usage);
	} catch (error) {
		log.error("Failed to save emote usage", error);
	}
}

export function trackMessage(message: Message) {
	if (
		message.author.bot ||
		!message.inGuild() ||
		message.guildId !== env.GUILD_ID
	) {
		return;
	}

	const emojiIds = new Set(
		[...message.content.matchAll(EMOJI_PATTERN)].map((match) => match[1]),
	);
	for (const id of emojiIds) {
		if (id && message.guild.emojis.cache.has(id)) record(usage.emojis, id);
	}
	for (const id of message.stickers.keys()) {
		if (message.guild.stickers.cache.has(id)) record(usage.stickers, id);
	}
}

export function trackReaction(
	reaction: MessageReaction | PartialMessageReaction,
	user: User | PartialUser,
) {
	const { id } = reaction.emoji;
	if (user.bot || reaction.message.guildId !== env.GUILD_ID || !id) return;
	if (reaction.message.guild?.emojis.cache.has(id)) record(usage.emojis, id);
}
