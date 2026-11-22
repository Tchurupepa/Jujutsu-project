// Cores da faixa lateral dos containers do bot. UMA regra para todo comando atual e futuro:
//
// 1. RESPOSTA a uma ação (mensagem curta depois de um clique ou comando) usa a cor do RESULTADO, em qualquer sistema:
//      sucesso (feito) · erro (recusado / falhou) · aviso (confirme, prazo correndo, decisão pendente) · neutro (cancelado, expirado,
//      fechado, encerrado, só informação).
// 2. PAINEL de um sistema (a tela que o jogador usa) usa a cor do SISTEMA, sempre a mesma em todas as telas, fases e botões.
// 3. IDENTIDADE: container sobre UMA coisa que já tem cor própria no jogo (raridade, facção, clã, região, tipo de NPC, grupo, Boost)
//      usa a cor dela. Fora disso, nada de cor própria.
// 4. Nunca escreva hex solto num comando: importe daqui (o test/cores.test.js reprova). Sistema novo = entrada nova em COR, com o motivo
//    no comentário e uma cor que não se confunda com as outras no fundo escuro do Discord.
//
// Os NOMES das chaves são genéricos de propósito: o universo muda, os papéis não. O comentário de cada uma diz o que ela cobre neste projeto.

export const COR = Object.freeze({
  // resultado (regra 1)
  sucesso: 0x2ecc71, // verde
  erro: 0xe74c3c, // vermelho
  aviso: 0xe67e22, // laranja
  neutro: 0x95a5a6, // cinza
  // sistemas (regra 2): ajuste os comentários ao universo, mantenha as chaves
  combate: 0xa93226, // carmesim: combate, duelos, raids, encontros, reação
  economia: 0xf1c40f, // ouro: inventário, lojas, moeda, baús, itens, profissões
  personagem: 0x3498db, // azul: ficha, perfil, nível, atributos, traços, origem, aparência, história
  mundo: 0x1abc9c, // turquesa: mapa, viagem, regiões, locais, atividades de campo
  historia: 0x9b59b6, // roxo: missões, side quests, tutorial, narração
  social: 0xe91e63, // rosa: party, grupo, família, facção (do ponto de vista do jogador)
  servidor: 0xb08d42, // dourado institucional: mensagens oficiais, regras, boas-vindas, guias
  staff: 0x546e7a, // ardósia: comandos e registros da Staff (admin, auditoria, análise de ficha)
  // sistemas novos entram aqui, um por linha, com o motivo. Ex.: passe: 0x5b4fcf, // índigo: passe de temporada
});

/** Escala de raridade (identidade, regra 3): a mesma em item, traço, origem, técnica. Aceita "Épica", "epica", "ÉPICA". */
export const COR_RARIDADE = Object.freeze({
  comum: 0x95a5a6, incomum: 0x2ecc71, rara: 0x3498db, epica: 0x9b59b6, lendaria: 0xf1c40f, mitica: 0xe74c3c, secreta: 0x2c3e50,
});

/** Chave de busca: sem acento, sem caixa, sem espaço/pontuação. "Lendária" -> "lendaria", "Grau Especial" -> "grauespecial". */
export const chaveDe = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Cor da raridade; desconhecida cai em `padrao`. */
export const corDeRaridade = (r, padrao = COR.economia) => COR_RARIDADE[chaveDe(r)] ?? padrao;

/**
 * Outras identidades fixas do jogo (regra 3), agrupadas por assunto. Preencha com as do universo: facções, clãs, regiões, tipos de NPC.
 * Se a lista for grande e já morar num arquivo de DADOS (ex.: src/rpg/clas.js com `cor` em cada clã), deixe lá e libere o arquivo no
 * ALLOWED do test/cores.test.js; aqui ficam só as soltas.
 */
export const COR_IDENTIDADE = Object.freeze({
  boost: 0xf47fff, // rosa do Nitro: agradecimento e recompensas de Boost
  escola: { toquio: 0x1f3a93, quioto: 0x7b2d26 },
  npc: { feiticeiro: 0x3c6e71, maldicao: 0x4a235a, usuariodemaldicao: 0x6c3483, civil: 0x7f8c8d },
});

/** Escala de grau de maldição/feiticeiro (identidade): do frio (fraco) ao quente (perigoso), como a raridade. */
export const COR_GRAU = Object.freeze({
  grau4: 0x95a5a6, grau3: 0x2ecc71, grau2: 0x3498db, grau1: 0x9b59b6, semiespecial: 0xe67e22, grauespecial: 0x8b0000,
});
/** Aceita "Grau 2", "grau2", "2", "Especial", "Grau Especial". */
export const corDeGrau = (g, padrao = COR.combate) => { const k = chaveDe(g); return COR_GRAU[k] ?? COR_GRAU[`grau${k}`] ?? padrao; };

/** Cor de identidade por grupo e chave (`corDeIdentidade('faccao', 'Exemplo')`); ausente cai em `padrao`. */
export function corDeIdentidade(grupo, chave, padrao = COR.neutro) {
  const g = COR_IDENTIDADE[grupo];
  if (typeof g === 'number') return g;
  return (g && g[chaveDe(chave)]) ?? padrao;
}
