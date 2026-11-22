// /ficha: cria a ficha (modal → sorteio → giros → confirmar) ou mostra a que já existe.
// customId: ficha:<ação>:<idDoDono>[:<dado>]. O prefixo é o nome do comando: é assim que o roteador acha este arquivo.
import { SlashCommandBuilder } from 'discord.js';
import {
  ErroDeFicha, cancelarRascunho, confirmarFicha, getFicha, getRascunho, girar, iniciarRascunho,
} from '../rpg/ficha-service.js';
import { modalCriar, telaFicha, telaIntro, telaRascunho } from '../rpg/ficha-ui.js';
import { COR } from '../ui/cores.js';
import { asEdit, notice } from '../ui/panel.js';

export const data = new SlashCommandBuilder().setName('ficha').setDescription('Cria a sua ficha de feiticeiro ou mostra a que você já tem.');

const erro = (e) => notice(COR.erro, '❌ Não deu', e instanceof ErroDeFicha ? e.message : 'Algo deu errado. Tente de novo em instantes.');

export async function execute(i) {
  const id = i.user.id;
  const db = i.client.db;
  const ficha = getFicha(db, id);
  if (ficha) return i.reply(telaFicha(ficha, { ephemeral: true }));
  const rascunho = getRascunho(db, id);
  if (rascunho) return i.reply(telaRascunho(rascunho));
  return i.reply(telaIntro(id));
}

/** Botões. O clique de outra pessoa é recusado (o dono vem no customId). */
export async function button(i) {
  const [, acao, dono, dado] = i.customId.split(':');
  if (i.user.id !== dono) return i.reply(notice(COR.erro, '🚫 Não é a sua ficha', 'Use /ficha para criar a sua.'));
  const db = i.client.db;
  try {
    if (acao === 'criar') return await i.showModal(modalCriar(dono));
    if (acao === 'girar') return await i.update(asEdit(telaRascunho(girar(db, dono, dado))));
    if (acao === 'cancelar') {
      cancelarRascunho(db, dono);
      return await i.update(asEdit(notice(COR.neutro, '✖️ Rascunho cancelado', 'Use /ficha para começar de novo. O pity da sua conta foi mantido.')));
    }
    if (acao === 'ok') {
      const ficha = confirmarFicha(db, dono);
      return await i.update(asEdit(telaFicha(ficha, { note: '✅ Ficha criada. Bem-vindo à escola!' })));
    }
  } catch (e) {
    if (!(e instanceof ErroDeFicha)) console.error(e);
    return i.reply(erro(e));
  }
}

/** Modal de criação. */
export async function modal(i) {
  const [, , dono] = i.customId.split(':');
  if (i.user.id !== dono) return;
  try {
    const r = iniciarRascunho(i.client.db, dono, {
      nome: i.fields.getTextInputValue('nome'),
      idade: i.fields.getTextInputValue('idade'),
      historia: i.fields.getTextInputValue('historia'),
    });
    return await i.reply(telaRascunho(r));
  } catch (e) {
    if (!(e instanceof ErroDeFicha)) console.error(e);
    return i.reply(erro(e));
  }
}
