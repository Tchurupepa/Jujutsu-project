// Auditoria da régua: `npm run regua`. Lê as habilidades REAIS (nunca copia número) e imprime uma tabela Markdown.
// Use --json para guardar o "antes" e comparar com o "depois" de uma mudança.
import { ATAQUE_BASICO, POOL_EA, REGUA } from '../src/combat/balance.js';
import { ARVORE_CORAGEM } from '../src/combat/arvores/coragem.js';
import { ARVORE_KAMO } from '../src/combat/arvores/kamo.js';
import { ARVORE_NANAMI } from '../src/combat/arvores/nanami.js';
import { ARVORE_PUNHOS } from '../src/combat/arvores/punhos.js';
import { ARVORE_RATIO } from '../src/combat/arvores/ratio.js';
import { ARVORE_SANGUE } from '../src/combat/arvores/sangue.js';
import { ARVORE_SOMBRAS } from '../src/combat/arvores/sombras.js';
import { ARVORE_ZENIN } from '../src/combat/arvores/zenin.js';
import { auditar, auditarArvore, vidaDeReferencia } from '../src/combat/regua.js';
import { HABILIDADES } from '../src/combat/tecnicas.js';

const linhas = Object.values(HABILIDADES).map((h) => ({ nome: h.nome, ...auditar(h), recarga: h.recarga }));
const basico = { nome: 'Ataque básico (Stamina)', danoPorEnergia: ATAQUE_BASICO.dano / ATAQUE_BASICO.custoStamina };
const arvores = [ARVORE_RATIO, ARVORE_NANAMI, ARVORE_ZENIN, ARVORE_CORAGEM, ARVORE_PUNHOS, ARVORE_SOMBRAS, ARVORE_KAMO, ARVORE_SANGUE].map(auditarArvore);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ habilidades: linhas, basico, arvores }, null, 2));
} else {
  const n = (x, d = 1) => (x === null || x === undefined ? '—' : Number(x).toFixed(d));
  console.log(`Régua (pool ${POOL_EA}, vida de referência ${vidaDeReferencia(1)} no nível 1)\n`);
  console.log('| Habilidade | Rank | Custo | Régua | Recarga | Pico % vida | Dano/energia | Avisos |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const l of linhas) {
    console.log(`| ${l.nome} | ${l.rank ?? '—'} | ${l.custo} | ${l.sugerido ?? '—'} | ${l.recarga} | ${n(l.pico, 0)} | ${n(l.danoPorEnergia, 2)} | ${l.avisos.join('; ') || 'ok'} |`);
  }
  const ok = basico.danoPorEnergia >= REGUA.danoPorEnergia.min && basico.danoPorEnergia <= REGUA.danoPorEnergia.max;
  console.log(`| ${basico.nome} | — | ${ATAQUE_BASICO.custoStamina} | — | 0 | ${n((ATAQUE_BASICO.dano / vidaDeReferencia(1)) * 100, 0)} | ${n(basico.danoPorEnergia, 2)} | ${ok ? 'ok' : 'fora da faixa'} |`);
  for (const a of arvores) {
    const b = a.bonus.info;
    console.log(`\nÁrvore ${a.id} (${a.totalPontos} pontos) · desconto de EA ${b.descontoPerm}% (${b.descontoComBurst}% com burst) · precisão ${b.precisaoPp} pp · Kokusen pico ${b.kokusenPico}%${a.bonus.avisos.length ? ` · AVISOS: ${a.bonus.avisos.join('; ')}` : ''}\n`);
    console.log('| Nó | Tipo | Rank | Pontos | Requisito (soma) | Custo | Régua | Pico % vida | Dano/energia | Avisos |');
    console.log('|---|---|---|---|---|---|---|---|---|---|');
    for (const x of a.nos) {
      console.log(`| ${x.nome} | ${x.tipo} | ${x.rank ?? '—'} | ${x.pontos} | ${x.soma} | ${x.custo ?? '—'} | ${x.sugerido ?? '—'} | ${n(x.pico, 0)} | ${n(x.danoPorEnergia, 2)} | ${x.avisos.join('; ') || 'ok'} |`);
    }
  }
}
