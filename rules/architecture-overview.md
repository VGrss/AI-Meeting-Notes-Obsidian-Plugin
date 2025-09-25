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

### Fichiers de Configuration
- **manifest.json** : Configuration du plugin Obsidian
- **package.json** : Dépendances et scripts
- **tsconfig.json** : Configuration TypeScript
- **esbuild.config.mjs** : Configuration de build

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

## 📚 Ressources Utiles

- **Documentation Obsidian** : [Plugin Development](https://docs.obsidian.md/Plugins/Getting+Started)
- **TypeScript** : [Handbook](https://www.typescriptlang.org/docs/)
- **Jest** : [Testing Framework](https://jestjs.io/docs/getting-started)
- **esbuild** : [Bundler](https://esbuild.github.io/)

---

**Dernière mise à jour** : 25 septembre 2024  
**Version** : 1.0  
**Auteur** : Victor Gross
