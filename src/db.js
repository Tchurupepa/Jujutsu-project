// Conexão com o SQLite (node:sqlite, síncrono) + backup antes de migrar.
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { migrate, MIGRATIONS } from './db/migrations.js';

export function abrirBanco(caminho = process.env.DB_PATH ?? 'data/bot.db') {
  if (caminho !== ':memory:') mkdirSync(dirname(caminho), { recursive: true });
  const db = new DatabaseSync(caminho);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const temTabelas = db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'schema_migrations'").get();
  const aplicadas = temTabelas ? db.prepare('SELECT COUNT(*) AS n FROM schema_migrations').get().n : 0;
  if (caminho !== ':memory:' && aplicadas > 0 && aplicadas < MIGRATIONS.length) {
    const pasta = join(dirname(caminho), 'backups');
    mkdirSync(pasta, { recursive: true });
    const destino = join(pasta, `bot-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);
    if (!existsSync(destino)) db.exec(`VACUUM INTO '${destino.replace(/'/g, "''")}'`);
  }
  const n = migrate(db);
  console.log(`[db] ${caminho} aberto (${n} migração(ões) aplicada(s))`);
  return db;
}
