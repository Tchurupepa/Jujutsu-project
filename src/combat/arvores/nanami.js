// Árvore do clã NANAMI (linhagem, só passivas). Paga e exige Técnica Inata. Só DADOS por enquanto (o motor ainda não lê estes bônus).
// Números em NANAMI (balance.js). `bonus` lista o que o nó dá, por janela: perm (sempre), cond (após gatilho), burst (1x por combate).
import { NANAMI as N } from '../balance.js';

const no = (id, nome, tipo, pontos, nivel, requisito, requer, bonus) => ({ id, nome, tipo, pontos, nivel, requisito, requer, bonus });

export const ARVORE_NANAMI = {
  id: 'nanami', nome: 'Linhagem Nanami', stat: 'tecnica_inata', cla: 'nanami',
  caminhos: {
    kokusen: ['hora_regulamentada', 'olho_ponto_fraco', 'golpe_medido', 'fluxo_continuo', 'hora_extra'],
    oficio: ['hora_regulamentada', 'rotina_escritorio', 'metodo_trabalho', 'razao_73', 'eficiencia_oficio'],
    topo: ['hora_extra', 'eficiencia_oficio', 'expediente_encerrado'],
  },
  nos: [
    no('hora_regulamentada', 'Hora Regulamentada', 'raiz', 1, 1, 1, [], [{ janela: 'perm', eaMaxPct: N.horaRegulamentada.eaMaxPct }]),
    no('olho_ponto_fraco', 'Olho para o Ponto Fraco', 'linhagem', 2, 3, 3, ['hora_regulamentada'], [{ janela: 'perm', kokusenPp: N.olhoPontoFraco.kokusenPp }]),
    no('rotina_escritorio', 'Rotina de Escritório', 'linhagem', 2, 3, 3, ['hora_regulamentada'], [{ janela: 'perm', descontoPct: N.rotinaEscritorio.descontoPct }]),
    no('golpe_medido', 'Golpe Medido', 'linhagem', 3, 8, 6, ['olho_ponto_fraco'], [{ janela: 'perm', kokusenPp: N.golpeMedido.kokusenPp }]),
    no('metodo_trabalho', 'Método de Trabalho', 'linhagem', 3, 8, 6, ['rotina_escritorio'], [{ janela: 'perm', descontoPct: N.metodoTrabalho.descontoPct }]),
    no('fluxo_continuo', 'Fluxo Contínuo', 'linhagem', 4, 14, 10, ['golpe_medido'],
      [{ janela: 'perm', kokusenPp: N.fluxoContinuo.kokusenPp }, { janela: 'cond', kokusenPp: N.fluxoContinuo.kokusenCondPp }]),
    no('razao_73', 'Mira 7:3', 'linhagem', 4, 14, 10, ['metodo_trabalho'], [{ janela: 'perm', precisaoPp: N.razao73.precisaoPp }]),
    no('hora_extra', 'Hora Extra', 'linhagem', 5, 20, 15, ['fluxo_continuo'], [{ janela: 'cond', danoPct: N.horaExtra.danoPct }]),
    no('eficiencia_oficio', 'Eficiência de Ofício', 'linhagem', 5, 20, 15, ['razao_73'], [{ janela: 'perm', descontoPct: N.eficienciaOficio.descontoPct }]),
    no('expediente_encerrado', 'Expediente Encerrado', 'linhagem', 6, 30, 35, ['hora_extra', 'eficiencia_oficio'],
      [{ janela: 'burst', kokusenPp: N.expedienteEncerrado.kokusenPp, descontoPct: N.expedienteEncerrado.descontoPct }]),
  ],
};
