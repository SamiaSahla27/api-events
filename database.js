const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'events.db'));

db.exec(`
    CREATE TABLE IF NOT EXISTS events (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        title       TEXT    NOT NULL,
        date        TEXT    NOT NULL,
        description TEXT,
        capacite    INTEGER DEFAULT NULL,
        categorie   TEXT    DEFAULT NULL,
        lieu        TEXT    DEFAULT NULL
    )
`);

// Migrations : ajouter les colonnes si elles n'existent pas encore
const columns = db.prepare("PRAGMA table_info(events)").all().map(c => c.name);
if (!columns.includes('capacite'))  db.exec('ALTER TABLE events ADD COLUMN capacite  INTEGER DEFAULT NULL');
if (!columns.includes('categorie')) db.exec('ALTER TABLE events ADD COLUMN categorie TEXT    DEFAULT NULL');
if (!columns.includes('lieu'))      db.exec('ALTER TABLE events ADD COLUMN lieu      TEXT    DEFAULT NULL');

module.exports = db;
