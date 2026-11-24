// Árvore do clã KAMO (linhagem de sangue, só passivas). Paga e exige Técnica Inata. Só DADOS por enquanto. Números em KAMO (balance.js).
// `pendente`: pontos que faltam para o total do cabeçalho (o nó de topo não foi enviado). `aguarda`: debuffs (Sangramento) e
// tecnica_sangue (a árvore de técnica inata do Kamo ainda não existe).
import { KAMO as K } from '../balance.js';

const no = (id, nome, pontos, nivel, requisito, requer, bonus, aguarda = []) => ({ id, nome, tipo: id === 'sangue_antigo' ? 'raiz' : 'linhagem', pontos, nivel, requisito, requer, bonus, aguarda });

export const ARVORE_KAMO = {
  id: 'kamo', nome: 'Linhagem Kamo', stat: 'tecnica_inata', cla: 'kamo', totalDeclarado: 30,
  proposta: ['sangue_ancestral'], // nó de topo escrito pela régua (o dono não enviou): trocar quando ele mandar o dele
  caminhos: {
    // layout ASSUMIDO (ver KAMO em balance.js): a cadeia ofensiva passa pela Herança de Fluxo
    defesa: ['sangue_antigo', 'circulacao_firme', 'coagulacao_natural'],
    ofensiva: ['sangue_antigo', 'heranca_de_fluxo', 'reserva_rubra', 'pulso_de_combate', 'ferida_profunda'],
    energia: ['pulso_de_combate', 'sangue_por_energia'],
  },
  nos: [
    { ...no('sangue_antigo', 'Sangue Antigo', 1, 1, 1, [], [], ['debuffs']), cla: 'kamo' },
    no('circulacao_firme', 'Circulação Firme', 2, 3, 3, ['sangue_antigo'], [{ janela: 'perm', vidaPct: K.circulacao.vidaPct }]),
    no('heranca_de_fluxo', 'Herança de Fluxo', 2, 3, 3, ['sangue_antigo'], [{ janela: 'perm', descontoPct: K.herancaFluxo.descontoPct }], ['tecnica_sangue']),
    no('coagulacao_natural', 'Coagulação Natural', 3, 8, 6, ['circulacao_firme'], [{ janela: 'cond', reducaoPct: -K.coagulacao.sangramentoDanoPct }], ['debuffs']), // só contra Sangramento
    no('reserva_rubra', 'Reserva Rubra', 3, 8, 6, ['heranca_de_fluxo'], [{ janela: 'cond', eaPorRodada: K.reservaRubra.eaPorRodada }]), // com vida abaixo de 50%
    no('pulso_de_combate', 'Pulso de Combate', 4, 14, 10, ['reserva_rubra'], [{ janela: 'cond', danoPct: K.pulsoCombate.danoPct }], ['debuffs', 'tecnica_sangue']),
    no('ferida_profunda', 'Ferida Profunda', 4, 17, 14, ['pulso_de_combate'], [], ['debuffs', 'tecnica_sangue']),
    no('sangue_por_energia', 'Sangue por Energia', 5, 20, 15, ['pulso_de_combate'], [{ janela: 'burst', eaViaVida: K.sanguePorEnergia.eaViaVida }], ['tecnica_sangue']),
    // topo: exige os três finais (defesa, ofensiva e energia) = todos os 8 nós (24) + 6 = Técnica Inata 30
    no('sangue_ancestral', 'Sangue Ancestral', 6, 30, 30, ['coagulacao_natural', 'ferida_profunda', 'sangue_por_energia'],
      [{ janela: 'burst', sangDanoExtra: K.sangueAncestral.sangDanoExtra, eaPorRodada: K.sangueAncestral.eaPorRodada }], ['debuffs', 'tecnica_sangue']),
  ],
};
