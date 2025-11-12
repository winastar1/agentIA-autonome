# Agent IA Autonome

Un agent IA totalement autonome capable de penser, réfléchir et exécuter des tâches de manière indépendante sans intervention humaine.

## 🎯 Caractéristiques

### Autonomie Complète
- **Boucle autonome** : Think → Plan → Act → Reflect
- **Prise de décision indépendante** sans nécessiter d'approbation humaine
- **Exécution progressive** étape par étape
- **Auto-évaluation** et ajustement des stratégies

### Intégration Multi-IA
- **OpenAI** (GPT-4, GPT-3.5)
- **Anthropic** (Claude 3 Opus, Sonnet, Haiku)
- **Google AI** (Gemini Pro)
- **Routage intelligent** basé sur le type de tâche et le coût
- **Mécanismes de secours** automatiques

### Système de Mémoire
- **Mémoire de travail** : Contexte actuel et scratchpad
- **Mémoire épisodique** : Journal chronologique des événements
- **Mémoire sémantique** : Stockage vectoriel pour la récupération de connaissances
- **Consolidation automatique** de la mémoire

### Capacités Cognitives
- **Planification** : Décomposition de tâches complexes en graphes structurés
- **Raisonnement** : Réflexion profonde et pensée critique
- **Exécution** : Utilisation d'outils appropriés
- **Réflexion** : Auto-évaluation et ajustement de stratégies

### Outils Intégrés
- 🌐 **Recherche web** et navigation
- 📁 **Système de fichiers** (lecture/écriture)
- 💻 **Exécution shell** dans un environnement sécurisé
- 🔗 **Requêtes HTTP** (GET, POST, PUT, DELETE)
- 📂 **Gestion de répertoires**
- 🔧 **Extensible** avec des outils personnalisés

### Communication
- **API REST** pour les requêtes synchrones
- **WebSocket** pour la communication bidirectionnelle en temps réel
- **Support vocal** (Text-to-Speech et Speech-to-Text)
- **Historique des messages** persistant

## 🚀 Installation

### Prérequis
- Node.js 20+
- npm ou yarn
- Clés API pour les fournisseurs d'IA (OpenAI, Anthropic, Google)

### Installation Locale

```bash
# Installer les dépendances
npm install

# Copier et configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos clés API

# Compiler TypeScript
npm run build

# Démarrer l'agent
npm start
```

### Installation avec Docker

```bash
# Copier et configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos clés API

# Construire et démarrer avec Docker Compose
docker-compose up -d

# Voir les logs
docker-compose logs -f
```

## ⚙️ Configuration

Créez un fichier `.env` avec les configurations suivantes :

```env
# Clés API des fournisseurs d'IA
OPENAI_API_KEY=votre_clé_openai
ANTHROPIC_API_KEY=votre_clé_anthropic
GOOGLE_AI_API_KEY=votre_clé_google

# Configuration du serveur
PORT=3000
NODE_ENV=production

# Configuration de l'agent
MAX_ITERATIONS=50
MAX_EXECUTION_TIME_MS=300000
DEFAULT_MODEL=gpt-4-turbo-preview
FAST_MODEL=gpt-3.5-turbo
REASONING_MODEL=claude-3-opus-20240229

# Configuration vocale (optionnel)
ELEVENLABS_API_KEY=votre_clé_elevenlabs
DEEPGRAM_API_KEY=votre_clé_deepgram
```

## 📡 Utilisation

### API REST

#### Envoyer une directive
```bash
curl -X POST http://localhost:3000/directive \
  -H "Content-Type: application/json" \
  -d '{"directive": "Créer un site web simple avec HTML et CSS"}'
```

#### Vérifier le statut
```bash
curl http://localhost:3000/status
```

#### Obtenir l'historique des messages
```bash
curl http://localhost:3000/messages
```

#### Voir la mémoire de l'agent
```bash
curl http://localhost:3000/memory
```

#### Lister les outils disponibles
```bash
curl http://localhost:3000/tools
```

#### Arrêter l'agent
```bash
curl -X POST http://localhost:3000/stop
```

### WebSocket

```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
  // Envoyer une directive
  ws.send(JSON.stringify({
    type: 'directive',
    content: 'Analyser les tendances du marché crypto'
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Message reçu:', message);
});
```

### Exemples de Directives

```bash
# Développement
"Créer une API REST avec Express pour gérer des utilisateurs"

# Recherche
"Rechercher les dernières avancées en IA et créer un résumé"

# Analyse
"Analyser le fichier data.csv et générer des visualisations"

# Automatisation
"Surveiller le site example.com et m'alerter en cas de changement"

# Créativité
"Écrire un article de blog sur l'IA autonome"
```

## 🏗️ Architecture

```
src/
├── core/
│   └── Orchestrator.ts       # Boucle autonome principale
├── models/
│   └── ModelRouter.ts         # Routage multi-modèles IA
├── memory/
│   └── MemoryManager.ts       # Système de mémoire
├── planner/
│   └── Planner.ts             # Décomposition de tâches
├── executor/
│   └── Executor.ts            # Exécution de tâches
├── critic/
│   └── Critic.ts              # Auto-évaluation
├── tools/
│   └── ToolRegistry.ts        # Registre d'outils
├── communication/
│   ├── Server.ts              # API REST + WebSocket
│   └── VoiceHandler.ts        # Communication vocale
├── utils/
│   ├── config.ts              # Configuration
│   └── logger.ts              # Journalisation
├── types/
│   └── index.ts               # Définitions TypeScript
└── index.ts                   # Point d'entrée
```

## 🔄 Boucle Autonome

L'agent fonctionne selon une boucle autonome continue :

1. **THINK** : Réflexion profonde sur la situation actuelle
2. **PLAN** : Création ou révision du plan d'action
3. **ACT** : Exécution de la tâche suivante avec les outils
4. **REFLECT** : Évaluation des résultats et ajustement

Cette boucle continue jusqu'à ce que l'objectif soit atteint ou que les limites soient atteintes.

## 🛠️ Développement

```bash
# Mode développement avec rechargement automatique
npm run dev

# Compiler TypeScript
npm run build

# Linter
npm run lint

# Tests
npm test
```

## 📊 Monitoring

L'agent fournit des métriques détaillées :
- Nombre d'itérations
- Tokens utilisés
- Coût total
- Phase actuelle
- Progression du plan
- Historique de la mémoire

## 🔒 Sécurité

- Toutes les actions sont journalisées pour l'audit
- Les clés API sont stockées de manière sécurisée dans les variables d'environnement
- L'exécution shell est isolée
- Gestion des erreurs robuste

## 🌐 Déploiement Cloud

L'agent est conçu pour le déploiement cloud :
- Conteneurisé avec Docker
- Prêt pour Kubernetes
- Health checks intégrés
- Gestion gracieuse de l'arrêt
- Logs structurés

## 📝 Licence

ISC

## 👤 Auteur

Lucas Caporgno

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📞 Support

Pour toute question ou problème, ouvrez une issue sur GitHub
