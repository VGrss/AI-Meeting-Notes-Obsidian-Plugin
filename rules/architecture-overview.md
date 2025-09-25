# 🏗️ Architecture Overview - AI Voice Meeting Notes

## 🎯 Vue d'ensemble pour les LLMs

Ce document fournit une vue d'ensemble de l'architecture du plugin AI Voice Meeting Notes pour faciliter la navigation et la compréhension du code par les assistants IA.

## 📁 Structure du Projet

```
ObisidianRecorder/
├── main.ts                    # Point d'entrée principal du plugin
├── main.js                    # Version compilée (générée)
├── manifest.json              # Configuration du plugin Obsidian
├── package.json               # Dépendances et scripts
├── tsconfig.json              # Configuration TypeScript
├── esbuild.config.mjs         # Configuration de build
├── jest.config.js             # Configuration des tests
├── styles.css                 # Styles CSS du plugin
├── versions.json              # Historique des versions
│
├── audio/                     # Gestion audio
│   └── VoiceRecorder.ts       # Service d'enregistrement audio
│
├── services/                  # Services principaux
│   ├── ErrorTrackingService.ts # Monitoring d'erreurs (GlitchTip)
│   └── OpenAIService.ts       # Service OpenAI (legacy)
│
├── src/                       # Code source principal
│   ├── config.ts              # Configuration globale
│   └── providers/             # Système multi-providers
│       ├── index.ts           # Exports principaux
│       ├── registry.ts        # Registry des providers
│       ├── types.ts           # Types et interfaces
│       ├── errors.ts          # Gestion d'erreurs
│       └── openai/            # Providers OpenAI
│           ├── index.ts
│           ├── OpenAITranscriber.ts
│           └── OpenAISummarizer.ts
│
├── ui/                        # Interface utilisateur
│   ├── RecordingModal.ts      # Modal d'enregistrement
│   ├── RecordingView.ts       # Vue principale d'enregistrement
│   └── TranscriptModal.ts     # Modal d'affichage des transcripts
│
├── rules/                     # Documentation et procédures
│   ├── product-spec.md        # Spécification du produit
│   ├── architecture-overview.md # Ce fichier
│   └── RELEASE_PROCEDURE.md   # Procédure de publication
│
├── samples/                   # Fichiers de test
│   ├── 10s_meeting.mp3        # Audio de test
│   └── meeting_excerpt.txt    # Extrait de réunion
│
└── release notes/             # Notes de version
    └── RELEASE_NOTES_v1.7.1.md
```

## 🏛️ Architecture Multi-Providers

### Concept Principal
Le plugin utilise une architecture modulaire basée sur un système de providers qui permet de supporter différents services de transcription et de résumé.

### Composants Clés

#### 1. Registry des Providers (`src/providers/registry.ts`)
- **Rôle** : Gestion centralisée de tous les providers
- **Fonctions principales** :
  - `registerProvider()` : Enregistrer un nouveau provider
  - `getTranscriberProvider()` : Récupérer un provider de transcription
  - `getSummarizerProvider()` : Récupérer un provider de résumé
  - `getAllProviders()` : Lister tous les providers d'un type

#### 2. Types et Interfaces (`src/providers/types.ts`)
- **TranscriberProvider** : Interface pour les providers de transcription
- **SummarizerProvider** : Interface pour les providers de résumé
- **ProviderType** : Types de providers supportés
- **TranscriptionResult** : Structure des résultats de transcription
- **SummarizationResult** : Structure des résultats de résumé

#### 3. Gestion d'Erreurs (`src/providers/errors.ts`)
- **ProviderError** : Classe d'erreur spécialisée
- **ProviderErrorCode** : Codes d'erreur standardisés
- **Méthodes utilitaires** : Création d'erreurs contextuelles

### Providers Implémentés

#### Transcription
- **OpenAI Whisper** (`src/providers/openai/OpenAITranscriber.ts`)
  - API cloud OpenAI
  - Haute précision, multilingue
  - Limite de 25MB par fichier

#### Résumé
- **OpenAI GPT-4o** (`src/providers/openai/OpenAISummarizer.ts`)
  - API cloud OpenAI
  - 2000 tokens maximum
  - Structure de résumé standardisée

### Providers Prévus (Non Implémentés)
- **WhisperCpp** : Transcription locale C++
- **FasterWhisper** : Transcription locale Python optimisée
- **Ollama** : Résumé local avec modèles open-source
- **GPT4All** : Résumé local léger

