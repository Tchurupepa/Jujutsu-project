// Guardião da fala de NPC: quem fala aparece pelo TOKEN dele à direita do bloco da fala, nunca por emoji genérico de pessoa.
// O token precisa de URL que o Discord baixe (CDN/Blob/attachment://); sem token publicado, a fala sai só com o texto.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { definirResolvedorDeToken, dialogoNpc, falaNpc, tokenUrl } from '../src/ui/fala-npc.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SECAO = 9; const THUMB = 11;
const json = (p) => p.components.map((c) => c.toJSON());

// AJUSTE AO PROJETO: o catálogo de NPCs que falam e o resolvedor real (o mesmo que o boot usa). Com os dois ligados, o 1º teste
// reprova NPC novo que nasceu sem token publicado. Ex.:
//   import { NPCS } from '../src/npcs/catalogo.js';  import { resolverToken } from '../src/ui/tokens.js';
const NPCS = []; // [{ id: 'npc_mestre', nome: 'Mestre' }, ...]
const resolverDoProjeto = null; // (id) => url | null

test('todo NPC que fala tem o token publicado', { skip: !NPCS.length || !resolverDoProjeto }, () => {
  definirResolvedorDeToken(resolverDoProjeto);
  const faltam = NPCS.filter((n) => !tokenUrl(n.id)).map((n) => n.id);
  assert.deepEqual(faltam, [], 'gere o token (retrato redondo, paisagem ao fundo) e publique no CDN/Blob');
});

test('falaNpc: o token vira a miniatura; sem token, só o texto (nunca imagem quebrada)', () => {
  definirResolvedorDeToken((id) => ({ mestre: 'https://cdn.exemplo/npcs/tokens/mestre.png', site: 'http://localhost/token.png' })[id] ?? null);
  const b = falaNpc({ nome: 'Mestre', texto: 'Olá', npc: 'mestre' });
  assert.equal(b.text, ['### Mestre', '*“Olá”*'].join('\n'));
  assert.equal(b.thumb, 'https://cdn.exemplo/npcs/tokens/mestre.png');
  assert.equal(falaNpc({ texto: 'Oi', npc: 'npc_que_nao_existe' }), '*“Oi”*');
  assert.equal(tokenUrl('site'), null, 'endereço que o Discord não baixa não vira miniatura');
});

test('dialogoNpc: a fala abre a tela numa seção com o token à direita; o título perde o emoji', () => {
  definirResolvedorDeToken((id) => (id === 'mestre' ? 'https://cdn.exemplo/npcs/tokens/mestre.png' : null));
  const [c] = json(dialogoNpc({ id: 'mestre', nome: 'Mestre', emoji: '🥋', local: 'Dojo' }, { fala: 'Bem-vindo!', estado: '📜 Missão disponível' }));
  assert.equal(c.components[0].content.split('\n')[0], '# Mestre');
  const secao = c.components.find((x) => x.type === SECAO);
  assert.ok(secao, 'fala numa seção');
  assert.equal(secao.accessory.type, THUMB);
  assert.equal(secao.accessory.media.url, 'https://cdn.exemplo/npcs/tokens/mestre.png');
  assert.match(secao.components[0].content, /^\*“/);
  const [s] = json(dialogoNpc({ id: 'sem_token', nome: 'Guarda', emoji: '🛡️' }, { fala: 'Alto lá.' }));
  assert.equal(s.components[0].content.split('\n')[0], '# 🛡️ Guarda', 'sem token o emoji do NPC volta ao título');
  assert.ok(!s.components.some((x) => x.type === SECAO));
});

test('nenhuma fala de NPC em src/ usa emoji genérico de pessoa no lugar do token', () => {
  const PESSOA = /(?:🧓|👴|👵|🧔|👨|👩|🧑|👤|🗣️?)\s*\*["“]/u;
  const ruins = [];
  const andar = (d) => {
    if (!existsSync(d)) return;
    for (const n of readdirSync(d)) {
      if (n === 'node_modules' || n === 'dist') continue;
      const p = join(d, n);
      if (statSync(p).isDirectory()) andar(p);
      else if (/\.(m?js|ts)$/.test(p)) readFileSync(p, 'utf8').split(/\r?\n/).forEach((l, i) => { if (PESSOA.test(l)) ruins.push(`${p}:${i + 1}`); });
    }
  };
  andar(join(ROOT, 'src'));
  assert.deepEqual(ruins, [], 'use falaNpc/dialogoNpc (src/ui/fala-npc.js) com o token do NPC');
});
