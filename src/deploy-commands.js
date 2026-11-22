// Registra os slash commands. O ID do bot é a primeira parte do token (base64).
import { REST, Routes } from 'discord.js';
import { carregarComandos } from './commands.js';

const token = process.env.DISCORD_TOKEN;
if (!token) throw new Error('Defina DISCORD_TOKEN no .env.');
const clientId = Buffer.from(token.split('.')[0], 'base64').toString();

const comandos = [...(await carregarComandos()).values()].map((c) => c.data.toJSON());
console.log(`Registrando ${comandos.length} comando(s)...`);
await new REST().setToken(token).put(Routes.applicationCommands(clientId), { body: comandos });
console.log('Comandos registrados com sucesso.');
