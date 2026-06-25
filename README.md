# 🚀 ProjectFlow — Application de Gestion de Projets Collaborative

> Application full-stack inspirée de **Trello / Asana / Jira**, développée avec Node.js, Express, MySQL et Socket.io.  
> Projet de portfolio — Chaimae · EMSI 2025

---

## ✨ Fonctionnalités

### Authentification
- Inscription / Connexion sécurisée (JWT + bcryptjs)
- Protection des routes par middleware
- Upload et gestion d'avatar

### Projets
- CRUD complet (créer, modifier, supprimer, archiver)
- Gestion des membres et des rôles (Admin / Manager / Member)
- Statistiques de progression par projet

### Tableau Kanban
- Colonnes : **Backlog · To Do · In Progress · Review · Done**
- **Drag & Drop natif HTML5** entre colonnes
- Mise à jour **temps réel** via Socket.io
- Filtres par priorité et par assigné

### Tâches
- CRUD complet avec priorités (Low / Medium / High / Critical)
- Badges visuels colorés par priorité
- Assignation à un membre
- Dates d'échéance avec alertes
- Commentaires en temps réel

### Dashboard
- Statistiques globales (projets, tâches, retards)
- Graphique de progression des projets
- Répartition par priorité
- Journal d'activités récentes
- Liste des tâches en retard

### Notifications
- Notifications temps réel Socket.io
- Panel de notifications avec badge
- Marquer tout comme lu

### Design
- **Dark Mode** / Light Mode
- Interface responsive (Mobile First)
- Animations fluides
- Sidebar collapsible
- Recherche globale

---

## 🏗️ Architecture

```
project-management-tool/
├── server/
│   ├── config/
│   │   ├── database.js      # Pool MySQL
│   │   └── socket.js        # Config Socket.io
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── projectController.js
│   │   ├── taskController.js
│   │   ├── commentController.js
│   │   ├── notificationController.js
│   │   └── dashboardController.js
│   ├── middleware/
│   │   ├── auth.js          # JWT middleware
│   │   ├── upload.js        # Multer
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── projects.js
│   │   ├── tasks.js
│   │   ├── comments.js
│   │   ├── notifications.js
│   │   └── dashboard.js
│   ├── services/
│   │   ├── activityService.js
│   │   └── notificationService.js
│   ├── utils/
│   │   └── initDb.js
│   ├── uploads/             # Avatars & pièces jointes
│   └── app.js               # Point d'entrée
├── client/
│   ├── assets/
│   │   ├── css/
│   │   │   ├── variables.css
│   │   │   ├── reset.css
│   │   │   ├── layout.css
│   │   │   ├── components.css
│   │   │   ├── kanban.css
│   │   │   ├── modals.css
│   │   │   └── responsive.css
│   │   └── js/
│   │       ├── modules/
│   │       │   ├── api.js
│   │       │   ├── auth.js
│   │       │   ├── socket.js
│   │       │   └── ui.js
│   │       ├── pages/
│   │       │   ├── dashboard.js
│   │       │   ├── projects.js
│   │       │   ├── kanban.js
│   │       │   ├── tasks.js
│   │       │   └── profile.js
│   │       └── app.js
│   └── index.html
├── database/
│   └── schema.sql
├── .env.example
├── package.json
└── README.md
```

---

## 🛠️ Stack Technique

| Couche       | Technologie                      |
|--------------|----------------------------------|
| Frontend     | HTML5, CSS3, JavaScript ES6      |
| Backend      | Node.js 18+, Express.js 4        |
| Base données | MySQL 8, mysql2/promise          |
| Auth         | JWT, bcryptjs                    |
| Temps réel   | Socket.io 4                      |
| Upload       | Multer                           |
| Sécurité     | Helmet, CORS, Morgan, Rate Limit |

---

## ⚙️ Installation

### Prérequis
- Node.js 18+
- MySQL 8
- npm ou yarn

### 1. Cloner le projet
```bash
git clone https://github.com/votre-username/project-management-tool.git
cd project-management-tool
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configurer l'environnement
```bash
cp .env.example .env
```
Éditez `.env` avec vos paramètres MySQL :
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=votre_mot_de_passe
DB_NAME=project_management
JWT_SECRET=changez_ce_secret_en_production
NODE_ENV=development
```

### 4. Initialiser la base de données MySQL
```bash
# Option A : via le script npm
npm run db:init

# Option B : via MySQL directement
mysql -u root -p < database/schema.sql
```

### 5. Lancer l'application
```bash
# Production
npm start

# Développement (avec hot-reload)
npm run dev
```

Ouvrez **http://localhost:5000** dans votre navigateur.

---

## 🔌 API REST

| Méthode | Endpoint                          | Description                  |
|---------|-----------------------------------|------------------------------|
| POST    | /api/auth/register                | Inscription                  |
| POST    | /api/auth/login                   | Connexion                    |
| GET     | /api/auth/profile                 | Profil actuel                |
| GET     | /api/users                        | Liste des utilisateurs       |
| PUT     | /api/users/:id                    | Modifier un utilisateur      |
| POST    | /api/users/avatar/upload          | Upload avatar                |
| GET     | /api/projects                     | Liste des projets            |
| POST    | /api/projects                     | Créer un projet              |
| GET     | /api/projects/:id                 | Détails d'un projet          |
| PUT     | /api/projects/:id                 | Modifier un projet           |
| DELETE  | /api/projects/:id                 | Supprimer un projet          |
| POST    | /api/projects/:id/members         | Ajouter un membre            |
| DELETE  | /api/projects/:id/members/:userId | Retirer un membre            |
| GET     | /api/tasks                        | Liste des tâches (filtres)   |
| POST    | /api/tasks                        | Créer une tâche              |
| PUT     | /api/tasks/:id                    | Modifier / déplacer une tâche|
| DELETE  | /api/tasks/:id                    | Supprimer une tâche          |
| GET     | /api/comments/:taskId             | Commentaires d'une tâche     |
| POST    | /api/comments                     | Ajouter un commentaire       |
| GET     | /api/notifications                | Notifications de l'utilisateur|
| PUT     | /api/notifications/read-all       | Marquer tout comme lu        |
| GET     | /api/dashboard/stats              | Statistiques du dashboard    |
| GET     | /api/dashboard/activities         | Journal d'activités          |

---

## 📦 Commandes npm

```bash
npm start        # Lancer en production
npm run dev      # Lancer en développement (nodemon)
npm run db:init  # Initialiser/recréer la base de données
```

---

## 🔐 Sécurité

- **Helmet** — Headers HTTP sécurisés
- **CORS** — Cross-Origin configuré
- **Rate Limiting** — 200 req/15min par IP
- **JWT** — Tokens signés, expiration configurable
- **bcryptjs** — Hachage des mots de passe (salt 12)
- **Validation** — express-validator sur toutes les routes

---

## 🌐 Déploiement GitHub

```bash
git init
git add .
git commit -m "feat: ProjectFlow — application de gestion de projets complète"
git branch -M main
git remote add origin https://github.com/votre-username/project-management-tool.git
git push -u origin main
```

---

## 👩‍💻 Auteur

**Chaimae** — Étudiante en Génie Logiciel · EMSI 2025  
Portfolio : [github.com/votre-username](https://github.com/votre-username)

---

*ProjectFlow — Projet de portfolio full-stack professionnel*
