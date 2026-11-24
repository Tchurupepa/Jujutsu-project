// Habilidades de combate = DADOS + `executar(ctx)`. Os números vêm de balance.js; o texto de regras é GERADO desses números
// (nunca escreva à mão uma regra que o código já escreve). ctx = { estado, ator, alvo, dano(alvo, bruto, rotulo), log(texto) }.
import { AZUL, KOKUSEN, PUNHO_ENERGIA, STATUS, VERMELHO } from './balance.js';
import { empurrar, puxar } from './grid.js';

const temStatus = (p, id) => p.status.some((s) => s.id === id);
const tirarStatus = (p, id) => { p.status = p.status.filter((s) => s.id !== id); };

export const HABILIDADES = {
  azul: {
    id: 'azul', nome: 'Azul', emoji: '🔵', cena: 'Uma esfera de energia que dobra o espaço e arrasta tudo para dentro.',
    ...AZUL, tipo: 'comum',
    executar({ ator, alvo, estado, dano, log }) {
      const { movidas } = puxar(estado, alvo, ator, AZUL.puxa);
      log(`🔵 **${ator.nome}** usa **Azul** e puxa **${alvo.nome}** ${movidas} casa(s).`);
      dano(alvo, AZUL.dano, 'Azul');
      if (alvo.hp > 0) {
        tirarStatus(alvo, 'atraido');
        alvo.status.push({ id: 'atraido', turnos: STATUS.atraido });
      }
    },
  },
  vermelho: {
    id: 'vermelho', nome: 'Vermelho', emoji: '🔴', cena: 'Uma esfera de energia reversa que explode para fora, repelindo tudo.',
    ...VERMELHO, tipo: 'comum',
    executar({ ator, alvo, estado, dano, log }) {
      const combo = temStatus(alvo, 'atraido');
      let bruto = VERMELHO.dano;
      if (combo) {
        bruto = Math.round(bruto * VERMELHO.comboMult);
        tirarStatus(alvo, 'atraido');
      }
      log(`🔴 **${ator.nome}** usa **Vermelho** em **${alvo.nome}**${combo ? ' (combo com o Azul!)' : ''}.`);
      dano(alvo, bruto, 'Vermelho');
      if (alvo.hp <= 0) return;
      const { movidas, bateu } = empurrar(estado, alvo, ator, VERMELHO.empurra);
      log(`💨 **${alvo.nome}** é lançado ${movidas} casa(s).`);
      if (bateu) {
        log('💥 Impacto!');
        dano(alvo, VERMELHO.impacto, 'Impacto');
      }
    },
  },
  punho_energia: {
    id: 'punho_energia', nome: 'Punho de Energia', emoji: '👊', cena: 'Energia amaldiçoada concentrada nos punhos, a um passo do Kokusen.',
    ...PUNHO_ENERGIA, tipo: 'comum',
    executar({ ator, log }) {
      tirarStatus(ator, 'punho');
      ator.status.push({ id: 'punho', turnos: PUNHO_ENERGIA.turnos });
      log(`👊 **${ator.nome}** envolve os punhos em energia amaldiçoada (+${PUNHO_ENERGIA.forcaPct}% de dano físico).`);
    },
  },
};

/** "Efeitos e regras" gerado dos números do balance. */
export function regrasDe(id) {
  const h = HABILIDADES[id];
  if (id === 'punho_energia') {
    return `Ação comum · custo ${h.custo} de EA · recarga ${h.recarga} turnos · ${h.turnos - 1} turnos: ataque básico +${h.forcaPct}% de dano e ${h.kokusenChance}% de chance de Kokusen por golpe. `
      + `Kokusen: dano x${KOKUSEN.mult}; por ${KOKUSEN.turnos - 1} turnos recupera ${KOKUSEN.eaPct}% de EA por turno, +${KOKUSEN.chanceBonus}% de chance de Kokusen (cai ${KOKUSEN.chanceDecai} a cada Kokusen acertado) e +${KOKUSEN.danoPct}% de dano.`;
  }
  const base = `Ação comum · custo ${h.custo} de EA · alcance ${h.alcance} · recarga ${h.recarga} turnos · dano ${h.dano}`;
  if (id === 'azul') return `${base} · puxa o alvo até ${h.puxa} casas e o deixa Atraído (${STATUS.atraido} turnos).`;
  return `${base} · empurra o alvo até ${h.empurra} casas; impacto de +${h.impacto} ao bater; dano x${h.comboMult} contra Atraído.`;
}

/** Técnica inata (id de src/rpg/dados.js) → habilidades de combate que ela libera. */
export const HABILIDADES_DA_TECNICA = { infinito_lunar: ['azul', 'vermelho'] };
export const habilidadesDe = (tecnicaId) => HABILIDADES_DA_TECNICA[tecnicaId] ?? [];
