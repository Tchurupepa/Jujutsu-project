// Guardião da regra de cores (src/ui/cores.js): nenhum hex solto nos comandos; só a paleta central e as cores de identidade.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COR, COR_RARIDADE, corDeRaridade } from '../src/ui/cores.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PULAR = new Set(['node_modules', 'dist', 'build']);
const files = (dir) => (existsSync(dir) ? readdirSync(dir).flatMap((n) => {
  if (PULAR.has(n)) return [];
  const p = join(dir, n);
  return statSync(p).isDirectory() ? files(p) : /\.(m?js|ts)$/.test(p) ? [p] : [];
}) : []);

/**
 * Onde hex é permitido: a paleta e os arquivos de DADOS com cor de IDENTIDADE (clãs, facções, regiões, tipos de NPC), cores de cargos
 * do servidor e artes geradas. Cada entrada com o motivo. O banner usa '#rrggbb' do tema do Discord, que esta régua não pega.
 */
const ALLOWED = new Set([
  'src/ui/cores.js',
  // 'src/rpg/clas.js', // cor de identidade de cada clã
  // 'src/rpg/cargos.js', // cores de cargos do servidor, não de container
]);

const SISTEMAS = ['sucesso', 'erro', 'aviso', 'neutro', 'combate', 'economia', 'personagem', 'mundo', 'historia', 'social', 'servidor', 'staff'];

test('regra de cores: nenhum comando escreve hex solto; a cor vem de COR (src/ui/cores.js)', () => {
  const bad = [];
  for (const f of files(join(ROOT, 'src'))) {
    const rel = relative(ROOT, f).replaceAll('\\', '/');
    if (ALLOWED.has(rel)) continue;
    readFileSync(f, 'utf8').split(/\r?\n/).forEach((l, n) => {
      if (/0x[0-9a-fA-F]{6}\b/.test(l) || /setAccentColor\(\s*(\d|['"`]#)/.test(l)) bad.push(`${rel}:${n + 1}: ${l.trim().slice(0, 120)}`);
    });
  }
  assert.deepEqual(bad, [], `use COR.<sistema> ou COR.<resultado> de src/ui/cores.js:\n${bad.join('\n')}`);
});

test('paleta: uma cor por papel, sem repetir; raridade aceita acento e caixa', () => {
  const values = Object.values(COR);
  assert.equal(new Set(values).size, values.length, 'cada sistema/resultado tem a sua cor');
  for (const k of SISTEMAS) assert.ok(Number.isInteger(COR[k]), `COR.${k} existe`);
  for (const v of values) assert.ok(v >= 0 && v <= 0xffffff, 'cor em 24 bits');
  assert.equal(corDeRaridade('Épica'), COR_RARIDADE.epica);
  assert.equal(corDeRaridade('LENDÁRIA'), COR_RARIDADE.lendaria);
  assert.equal(corDeRaridade('???'), COR.economia, 'raridade desconhecida cai na cor padrão');
});
