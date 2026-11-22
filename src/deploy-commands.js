// Registra os slash commands. O ID do bot é a primeira parte do token (base64).
// Com GUILD_ID no .env, registra só nesse servidor (atualiza na hora) e limpa os globais para não duplicar.
// Sem GUILD_ID, registra globalmente (o Discord pode demorar a mostrar).
import { REST, Routes } from 'discord.js';
import { carregarComandos } from './commands.js';

const token = process.env.DISCORD_TOKEN;
if (!token) throw new Error('Defina DISCORD_TOKEN no .env.');
const clientId = Buffer.from(token.split('.')[0], 'base64').toString();
const guildId = process.env.GUILD_ID;

const comandos = [...(await carregarComandos()).values()].map((c) => c.data.toJSON());
const rest = new REST().setToken(token);
console.log(`Registrando ${comandos.length} comando(s)${guildId ? ' no servidor' : ' globalmente'}...`);
if (guildId) {
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: comandos });
  await rest.put(Routes.applicationCommands(clientId), { body: [] });
} else {
  await rest.put(Routes.applicationCommands(clientId), { body: comandos });
}
console.log('Comandos registrados com sucesso.');
