// Guardião do padrão de mensagens: vale para todo comando atual e FUTURO.
// Nenhum código do bot monta embed nem responde com texto solto: tudo é container (src/ui/panel.js). Quem escrever um embed novo reprova aqui.
// Varre src/ (.js, .mjs, .ts), pula node_modules e dist.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SRC = join(ROOT, 'src');
const PULAR = new Set(['node_modules', 'dist', 'build']);
const EXT = /\.(m?js|ts)$/;
/** Arquivos que podem citar os padrões proibidos (ex.: um conversor de mensagens antigas que LÊ embeds). Caminho relativo à raiz. */
const PERMITIDOS = new Set([]);

const files = (dir) => (existsSync(dir) ? readdirSync(dir).flatMap((n) => {
  if (PULAR.has(n)) return [];
  const p = join(dir, n);
  return statSync(p).isDirectory() ? files(p) : EXT.test(p) ? [p] : [];
}) : []);
const rel = (f) => relative(ROOT, f).replace(/\\/g, '/');
const hits = (re) => files(SRC).filter((f) => !PERMITIDOS.has(rel(f)))
  .flatMap((f) => readFileSync(f, 'utf8').split(/\r?\n/).map((l, k) => [f, k + 1, l]))
  .filter(([, , l]) => re.test(l)).map(([f, n, l]) => `${rel(f)}:${n}: ${l.trim().slice(0, 140)}`);

test('nenhum código monta embed: toda mensagem é container (panel/notice de src/ui/panel.js)', () => {
  assert.deepEqual(hits(/new EmbedBuilder\(/), [], 'troque o embed por panel()/notice() (Components V2)');
  assert.deepEqual(hits(/embeds:\s*\[\s*[^\]\s]/), [], 'mensagem nova não leva embed; para limpar um antigo use asEdit() (embeds: [])');
});

test('nenhuma resposta com texto solto: content com texto vira container', () => {
  assert.deepEqual(hits(/\.(reply|followUp|editReply|update|send|edit)\(\{\s*content:\s*['"`]/), [], 'use notice()/panel() em vez de { content: "..." }');
  assert.deepEqual(hits(/\.(reply|followUp|editReply|send)\(\s*['"`]/), [], 'use notice()/panel() em vez de uma string solta');
});
