import type { Message } from 'discord.js';
import { log } from './logger';

const REPLIES = [
  'what?',
  'i am busy right now',
  'will reply in 2 days maybe',
  'dont ping me',
  '💢',
  'no',
  'not now',
  'later',
  'zzz',
  'im sleeping',
  'im on break',
  'ask someone else',
  'five more minutes',
  'can this wait',
  'ill get back to you eventually',
  'come back tomorrow',
  'loading...',
  'please try again later',
];
const RARE_REPLY = ['whats up?', 'hi'];
const RARE_CHANCE = 0.05;

export async function replyToMention(message: Message) {
  if (
    message.author.bot ||
    !message.inGuild() ||
    !message.mentions.has(message.client.user, {
      ignoreEveryone: true,
      ignoreRoles: true,
    })
  ) {
    return;
  }

  const reply =
    Math.random() < RARE_CHANCE
      ? (RARE_REPLY[Math.floor(Math.random() * RARE_REPLY.length)] as string)
      : (REPLIES[Math.floor(Math.random() * REPLIES.length)] as string);

  try {
    await message.reply({
      content: reply,
      allowedMentions: { repliedUser: false },
    });
    log.info(
      `Replied "${reply}" to ${message.author.username} in #${message.channel.name}`,
    );
  } catch (error) {
    log.error(`Failed to reply to ${message.author.username}`, error);
  }
}
