// Guardião dos limites que falham em silêncio: 4000 caracteres somados e 40 componentes. Toda tela que CRESCE com o conteúdo
// (lista, relatório, inventário, ranking) ganha um teste como o último daqui, medindo CADA página com o pior caso.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ButtonBuilder, ButtonStyle } from 'discord.js';
import { COR } from '../src/ui/cores.js';
import { bar, item, notice, panel } from '../src/ui/panel.js';
import { MAX_TEXTO, caber, medir, navPaginas, paginar, prender } from '../src/ui/limites.js';

test('bar: ▰▱, presa nas pontas, nunca cheia antes de acabar nem vazia depois de começar', () => {
  assert.equal(bar(0, 10), '▱▱▱▱▱▱▱▱▱▱');
  assert.equal(bar(10, 10), '▰▰▰▰▰▰▰▰▰▰');
  assert.equal(bar(1, 1000), '▰▱▱▱▱▱▱▱▱▱');
  assert.equal(bar(999, 1000), '▰▰▰▰▰▰▰▰▰▱');
  assert.equal(bar(5, 0), '▱▱▱▱▱▱▱▱▱▱');
  assert.equal(bar(50, 10), '▰▰▰▰▰▰▰▰▰▰');
});

test('medir: conta o container, as seções, a miniatura e cada botão', () => {
  const p = panel({ title: 'T', blocks: ['### A', { text: '### B', thumb: 'https://cdn.exemplo/x.png' }], foot: 'f',
    rows: [new ButtonBuilder().setCustomId('a').setLabel('A').setStyle(ButtonStyle.Primary)] });
  // container 1 + título 1 + sep 1 + A 1 + sep 1 + seção 3 + sep 1 + rodapé 1 + linha 1 + botão 1
  assert.equal(medir(p).componentes, 12);
  assert.ok(medir(notice(COR.sucesso, '✅ Feito', 'ok')).cabe);
});

test('caber: os blocos juntos ficam no orçamento', () => {
  const out = caber(['a'.repeat(3000), 'b'.repeat(3000), 'c'.repeat(10)], 3500);
  assert.equal(out.join('').length, 3500);
  assert.equal(out.length, 2);
});

test('paginar: pior caso (500 itens longos) cabe em cada página, sem perder item', () => {
  const itens = Array.from({ length: 500 }, (_, i) => item(`**Item ${i}**`, 'detalhe '.repeat(12)));
  const paginas = paginar(itens, { orcamento: 3300 });
  assert.equal(paginas.flat().length, 500);
  paginas.forEach((pg, n) => {
    const p = panel({ color: COR.economia, title: '🎒 Inventário', sub: 'Tudo que você carrega.', blocks: [`### 📦 Itens\n${pg.join('\n\n')}`],
      foot: `Página ${n + 1}/${paginas.length}`, rows: [navPaginas('inv:pg', n, paginas.length)].filter(Boolean) });
    const m = medir(p);
    assert.ok(m.texto <= MAX_TEXTO, `página ${n + 1}: ${m.texto} caracteres`);
    assert.ok(m.cabe, `página ${n + 1} cabe`);
  });
  assert.equal(prender(99, paginas.length), paginas.length - 1);
});
