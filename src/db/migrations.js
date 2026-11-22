// Migrações versionadas: cada uma roda uma vez, em transação. Nunca apague dado: tabela velha vira `legacy_*`.
// `version` cresce sempre; antes de publicar, confira se não colide com a do remoto (renumere a NOVA, nunca a publicada).
export const MIGRATIONS = [
  {
    version: 1,
    name: 'Ficha: rascunho (sheet_sessions), personagens, ledger de XP e pity por conta',
    up(db) {
      db.exec(`
        CREATE TABLE sheet_sessions (
          discord_id TEXT PRIMARY KEY,
          name TEXT NOT NULL, age INTEGER NOT NULL, story TEXT NOT NULL,
          origem TEXT NOT NULL, cla TEXT NOT NULL, tecnica TEXT, tecnica_raridade TEXT,
          giros_origem INTEGER NOT NULL, giros_cla INTEGER NOT NULL, giros_tecnica INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE characters (
          discord_id TEXT PRIMARY KEY,
          name TEXT NOT NULL, age INTEGER NOT NULL, story TEXT NOT NULL,
          origem TEXT NOT NULL, cla TEXT NOT NULL, tecnica TEXT, tecnica_raridade TEXT,
          grau TEXT NOT NULL, nivel INTEGER NOT NULL DEFAULT 1, xp INTEGER NOT NULL DEFAULT 0, pontos INTEGER NOT NULL DEFAULT 0,
          atributos TEXT NOT NULL, created_at INTEGER NOT NULL
        );
        CREATE TABLE xp_ledger (
          discord_id TEXT NOT NULL, source TEXT NOT NULL, ref TEXT NOT NULL, amount INTEGER NOT NULL, at INTEGER NOT NULL,
          UNIQUE (discord_id, source, ref)
        );
        CREATE TABLE roll_pity (
          discord_id TEXT NOT NULL, kind TEXT NOT NULL, key TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (discord_id, kind, key)
        );
      `);
    },
  },
  {
    version: 2,
    name: 'Combate: uma sessão viva por canal (JSON versionado) e uma por jogador',
    up(db) {
      db.exec(`
        CREATE TABLE combats (
          channel_id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, state TEXT NOT NULL, updated_at INTEGER NOT NULL
        );
        CREATE UNIQUE INDEX combats_owner ON combats (owner_id);
      `);
    },
  },
];

export function migrate(db, migrations = MIGRATIONS) {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at INTEGER NOT NULL)');
  const aplicadas = new Set(db.prepare('SELECT version FROM schema_migrations').all().map((r) => r.version));
  const pendentes = migrations.filter((m) => !aplicadas.has(m.version)).sort((a, b) => a.version - b.version);
  for (const m of pendentes) {
    db.exec('BEGIN IMMEDIATE');
    try {
      m.up(db);
      db.prepare('INSERT INTO schema_migrations VALUES (?, ?, ?)').run(m.version, m.name, Date.now());
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw new Error(`Migração ${m.version} (${m.name}) falhou: ${e.message}`);
    }
  }
  return pendentes.length;
}
