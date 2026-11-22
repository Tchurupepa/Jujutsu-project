import { SlashCommandBuilder } from 'discord.js';
import { getFicha } from '../rpg/ficha-service.js';
import { telaFicha } from '../rpg/ficha-ui.js';
import { COR } from '../ui/cores.js';
import { notice } from '../ui/panel.js';

export const data = new SlashCommandBuilder().setName('perfil').setDescription('Mostra a ficha de um feiticeiro.')
  .addUserOption((o) => o.setName('usuario').setDescription('De quem (padrão: você)'));

export async function execute(i) {
  const alvo = i.options.getUser('usuario') ?? i.user;
  const ficha = getFicha(i.client.db, alvo.id);
  if (!ficha) {
    const proprio = alvo.id === i.user.id;
    return i.reply(notice(COR.aviso, '🧾 Sem ficha', proprio ? 'Você ainda não tem ficha. Use /ficha para criar.' : 'Essa pessoa ainda não criou uma ficha.'));
  }
  return i.reply(telaFicha(ficha));
}