## 🎨 Interface Utilisateur

### Composants Principaux

#### 1. RecordingView (`ui/RecordingView.ts`)
- **Rôle** : Vue principale d'enregistrement
- **Fonctionnalités** :
  - Contrôles d'enregistrement (start/pause/stop)
  - Affichage des enregistrements passés
  - Gestion des onglets (résumé/transcription)
  - Interface de configuration des providers

#### 2. RecordingModal (`ui/RecordingModal.ts`)
- **Rôle** : Modal d'enregistrement rapide
- **Fonctionnalités** :
  - Enregistrement en modal
  - Interface simplifiée
  - Intégration avec le système de providers

#### 3. TranscriptModal (`ui/TranscriptModal.ts`)
- **Rôle** : Affichage des transcripts et résumés
- **Fonctionnalités** :
  - Affichage formaté des résultats
  - Boutons de copie
  - Navigation entre résumé et transcription

## 🔧 Services Principaux

### 1. VoiceRecorder (`audio/VoiceRecorder.ts`)
- **Rôle** : Gestion de l'enregistrement audio
- **Fonctionnalités** :
  - Enregistrement avec MediaRecorder API
  - Compression audio (Opus/AAC)
  - Contrôles pause/reprise
  - Validation de taille de fichier

### 2. ErrorTrackingService (`services/ErrorTrackingService.ts`)
- **Rôle** : Monitoring et suivi d'erreurs
- **Fonctionnalités** :
  - Intégration GlitchTip
  - Contexte enrichi des erreurs
  - Configuration utilisateur
  - Logging détaillé

## ⚙️ Configuration et Paramètres

### Structure des Paramètres
```typescript
interface VoiceNotesSettings {
  // API Keys
  openaiApiKey: string;
  glitchTipDsn: string;
  enableErrorTracking: boolean;
  
  // Providers
  transcriberProvider: 'openai-whisper' | 'whispercpp' | 'fasterwhisper';
  summarizerProvider: 'openai-gpt4o' | 'ollama' | 'gpt4all';
  
  // Configuration locale
  localProviders: {
    ollama: { host: string; port: number; model: string; };
    whispercpp: { binaryPath: string; modelPath: string; extraArgs: string[]; };
    fasterwhisper: { pythonPath: string; modelName: string; };
  };
  
  // Personnalisation
  customSummaryPrompt: string;
}
```

### Configuration GlitchTip (Monitoring d'Erreurs)

