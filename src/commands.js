// Carrega todos os comandos de src/commands/*.js. Cada arquivo exporta `data` e `execute` (e, se precisar, `button`, `modal`).
// O Discord aceita no máximo 100 comandos: agrupe por tema quando crescer.
import { readdirSync } from 'node:fs';

const pasta = new URL('./commands/', import.meta.url);

export async function carregarComandos() {
  const comandos = new Map();
  for (const arquivo of readdirSync(pasta).filter((f) => f.endsWith('.js'))) {
    const comando = await import(new URL(arquivo, pasta).href);
    if (!comando.data || !comando.execute) continue;
    comandos.set(comando.data.name, comando);
  }
  return comandos;
}
