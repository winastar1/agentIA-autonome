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
- **Persistance PostgreSQL** : Mémoire persistante avec pgvector pour les embeddings
- **Cache Redis** : Accès rapide aux données fréquemment utilisées
- **Recherche vectorielle** : Recherche sémantique avec embeddings OpenAI

### Capacités Cognitives
- **Planification** : Décomposition de tâches complexes en graphes structurés
- **Raisonnement** : Réflexion profonde et pensée critique
- **Exécution** : Utilisation d'outils appropriés
- **Réflexion** : Auto-évaluation et ajustement de stratégies

### Outils Intégrés
- 🌐 **Recherche web** et navigation
- 📁 **Système de fichiers** (lecture/écriture)
- 💻 **Exécution shell sécurisée** avec whitelist de commandes et sandbox
- 🔗 **Requêtes HTTP** (GET, POST, PUT, DELETE)
- 📂 **Gestion de répertoires**
- 🔧 **Extensible** avec des outils personnalisés

### Sécurité et Contrôle
- **Sandbox shell** : Liste blanche de commandes autorisées
- **Protection anti-patterns** : Détection de commandes dangereuses
- **Limites de coût** : Budget maximum par session configurable
- **Timeouts** : Limites de temps d'exécution pour les commandes
- **Audit complet** : Journalisation de toutes les actions

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
- PostgreSQL 14+ avec extension pgvector (optionnel, pour mémoire persistante)
- Redis 7+ (optionnel, pour cache)

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
MAX_COST_PER_SESSION=10.0
DEFAULT_MODEL=gpt-4-turbo-preview
FAST_MODEL=gpt-3.5-turbo
REASONING_MODEL=claude-3-opus-20240229

# Configuration de la mémoire
ENABLE_PERSISTENT_MEMORY=true
ENABLE_VECTOR_EMBEDDINGS=true

# Configuration de sécurité
ENABLE_SHELL_SANDBOX=true
MAX_SHELL_EXECUTION_TIME=30000
ALLOWED_SHELL_COMMANDS=ls,pwd,cat,echo,grep,find,wc,head,tail,date

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
│   └── Orchestrator.ts              # Boucle autonome principale
├── models/
│   └── ModelRouter.ts               # Routage multi-modèles IA
├── memory/
│   ├── MemoryManager.ts             # Système de mémoire (legacy)
│   └── PersistentMemoryManager.ts   # Mémoire persistante avec pgvector
├── database/
│   ├── client.ts                    # Client PostgreSQL + Redis
│   └── schema.sql                   # Schéma de base de données
├── planner/
│   └── Planner.ts                   # Décomposition de tâches
├── executor/
│   ├── Executor.ts                  # Exécution de tâches (legacy)
│   └── EnhancedExecutor.ts          # Exécution améliorée avec vérification
├── critic/
│   └── Critic.ts                    # Auto-évaluation
├── tools/
│   ├── ToolRegistry.ts              # Registre d'outils
│   └── SecureShellExecutor.ts       # Exécution shell sécurisée
├── communication/
│   ├── Server.ts                    # API REST + WebSocket
│   └── VoiceHandler.ts              # Communication vocale
├── utils/
│   ├── config.ts                    # Configuration
│   └── logger.ts                    # Journalisation
├── types/
│   └── index.ts                     # Définitions TypeScript
└── index.ts                         # Point d'entrée
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
npm test                    # Tous les tests
npm run test:unit          # Tests unitaires
npm run test:integration   # Tests d'intégration
npm run test:coverage      # Couverture de code
```

## 📊 Monitoring

L'agent fournit des métriques détaillées :
- Nombre d'itérations
- Tokens utilisés par modèle
- Coût total en temps réel
- Phase actuelle (Think/Plan/Act/Reflect)
- Progression du plan avec statut des tâches
- Statistiques de mémoire (working/episodic/semantic)
- Historique complet des exécutions
- Alertes de dépassement de budget

## 🔒 Sécurité

- **Sandbox shell** : Whitelist de commandes autorisées configurable
- **Protection anti-patterns** : Détection automatique de commandes dangereuses (rm -rf /, fork bombs, etc.)
- **Limites de coût** : Budget maximum par session pour éviter les dépenses excessives
- **Timeouts** : Limites de temps d'exécution pour toutes les commandes shell
- **Audit complet** : Toutes les actions sont journalisées pour l'audit
- **Stockage sécurisé** : Les clés API sont stockées dans les variables d'environnement
- **Gestion des erreurs** : Mécanismes de récupération robustes

## 🌐 Déploiement Cloud

L'agent est conçu pour le déploiement cloud :
- **Conteneurisé avec Docker** : Image optimisée avec multi-stage build
- **Docker Compose** : Stack complet avec PostgreSQL (pgvector) et Redis
- **Prêt pour Kubernetes** : Configuration adaptable pour orchestration
- **Health checks** : Endpoints de santé pour PostgreSQL, Redis et l'agent
- **Gestion gracieuse** : Arrêt propre avec sauvegarde de l'état
- **Logs structurés** : Format JSON pour agrégation centralisée
- **Scalabilité** : Architecture stateless avec état en base de données

## 🧪 Tests

Le projet inclut une suite de tests complète :

### Tests Unitaires
- `SecureShellExecutor` : Validation de la sécurité shell
- `PersistentMemoryManager` : Tests de persistance et embeddings
- `EnhancedExecutor` : Vérification de l'exécution des tâches

### Tests d'Intégration
- Boucle autonome complète end-to-end
- Persistance de la mémoire entre sessions
- Gestion des erreurs et récupération
- Suivi des coûts et limites budgétaires

### Exécution des Tests
```bash
npm test                    # Tous les tests
npm run test:unit          # Tests unitaires uniquement
npm run test:integration   # Tests d'intégration uniquement
npm run test:coverage      # Rapport de couverture
npm run test:watch         # Mode watch pour développement
```

## 🆕 Nouveautés v2.0

### Mémoire Persistante
- Stockage PostgreSQL avec extension pgvector
- Embeddings vectoriels pour recherche sémantique
- Cache Redis pour performances optimales
- Consolidation automatique des mémoires importantes

### Sécurité Renforcée
- Sandbox shell avec whitelist de commandes
- Détection de patterns dangereux
- Limites de coût par session
- Timeouts configurables

### Exécution Améliorée
- Vérification automatique des critères d'acceptation
- Retry intelligent avec backoff exponentiel
- Conversation contextuelle pour résolution de problèmes
- Meilleure gestion des erreurs

### Tests Complets
- Suite de tests unitaires et d'intégration
- Configuration Jest avec TypeScript
- Couverture de code
- Tests de sécurité

## 📝 Licence

ISC

## 👤 Auteur

Lucas Caporgno

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📞 Support

Pour toute question ou problème, ouvrez une issue sur GitHub
