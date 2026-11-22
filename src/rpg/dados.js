// Conteúdo do universo (Jujutsu Kaisen como tema de fã). Só DADOS: nenhuma regra aqui.
// Os nomes das técnicas são autorais; nada de texto ou arte oficial. Números de sorteio ficam em balance.js.

export const RARIDADES = ['comum', 'rara', 'epica', 'lendaria', 'mitica'];
export const NOME_RARIDADE = { comum: 'Comum', rara: 'Rara', epica: 'Épica', lendaria: 'Lendária', mitica: 'Mítica' };

/** Atributos (lista fechada: mudar depois custa migração). */
export const ATRIBUTOS = {
  forca: 'Força', agilidade: 'Agilidade', resistencia: 'Resistência',
  controle: 'Controle de EA', producao: 'Produção de EA', percepcao: 'Percepção',
};

/** Eixo 1: origem. `semTecnica`: não tem energia amaldiçoada (a Restrição Celestial troca a técnica por físico). */
export const ORIGENS = {
  feiticeiro: { nome: 'Feiticeiro', emoji: '🎓', raridade: 'comum', peso: 8500, bonus: { controle: 1 } },
  usuario_de_maldicao: { nome: 'Usuário de Maldição', emoji: '🩸', raridade: 'rara', peso: 1300, bonus: { producao: 1 } },
  restricao_celestial: {
    nome: 'Restrição Celestial', emoji: '⛓️', raridade: 'lendaria', peso: 200, semTecnica: true, bonus: { forca: 3, resistencia: 2 },
  },
};

/** Eixo 2: clã (linhagem). `tecnica`: técnica hereditária que o clã pode dar (nunca garante). */
export const CLAS = {
  sem_cla: { nome: 'Sem clã', emoji: '🌿', raridade: 'comum', peso: 6000 },
  kamo: { nome: 'Kamo', emoji: '🩸', raridade: 'rara', peso: 2500, tecnica: 'sangue_vivo' },
  zenin: { nome: 'Zenin', emoji: '🏯', raridade: 'epica', peso: 1000, tecnica: 'sombra_herdada' },
  gojo: { nome: 'Gojo', emoji: '👁️', raridade: 'lendaria', peso: 500, tecnica: 'infinito_lunar' },
};

/**
 * Eixo 3: técnica inata. `hereditaria: true` só sai pelo clã. Mítica não sai por sorteio nem por pity (só evento da staff).
 */
export const TECNICAS = {
  reforco_corporal: { nome: 'Reforço Corporal', raridade: 'comum', resumo: 'Reveste o corpo de energia para golpear e resistir.' },
  punho_ressonante: { nome: 'Punho Ressonante', raridade: 'comum', resumo: 'Golpes que reverberam e abalam o alvo por dentro.' },
  shikigami_sombrio: { nome: 'Shikigami Sombrio', raridade: 'rara', resumo: 'Um shikigami nascido da própria sombra.' },
  projeteis_de_energia: { nome: 'Projéteis de Energia', raridade: 'rara', resumo: 'Disparos de energia amaldiçoada comprimida.' },
  sangue_vivo: { nome: 'Sangue Vivo', raridade: 'rara', hereditaria: true, resumo: 'Manipula o próprio sangue como arma e escudo.' },
  legiao_de_invocacoes: { nome: 'Legião de Invocações', raridade: 'epica', resumo: 'Invoca vários shikigamis ao mesmo tempo.' },
  sombra_herdada: { nome: 'Sombra Herdada', raridade: 'epica', hereditaria: true, resumo: 'Técnica de sombras guardada pelo clã.' },
  dobra_do_espaco: { nome: 'Dobra do Espaço', raridade: 'lendaria', resumo: 'Corta e dobra o espaço ao redor.' },
  infinito_lunar: { nome: 'Infinito Lunar', raridade: 'lendaria', hereditaria: true, resumo: 'Interrompe o que se aproxima, sem nunca deixar chegar.' },
};

/** Postos (graus). `auto`: sobe sozinho pelo nível; os demais exigem aprovação da staff. */
export const GRAUS = [
  { id: 'grau4', nome: 'Grau 4', nivelMin: 1, auto: true },
  { id: 'grau3', nome: 'Grau 3', nivelMin: 10, auto: true },
  { id: 'grau2', nome: 'Grau 2', nivelMin: 25, auto: true },
  { id: 'grau1', nome: 'Grau 1', nivelMin: 45, auto: false },
  { id: 'especial', nome: 'Grau Especial', nivelMin: 70, auto: false },
];

export const nomeDoGrau = (id) => GRAUS.find((g) => g.id === id)?.nome ?? id;
