const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./database');

const app = express();

app.use(helmet());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Trop de requetes, veuillez reessayer plus tard' }
});

app.use('/events', limiter);
app.use(cors());
app.use(express.json({ limit: '10kb' }));

const enforceJson = (req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.is('application/json')) {
        return res.status(415).json({ error: 'Content-Type doit etre application/json' });
    }

    return next();
};

app.use('/events', enforceJson);
app.use(express.static('public'));

const stripTags = (str) => {
    if (typeof str !== 'string') return str;

    let safe = str.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '');
    safe = safe.replace(/<[^>]*>/g, '');
    return safe.trim();
};

const sanitizeEvent = (body) => ({
    ...body,
    title: body.title ? stripTags(body.title) : body.title,
    description: body.description ? stripTags(body.description) : body.description,
    categorie: body.categorie ? stripTags(body.categorie) : body.categorie,
    lieu: body.lieu ? stripTags(body.lieu) : body.lieu,
});

app.get('/', (req, res) => {
    res.send("Bienvenue sur l'API de gestion d'evenements !");
});

app.get('/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        return res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            env: process.env.NODE_ENV || 'development',
            version: process.env.npm_package_version || '1.0.0',
            database: 'connected'
        });
    } catch (error) {
        console.error('Health check error:', error);
        return res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            env: process.env.NODE_ENV || 'development',
            version: process.env.npm_package_version || '1.0.0',
            database: 'disconnected'
        });
    }
});

app.get('/events', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM events ORDER BY id ASC');
        return res.json(result.rows);
    } catch (error) {
        console.error('GET /events error:', error);
        return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

app.post('/events', async (req, res) => {
    try {
        const newEvent = sanitizeEvent(req.body);

        if (!newEvent.title || !newEvent.date || !newEvent.participants || !newEvent.categorie || !newEvent.lieu) {
            return res.status(400).json({ error: 'Tous les champs sont obligatoires' });
        }

        const validCategories = ['Music', 'Art', 'Tech', 'Sports', 'Education'];
        if (!validCategories.includes(newEvent.categorie)) {
            return res.status(400).json({
                error: `Categorie invalide. Les categories valides sont : ${validCategories.join(', ')}`
            });
        }

        const eventDate = new Date(newEvent.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (eventDate < today) {
            return res.status(400).json({ error: 'La date ne peut pas etre dans le passe' });
        }

        if (newEvent.participants !== undefined && newEvent.participants !== null) {
            const cap = Number(newEvent.participants);
            if (!Number.isInteger(cap) || cap < 1) {
                return res.status(400).json({ error: 'La capacite doit etre un entier positif' });
            }
            if (cap > 50) {
                return res.status(400).json({ error: 'La capacite doit etre inferieure ou egale a 50' });
            }
        }

        const result = await db.query(
            'INSERT INTO events (title, date, description, participants, categorie, lieu) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [
                newEvent.title,
                newEvent.date,
                newEvent.description ?? null,
                newEvent.participants ?? null,
                newEvent.categorie ?? null,
                newEvent.lieu ?? null
            ]
        );

        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('POST /events error:', error);
        return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

app.put('/events/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, date, description, participants, categorie, lieu } = sanitizeEvent(req.body);

        if (!title || !date) {
            return res.status(400).json({ error: 'Le titre et la date sont obligatoires' });
        }

        const eventDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (eventDate < today) {
            return res.status(400).json({ error: 'La date ne peut pas etre dans le passe' });
        }

        if (participants !== undefined && participants !== null) {
            const cap = Number(participants);
            if (!Number.isInteger(cap) || cap < 1) {
                return res.status(400).json({ error: 'La capacite doit etre un entier positif' });
            }
        }

        const result = await db.query(
            'UPDATE events SET title = $1, date = $2, description = $3, participants = $4, categorie = $5, lieu = $6 WHERE id = $7 RETURNING *',
            [title, date, description ?? null, participants ?? null, categorie ?? null, lieu ?? null, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Evenement introuvable' });
        }

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('PUT /events/:id error:', error);
        return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

app.delete('/events/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM events WHERE id = $1 RETURNING *', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Evenement introuvable' });
        }

        return res.status(204).send();
    } catch (error) {
        console.error('DELETE /events/:id error:', error);
        return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

app.get('/help', (req, res) => {
    res.status(200).json({
        endpoints: {
            'GET /events': 'Recuperer tous les evenements',
            'POST /events': 'Creer un nouvel evenement (title, date, description?, participants?, categorie?, lieu?)',
            'PUT /events/:id': 'Mettre a jour un evenement (title, date, description?, participants?, categorie?, lieu?)',
            'DELETE /events/:id': 'Supprimer un evenement',
            'GET /health': 'Verifier la connexion a la base PostgreSQL'
        }
    });
});

module.exports = app;
