require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');

const token = process.env.DISCORD_TOKEN;
// O ID do bot é a primeira parte do token, codificada em base64
const clientId = Buffer.from(token.split('.')[0], 'base64').toString();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
for (const folder of fs.readdirSync(commandsPath)) {
  const folderPath = path.join(commandsPath, folder);
  for (const file of fs.readdirSync(folderPath).filter((f) => f.endsWith('.js'))) {
    const command = require(path.join(folderPath, file));
    if (command.data && command.execute) commands.push(command.data.toJSON());
  }
}

const rest = new REST().setToken(token);
(async () => {
  try {
    console.log(`Registrando ${commands.length} comando(s)...`);
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('Comandos registrados com sucesso.');
  } catch (error) {
    console.error(error);
  }
})();