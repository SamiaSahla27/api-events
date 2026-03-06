const express = require('express');
const cors = require('cors');
const app = express();
const db = require('./database');

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Sert le front depuis /public

app.get('/', (req, res) => {
    res.send('Bienvenue sur l\'API de gestion d\'événements !');
});

app.get('/events', (req, res) => {
    const events = db.prepare('SELECT * FROM events').all();
    res.json(events);
});

// POST /events : Créer un nouvel événement
app.post('/events', (req, res) => {
    const newEvent = req.body;

    // --- LOGIQUE MÉTIER (À tester via CI/CD !) ---

    // 1. Validation basique
    if (!newEvent.title || !newEvent.date) {
        return res.status(400).json({ error: "Le titre et la date sont obligatoires" });
    }

    // 2. Validation logique : pas d'événement dans le passé
    const eventDate = new Date(newEvent.date);
    const today = new Date();
    // On retire l'heure pour comparer uniquement les jours
    today.setHours(0, 0, 0, 0);

    if (eventDate < today) {
        return res.status(400).json({
            error: "La date ne peut pas être dans le passé"
        });
    }

    // 2b. Validation capacite
    if (newEvent.capacite !== undefined && newEvent.capacite !== null) {
        const cap = Number(newEvent.capacite);
        if (!Number.isInteger(cap) || cap < 1) {
            return res.status(400).json({ error: "La capacité doit être un entier positif" });
        }
    }

    // 3. Insertion en base de données
    const stmt = db.prepare('INSERT INTO events (title, date, description, capacite, categorie, lieu) VALUES (?, ?, ?, ?, ?, ?)');
    const result = stmt.run(
        newEvent.title,
        newEvent.date,
        newEvent.description || null,
        newEvent.capacite    || null,
        newEvent.categorie   || null,
        newEvent.lieu        || null
    );

    res.status(201).json({
        id:          result.lastInsertRowid,
        title:       newEvent.title,
        date:        newEvent.date,
        description: newEvent.description || null,
        capacite:    newEvent.capacite    || null,
        categorie:   newEvent.categorie   || null,
        lieu:        newEvent.lieu        || null
    });
});

// PUT /events/:id : Mettre à jour un événement
app.put('/events/:id', (req, res) => {
    const { id } = req.params;
    const { title, date, description, capacite, categorie, lieu } = req.body;

    if (!title || !date) {
        return res.status(400).json({ error: "Le titre et la date sont obligatoires" });
    }

    const eventDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (eventDate < today) {
        return res.status(400).json({ error: "La date ne peut pas être dans le passé" });
    }

    if (capacite !== undefined && capacite !== null) {
        const cap = Number(capacite);
        if (!Number.isInteger(cap) || cap < 1) {
            return res.status(400).json({ error: "La capacité doit être un entier positif" });
        }
    }

    const result = db.prepare(
        'UPDATE events SET title = ?, date = ?, description = ?, capacite = ?, categorie = ?, lieu = ? WHERE id = ?'
    ).run(title, date, description || null, capacite || null, categorie || null, lieu || null, id);

    if (result.changes === 0) {
        return res.status(404).json({ error: "Événement introuvable" });
    }

    res.status(200).json({ id: Number(id), title, date, description: description || null, capacite: capacite || null, categorie: categorie || null, lieu: lieu || null });
});

// DELETE /events/:id : Supprimer un événement
app.delete('/events/:id', (req, res) => {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM events WHERE id = ?').run(id);

    if (result.changes === 0) {
        return res.status(404).json({ error: "Événement introuvable" });
    }

    res.status(200).json({ message: `Événement #${id} supprimé` });
});

// Export de l'app (nécessaire pour les tests unitaires sans lancer le serveur)
module.exports = app;