#### Setup Initial
1. **Créer un compte** sur [GlitchTip](https://glitchtip.com/)
2. **Créer un projet** pour le plugin
3. **Récupérer le DSN** depuis les paramètres du projet
4. **Configurer dans Obsidian** : Settings → AI Voice Meeting Notes → GlitchTip DSN

#### Configuration Avancée
```typescript
// ErrorTrackingService.ts
class ErrorTrackingService {
  init(dsn: string, enabled: boolean): void {
    if (enabled && dsn) {
      // Configuration Sentry/GlitchTip
      Sentry.init({
        dsn: dsn,
        environment: 'production',
        beforeSend: (event) => {
          // Filtrage des erreurs sensibles
          return this.filterSensitiveData(event);
        }
      });
    }
  }
}
```

#### Types d'Erreurs Trackées
- **Erreurs de transcription** : Échecs API Whisper
- **Erreurs de résumé** : Échecs API GPT-4o
- **Erreurs de providers** : Problèmes de configuration
- **Erreurs d'enregistrement** : Problèmes audio
- **Erreurs d'interface** : Problèmes UI/UX

### Configuration des Providers Locaux

#### Ollama (Résumé Local)
```typescript
// Configuration dans les paramètres
localProviders: {
  ollama: {
    host: 'localhost',        // Adresse du serveur Ollama
    port: 11434,             // Port par défaut
    model: 'mistral:7b'      // Modèle à utiliser
  }
}
```

**Prérequis :**
- Installation d'Ollama : `curl -fsSL https://ollama.ai/install.sh | sh`
- Modèle installé : `ollama pull mistral:7b`
- Serveur démarré : `ollama serve`

#### WhisperCpp (Transcription Locale)
```typescript
// Configuration dans les paramètres
localProviders: {
  whispercpp: {
    binaryPath: '/usr/local/bin/whisper-cpp',
    modelPath: '/path/to/ggml-base.en.bin',
    extraArgs: ['--threads', '4', '--language', 'en']
  }
}
```

**Prérequis :**
- Compilation de WhisperCpp
- Téléchargement du modèle GGML
- Configuration des chemins

#### FasterWhisper (Transcription Python)
```typescript
// Configuration dans les paramètres
localProviders: {
  fasterwhisper: {
    pythonPath: 'python3',
    modelName: 'small'  // tiny, base, small, medium, large
  }
}
```

**Prérequis :**
- Python 3.8+
- Installation : `pip install faster-whisper`
- Modèles téléchargés automatiquement

### Configuration des Providers Cloud

#### OpenAI (Whisper + GPT-4o)
```typescript
// Configuration requise
settings: {
  openaiApiKey: 'sk-...',  // Clé API OpenAI
  transcriberProvider: 'openai-whisper',
  summarizerProvider: 'openai-gpt4o'
}
```

**Limites et Coûts :**
- **Whisper** : 25MB max par fichier, $0.006/minute
- **GPT-4o** : 2000 tokens max, $0.03/1K tokens
- **Rate Limits** : 500 requêtes/minute

### Fichiers de Configuration

#### manifest.json
```json
{
  "id": "ai-voice-meeting-notes",
  "name": "AI Voice Meeting Notes",
  "version": "1.7.1",
  "minAppVersion": "0.15.0",
  "description": "Record, transcribe, and summarize voice meetings with AI integration",
  "author": "Victor Gross",
  "isDesktopOnly": true
}
```

#### package.json
```json
{
  "name": "ai-voice-meeting-notes",
  "version": "1.7.1",
  "scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production",
    "test": "jest"
  },
  "dependencies": {
    "@sentry/browser": "^10.10.0",
    "@sentry/tracing": "^7.120.4"
  }
}
```

#### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### Variables d'Environnement

#### Développement
```bash
# .env.local (optionnel)
OPENAI_API_KEY=sk-...
GLITCHTIP_DSN=https://...
NODE_ENV=development
```

#### Production
- Configuration via l'interface Obsidian
- Stockage sécurisé dans les paramètres du plugin
- Pas de variables d'environnement requises

## 🔄 Flux de Données

### 1. Enregistrement
```
User → RecordingView → VoiceRecorder → Audio File
```

### 2. Transcription
```
Audio File → Provider Registry → TranscriberProvider → TranscriptionResult
```

### 3. Résumé
```
TranscriptionResult → Provider Registry → SummarizerProvider → SummarizationResult
```

### 4. Affichage
```
Results → UI Components → User Interface
```

## 🧪 Tests et Qualité

### Configuration des Tests
- **Jest** : Framework de tests
- **ts-jest** : Support TypeScript
- **Configuration** : `jest.config.js`

### Tests Disponibles
- Tests unitaires pour le registry des providers
- Tests d'intégration pour les services
- Tests de régression pour les fonctionnalités

## 🚀 Build et Déploiement

### Scripts Disponibles
```json
{
  "dev": "node esbuild.config.mjs",
  "build": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production",
  "test": "jest",
  "version": "node version-bump.mjs && git add manifest.json versions.json"
}
```

### Processus de Build
1. **TypeScript** : Vérification des types
2. **esbuild** : Compilation et bundling
3. **Optimisation** : Minification et compression
4. **Output** : `main.js` et `manifest.json`

## 🔒 Sécurité et Bonnes Pratiques

### Gestion des Clés API
- **Stockage sécurisé** : Clés stockées localement dans les paramètres Obsidian
- **Masquage dans l'UI** : Affichage avec des astérisques dans les paramètres
- **Validation** : Vérification du format des clés avant utilisation
- **Rotation** : Support du changement de clés sans redémarrage

### Données Sensibles
- **Filtrage GlitchTip** : Suppression des données sensibles avant envoi
- **Logs locaux** : Pas de données sensibles dans les logs
- **Transcription** : Données audio traitées localement quand possible
- **Résumés** : Contenu des réunions potentiellement sensible

### Validation des Entrées
```typescript
// Exemple de validation des paramètres
function validateSettings(settings: VoiceNotesSettings): boolean {
  // Validation de la clé OpenAI
  if (settings.openaiApiKey && !settings.openaiApiKey.startsWith('sk-')) {
    throw new Error('Invalid OpenAI API key format');
  }
  
  // Validation des ports
  if (settings.localProviders.ollama.port < 1 || settings.localProviders.ollama.port > 65535) {
    throw new Error('Invalid Ollama port');
  }
  
  return true;
}
```

### Gestion des Erreurs Sécurisée
- **Pas d'exposition** : Erreurs internes non exposées à l'utilisateur
- **Messages génériques** : Messages d'erreur informatifs mais sécurisés
- **Logging contrôlé** : Seules les erreurs non sensibles sont loggées
- **Fallback** : Comportement de secours en cas d'erreur

## 🔍 Points d'Attention pour les LLMs

### 1. Navigation dans le Code
- **Point d'entrée** : `main.ts` (classe `VoiceNotesPlugin`)
- **Providers** : `src/providers/` pour la logique métier
- **UI** : `ui/` pour les composants d'interface
- **Services** : `services/` et `audio/` pour les fonctionnalités

### 2. Patterns Utilisés
- **Registry Pattern** : Pour la gestion des providers
- **Strategy Pattern** : Pour les différents providers
- **Observer Pattern** : Pour les mises à jour d'état
- **Factory Pattern** : Pour la création des providers

### 3. Gestion d'Erreurs
- **ProviderError** : Erreurs spécifiques aux providers
- **ErrorTrackingService** : Monitoring centralisé
- **Retry Logic** : Dans les providers pour la résilience

### 4. Configuration
- **Settings** : Interface `VoiceNotesSettings`
- **Providers** : Configuration dans `localProviders`
- **Validation** : Vérification des paramètres requis

### 5. Sécurité
- **Clés API** : Stockage et validation sécurisés
- **Données sensibles** : Filtrage et protection
- **Validation** : Vérification des entrées utilisateur
- **Erreurs** : Gestion sécurisée des erreurs

## 🐛 Debugging et Développement

### Outils de Debug
- **Console Obsidian** : `Ctrl+Shift+I` pour ouvrir les DevTools
- **Logs du plugin** : Messages dans la console du navigateur
- **GlitchTip** : Monitoring des erreurs en production
- **Tests unitaires** : `npm test` pour les tests Jest

### Points de Debug Courants
```typescript
// 1. Vérification des providers
console.log('Providers disponibles:', getAllProviders('transcriber'));

// 2. Validation des paramètres
console.log('Settings:', this.settings);

// 3. État de l'enregistrement
console.log('Recording state:', this.recorder.isRecording);

// 4. Erreurs de transcription
this.errorTracker.captureException(error, {
  tags: { component: 'transcription' },
  extra: { provider: this.settings.transcriberProvider }
});
```

### Développement Local
```bash
# 1. Mode développement
npm run dev

# 2. Build de production
npm run build

# 3. Tests
npm test

# 4. Vérification des types
npx tsc --noEmit
```

### Hot Reload
- **esbuild** : Recompilation automatique en mode dev
- **Obsidian** : Rechargement du plugin nécessaire
- **Cache** : Vider le cache si nécessaire

### Profiling et Performance
- **Chrome DevTools** : Profiling des performances
- **Memory leaks** : Surveillance de la mémoire
- **Network** : Monitoring des appels API
- **Timing** : Mesure des temps de traitement

## 📚 Ressources Utiles

### Documentation Technique
- **Documentation Obsidian** : [Plugin Development](https://docs.obsidian.md/Plugins/Getting+Started)
- **TypeScript** : [Handbook](https://www.typescriptlang.org/docs/)
- **Jest** : [Testing Framework](https://jestjs.io/docs/getting-started)
- **esbuild** : [Bundler](https://esbuild.github.io/)

### APIs et Services
- **OpenAI API** : [Documentation](https://platform.openai.com/docs)
- **GlitchTip** : [Documentation](https://glitchtip.com/docs)
- **Ollama** : [Documentation](https://ollama.ai/docs)
- **WhisperCpp** : [GitHub](https://github.com/ggerganov/whisper.cpp)

### Outils de Développement
- **VS Code** : Extensions TypeScript et Obsidian
- **Chrome DevTools** : Debugging et profiling
- **Git** : Gestion des versions
- **GitHub** : Collaboration et CI/CD

---

**Dernière mise à jour** : 25 septembre 2024  
**Version** : 1.0  
**Auteur** : Victor Gross
