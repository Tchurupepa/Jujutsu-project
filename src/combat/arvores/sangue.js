// Árvore da técnica inata SANGUE (V1, clã Kamo). Paga e exige Técnica Inata. Só DADOS por enquanto. Números em SANGUE (balance.js).
// Marca de Sangue (3 rodadas, não acumula) é aplicada por toda técnica de sangue com dano (Fluxo Rubro). Várias técnicas EXIGEM Marca (= preparo).
// `aguarda`: marca, debuffs (Sangramento, Imobilizar, Atordoar), barreira e reacao (Coágulo), bloqueio (Lança imbloqueável).
import { SANGRAMENTO, SANGUE as S } from '../balance.js';

const efeito = (id, duracao, chance = 1) => ({ id, duracao, chance });

export const ARVORE_SANGUE = {
  id: 'sangue', nome: 'Sangue (V1)', stat: 'tecnica_inata', cla: 'kamo',
  caminhos: {
    corte: ['fluxo_rubro', 'gota_cortante', 'lamina_carmesim', 'golpe_compactado'],
    controle: ['fluxo_rubro', 'pressao_arterial', 'rede_de_fios', 'lanca_perfurante', 'chuva_escarlate', 'mare_rubra'],
    defesa: ['fluxo_rubro', 'pressao_arterial', 'coagulo'],
  },
  sangramento: SANGRAMENTO,
  nos: [
    { id: 'fluxo_rubro', nome: 'Fluxo Rubro', tipo: 'raiz', pontos: 1, nivel: 1, requisito: 1, cla: 'kamo', requer: [], aguarda: ['marca', 'debuffs'] },
    { id: 'pressao_arterial', nome: 'Pressão Arterial', tipo: 'passiva', pontos: 2, nivel: 3, requisito: 3, requer: ['fluxo_rubro'], aguarda: ['marca'],
      bonus: [{ janela: 'cond', danoPct: S.pressaoArterial.danoPct }] }, // contra alvo com Marca
    { id: 'gota_cortante', nome: 'Gota Cortante', tipo: 'tecnica', rank: 'D', pontos: 1, nivel: 1, requisito: 2, requer: ['fluxo_rubro'],
      custo: S.gota.custo, recarga: S.gota.recarga, aguarda: ['marca', 'debuffs'],
      regua: { dano: S.gota.dano, alcance: S.gota.alcance, efeitos: [efeito('dot', S.gota.sangTurnos, S.gota.sangChance)] } },
    { id: 'lamina_carmesim', nome: 'Lâmina Carmesim', tipo: 'tecnica', rank: 'C', pontos: 3, nivel: 5, requisito: 5, requer: ['gota_cortante'],
      custo: S.lamina.custo, recarga: S.lamina.recarga, aguarda: ['marca', 'debuffs'],
      regua: { dano: S.lamina.dano, efeitos: [efeito('dot', S.lamina.sangTurnos, S.lamina.sangChance)] } },
    { id: 'rede_de_fios', nome: 'Rede de Fios', tipo: 'tecnica', rank: 'C', pontos: 3, nivel: 5, requisito: 6, requer: ['pressao_arterial'],
      custo: S.rede.custo, recarga: S.rede.recarga, aguarda: ['marca', 'debuffs'],
      regua: { dano: S.rede.dano, alcance: S.rede.alcance, area: true, casas: S.rede.alcance, efeitos: [efeito('imobilizar', S.rede.imobilizaTurnos)] } },
    { id: 'coagulo', nome: 'Coágulo', tipo: 'buff', rank: 'B', pontos: 4, nivel: 12, requisito: 7, requer: ['pressao_arterial'],
      custo: S.coagulo.custo, recarga: S.coagulo.recarga, aguarda: ['reacao', 'barreira'],
      // reação de guarda: custo ESCRITO (fora da fórmula); a Barreira de 14 conta como saída para dano/energia
      regua: { modo: true, acao: 'reacao', dano: S.coagulo.barreira } },
    { id: 'lanca_perfurante', nome: 'Lança Perfurante', tipo: 'tecnica', rank: 'B', pontos: 4, nivel: 12, requisito: 10, requer: ['rede_de_fios'],
      custo: S.lanca.custo, recarga: S.lanca.recarga, aguarda: ['marca', 'bloqueio'],
      regua: { dano: S.lanca.dano, alcance: S.lanca.alcance, area: true, casas: S.lanca.alcance, imbloqueavel: true } },
    { id: 'golpe_compactado', nome: 'Golpe Compactado', tipo: 'tecnica', rank: 'A', pontos: 6, nivel: 20, requisito: 11, requer: ['lamina_carmesim'],
      custo: S.golpe.custo, recarga: S.golpe.recarga, aguarda: ['marca', 'debuffs'],
      regua: { dano: S.golpe.dano, preparo: true, efeitos: [efeito('atordoar', S.golpe.atordoaTurnos, S.golpe.atordoaChance)] } }, // exige Marca = preparo
    { id: 'chuva_escarlate', nome: 'Chuva Escarlate', tipo: 'tecnica', rank: 'A', pontos: 6, nivel: 20, requisito: 16, requer: ['lanca_perfurante'],
      custo: S.chuva.custo, recarga: S.chuva.recarga, aguarda: ['marca', 'debuffs'],
      regua: { dano: S.chuva.dano, area: true, casas: S.chuva.lado ** 2, preparo: true, efeitos: [efeito('dot', S.chuva.sangTurnos, S.chuva.sangChance)] } },
    { id: 'mare_rubra', nome: 'Maré Rubra', tipo: 'tecnica', rank: 'S', pontos: 10, nivel: 30, requisito: 26, requer: ['chuva_escarlate'],
      custo: S.mare.custo, recarga: 99, aguarda: ['marca'], // uso único; detona todas as Marcas do campo, a qualquer distância
      regua: { dano: S.mare.dano, area: true, casas: 99, final: true, preparo: true, usoUnico: true } },
  ],
};
