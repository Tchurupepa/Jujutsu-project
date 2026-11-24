// Árvore do clã ZENIN (linhagem, só passivas). Paga e exige Técnica Inata. Só DADOS por enquanto (o motor ainda não lê estes bônus).
// Números em ZENIN (balance.js). `bonus` lista o que o nó dá, por janela: perm (sempre), cond (após gatilho), burst (1x por combate).
import { ZENIN as Z } from '../balance.js';

// `aguarda` = sistema que o motor ainda não tem (o nó fica só como dado até o dono liberar): 'esquiva' | 'debuffs'.
const no = (id, nome, tipo, pontos, nivel, requisito, requer, bonus, aguarda = null) => ({ id, nome, tipo, pontos, nivel, requisito, requer, bonus, aguarda });

const comExige = (n, exige) => ({ ...n, exige });

export const ARVORE_ZENIN = {
  id: 'zenin', nome: 'Linhagem Zenin', stat: 'tecnica_inata', cla: 'zenin',
  caminhos: {
    velocidadeDefesa: ['sangue_zenin', 'passo_treinado', 'reflexos_zenin', 'mente_fria'],
    combateArmas: ['sangue_zenin', 'mao_armeiro', 'estudo_armas', 'contra_ataque', 'ritmo_caca'],
    topo: ['mente_fria', 'ritmo_caca', 'instante_decisivo'],
  },
  // Mão de Armeiro e Estudo de Armas também pedem Maestria em Armas (mínimo, não gasto): soma do caminho ÷ 3.
  nos: [
    no('sangue_zenin', 'Sangue Zenin', 'raiz', 1, 1, 1, [], [{ janela: 'cond', movCasas: Z.sangueZenin.movPrimeiraRodada }]), // só na 1ª rodada
    no('passo_treinado', 'Passo Treinado', 'linhagem', 2, 3, 3, ['sangue_zenin'], [{ janela: 'perm', movCasas: Z.passoTreinado.movCasas }]),
    comExige(no('mao_armeiro', 'Mão de Armeiro', 'linhagem', 2, 3, 3, ['sangue_zenin'], [{ janela: 'perm', descontoPct: Z.maoArmeiro.descontoPct }]), { maestria_armas: 1 }),
    no('reflexos_zenin', 'Reflexos Zenin', 'linhagem', 3, 8, 6, ['passo_treinado'], [{ janela: 'perm', esquivaPp: Z.reflexos.esquivaPp }], 'esquiva'),
    comExige(no('estudo_armas', 'Estudo de Armas', 'linhagem', 3, 8, 6, ['mao_armeiro'], [{ janela: 'cond', danoPct: Z.estudoArmas.danoPct, so: ['arma'] }]), { maestria_armas: 2 }),
    no('mente_fria', 'Mente Fria', 'linhagem', 4, 14, 10, ['reflexos_zenin'], [{ janela: 'perm', controleMenosRodadas: Z.menteFria.controleMenosRodadas }], 'debuffs'), // em standby até o sistema de debuffs
    no('contra_ataque', 'Contra-ataque Treinado', 'linhagem', 4, 14, 10, ['estudo_armas'], [{ janela: 'cond', danoPct: Z.contraAtaque.danoPct, so: ['melee'] }], 'esquiva'), // buff no próximo golpe depois de esquivar
    no('ritmo_caca', 'Ritmo de Caça', 'linhagem', 5, 20, 15, ['contra_ataque'], [{ janela: 'cond', danoPct: Z.ritmoCaca.danoPctMax }]),
    no('instante_decisivo', 'Instante Decisivo', 'linhagem', 6, 30, 30, ['ritmo_caca', 'mente_fria'],
      [{ janela: 'burst', movCasas: Z.instanteDecisivo.movCasas, esquivaPp: Z.instanteDecisivo.esquivaPp }], 'esquiva'),
  ],
};
