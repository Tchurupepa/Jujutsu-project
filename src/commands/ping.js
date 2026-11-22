import { SlashCommandBuilder } from 'discord.js';
import { COR } from '../ui/cores.js';
import { notice } from '../ui/panel.js';

export const data = new SlashCommandBuilder().setName('ping').setDescription('Confere se o bot está vivo.');

export const execute = (i) => i.reply(notice(COR.neutro, '🏓 Pong', `Latência da API: **${Math.round(i.client.ws.ping)} ms**`));
