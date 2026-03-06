const express = require('express');
const path = require('path');
const app = express();
app.use(express.json()); // Pour lire le JSON dans le corps des requêtes
app.use(express.static(path.join(__dirname, 'public')));

const events = []; // Stockage en mémoire des événements
let nextEventId = 1;

function validateEventPayload(eventPayload) {
    if (!eventPayload.title || !eventPayload.date || !eventPayload.lieu || !eventPayload.image) {
        return "Le titre, la date, le lieu et l'image sont obligatoires";
    }

    if (typeof eventPayload.lieu !== 'string' || !eventPayload.lieu.trim()) {
        return "Le lieu doit être un texte non vide";
    }

    if (typeof eventPayload.image !== 'string' || !eventPayload.image.trim()) {
        return "L'image doit être un texte non vide";
    }

    const eventDate = new Date(eventPayload.date);
    if (Number.isNaN(eventDate.getTime())) {
        return "La date doit être obligatoirement dans le futur";
    }

    const now = new Date();

    if (eventDate <= now) {
        return "La date doit être obligatoirement dans le futur";
    }

    if (eventPayload.capacity !== undefined) {
        if (!Number.isInteger(eventPayload.capacity) || eventPayload.capacity <= 0) {
            return "La capacité maximale doit être un entier supérieur à 0";
        }
    }

    return null;
}

app.get('/events', (req, res) => {
    res.json({ message: "Bienvenue sur l'API Events !" });
});

app.get('/events/list', (req, res) => {
    res.json(events);
});

// POST /events : Créer un nouvel événement
app.post('/events', (req, res) => {
    const newEvent = req.body;

    // --- LOGIQUE MÉTIER (À tester via CI/CD !) ---

    const validationError = validateEventPayload(newEvent);
    if (validationError) {
        return res.status(400).json({
            error: validationError
        });
    }

    // --- FIN LOGIQUE ---

    // Ajout de l'événement (ID auto-incrémenté)
    const eventToCreate = {
        id: nextEventId,
        title: newEvent.title,
        date: newEvent.date,
        lieu: newEvent.lieu,
        image: newEvent.image,
        category: newEvent.category,
        capacity: newEvent.capacity
    };

    nextEventId += 1;
    events.push(eventToCreate);

    res.status(201).json(eventToCreate);
});

// PUT /events/:id : Modifier un événement existant
app.put('/events/:id', (req, res) => {
    const eventId = parseInt(req.params.id, 10);
    const updatedEvent = req.body;

    const index = events.findIndex((event) => event.id === eventId);

    if (index === -1) {
        return res.status(404).json({
            error: "Événement introuvable"
        });
    }

    const validationError = validateEventPayload(updatedEvent);
    if (validationError) {
        return res.status(400).json({
            error: validationError
        });
    }

    const eventToSave = {
        id: eventId,
        title: updatedEvent.title,
        date: updatedEvent.date,
        lieu: updatedEvent.lieu,
        image: updatedEvent.image,
        category: updatedEvent.category,
        capacity: updatedEvent.capacity
    };

    events[index] = eventToSave;

    return res.status(200).json(eventToSave);
});

// DELETE /events/:id : Supprimer un événement existant
app.delete('/events/:id', (req, res) => {
    const eventId = parseInt(req.params.id, 10);
    const index = events.findIndex((event) => event.id === eventId);

    if (index === -1) {
        return res.status(404).json({
            error: "Événement introuvable"
        });
    }

    events.splice(index, 1);

    return res.status(200).json({
        message: "Événement supprimé"
    });
});

// Export de l'app (nécessaire pour les tests unitaires sans lancer le serveur)
module.exports = app;