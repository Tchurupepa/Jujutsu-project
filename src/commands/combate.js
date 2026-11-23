// /combate: treino em grid contra uma Maldição de Grau 4. Uma luta viva por canal, uma por jogador.
import { SlashCommandBuilder } from 'discord.js';
import { ErroDeCombate, agir, fugir, getCombate, iniciarTreino } from '../combat/combate-service.js';
import { telaCombate, telaFim } from '../combat/combate-ui.js';
import { COR } from '../ui/cores.js';
import { asEdit, notice } from '../ui/panel.js';

export const data = new SlashCommandBuilder().setName('combate').setDescription('Treina em combate tático contra uma maldição.')
  .addBooleanOption((o) => o.setName('modo_teste').setDescription('Libera as habilidades Azul e Vermelho (Gojo) para testar'));

const erro = (e) => notice(COR.erro, '❌ Não deu', e instanceof ErroDeCombate ? e.message : 'Algo deu errado. Tente de novo em instantes.');

export async function execute(i) {
  const db = i.client.db;
  const existente = getCombate(db, i.channelId);
  if (existente) {
    if (existente.owner_id !== i.user.id) return i.reply(notice(COR.aviso, '⚔️ Canal ocupado', 'Já há uma luta em andamento neste canal.'));
    return i.reply(telaCombate(existente.estado, { note: 'Sua luta continua aqui.' }));
  }
  try {
    const estado = iniciarTreino(db, i.channelId, i.user.id, {
      nomeDiscord: i.member?.displayName ?? i.user.username, modoTeste: i.options.getBoolean('modo_teste') ?? false,
    });
    return await i.reply(telaCombate(estado));
  } catch (e) {
    if (!(e instanceof ErroDeCombate)) console.error(e);
    return i.reply(erro(e));
  }
}

/** Botões: combate:<ação>:<dono>:<seq>[:<arg>]. Só o dono clica; cartão velho só redesenha o atual. */
export async function button(i) {
  const [, acao, dono, seqTxt, arg] = i.customId.split(':');
  if (i.user.id !== dono) return i.reply(notice(COR.erro, '🚫 Não é a sua luta', 'Use /combate para treinar.'));
  const db = i.client.db;
  try {
    if (acao === 'fugir') {
      const estado = fugir(db, i.channelId, dono);
      return await i.update(asEdit(telaFim(estado, { fugiu: true })));
    }
    const acoes = {
      mover: () => { const [dx, dy] = arg.split(',').map(Number); return { tipo: 'mover', dx, dy }; },
      atacar: () => ({ tipo: 'atacar' }),
      hab: () => ({ tipo: 'habilidade', id: arg }),
      recuperar: () => ({ tipo: 'recuperar' }),
      stamina: () => ({ tipo: 'recuperar_stamina' }),
      passar: () => ({ tipo: 'passar' }),
    };
    if (!acoes[acao]) return;
    const r = agir(db, i.channelId, dono, acoes[acao](), Number(seqTxt));
    if (r.desatualizado) return await i.update(asEdit(telaCombate(r.estado, { note: '🔄 Esse cartão estava velho; este é o atual.' })));
    return await i.update(asEdit(r.estado.fim ? telaFim(r.estado, { recompensa: r.recompensa }) : telaCombate(r.estado)));
  } catch (e) {
    if (!(e instanceof ErroDeCombate)) console.error(e);
    return i.reply(erro(e));
  }
}
