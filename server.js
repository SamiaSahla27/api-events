const app = require('./app');
const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`✅ API Events démarrée sur http://localhost:${port}`);
    console.log("📚 Endpoints disponibles :");
    console.log("  - GET /events : Récupérer tous les événements");
    console.log("  - GET /events/:id : Récupérer un événement spécifique");
    console.log("  - POST /events : Créer un nouvel événement");
    console.log("  - PUT /events/:id : Mettre à jour un événement existant");
    console.log("  - DELETE /events/:id : Supprimer un événement");
});