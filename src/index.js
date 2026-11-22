// Boot: banco → comandos → listeners → login. Cada sistema novo entra aqui com o seu próprio .catch.
import { Client, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import { carregarComandos } from './commands.js';
import { abrirBanco } from './db.js';
import { COR } from './ui/cores.js';
import { notice } from './ui/panel.js';

if (!process.env.DISCORD_TOKEN) throw new Error('Defina DISCORD_TOKEN no .env (veja .env.example).');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.db = abrirBanco();
client.commands = await carregarComandos();

client.once(Events.ClientReady, (c) => console.log(`Online como ${c.user.tag} (${client.commands.size} comandos)`));

client.on(Events.InteractionCreate, async (i) => {
  try {
    if (i.isChatInputCommand()) return await client.commands.get(i.commandName)?.execute(i);
    // Botões e modais: o prefixo do customId é o nome do comando dono (ficha:acao:dono:...).
    if (i.isButton() || i.isModalSubmit()) {
      const comando = client.commands.get(i.customId.split(':')[0]);
      const tratar = i.isButton() ? comando?.button : comando?.modal;
      if (tratar) return await tratar(i);
    }
  } catch (e) {
    console.error(e);
    const aviso = notice(COR.erro, '❌ Erro', 'Algo deu errado ao executar isso. Tente de novo em instantes.');
    if (i.replied || i.deferred) await i.followUp({ ...aviso, flags: aviso.flags | MessageFlags.Ephemeral }).catch(() => {});
    else await i.reply(aviso).catch(() => {});
  }
});

client.login(process.env.DISCORD_TOKEN);
