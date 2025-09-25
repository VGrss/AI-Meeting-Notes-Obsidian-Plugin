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
│   ├── TrackingService.ts     # Service de tracking cross-provider
│   ├── AudioConversionService.ts # Service de conversion audio
│   └── OpenAIService.ts       # Service OpenAI (legacy)
│
├── src/                       # Code source principal
│   ├── config.ts              # Configuration globale
│   └── providers/             # Système multi-providers
│       ├── index.ts           # Exports principaux
│       ├── registry.ts        # Registry des providers
│       ├── types.ts           # Types et interfaces
│       ├── errors.ts          # Gestion d'erreurs
│       ├── local/             # Providers locaux
│       │   ├── index.ts
│       │   ├── WhisperCppTranscriber.ts
│       │   └── FasterWhisperTranscriber.ts
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
  - Support natif des Blob audio

- **WhisperCpp** (`src/providers/local/WhisperCppTranscriber.ts`)
  - Transcription locale C++
  - Conversion automatique Blob → WAV
  - Optimisé pour la performance locale
  - Support des formats WAV, MP3, OGG, FLAC

- **FasterWhisper** (`src/providers/local/FasterWhisperTranscriber.ts`)
  - Transcription locale Python optimisée
  - Conversion automatique Blob → WAV
  - Modèles téléchargés automatiquement
  - Support des formats WAV, MP3, OGG, FLAC

#### Résumé
- **OpenAI GPT-4o** (`src/providers/openai/OpenAISummarizer.ts`)
  - API cloud OpenAI
  - 2000 tokens maximum
  - Structure de résumé standardisée

### Providers Prévus (Non Implémentés)
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

### 3. TrackingService (`services/TrackingService.ts`)
- **Rôle** : Tracking cross-provider et monitoring des performances
- **Fonctionnalités** :
  - Suivi des sessions de pipeline
  - Métriques de conversion audio
  - Tracking des providers (local/cloud)
  - Monitoring des performances

### 4. AudioConversionService (`services/AudioConversionService.ts`)
- **Rôle** : Conversion automatique des formats audio
- **Fonctionnalités** :
  - Conversion Blob → formats supportés (WAV, MP3, OGG, FLAC)
  - Optimisation pour providers locaux
  - Gestion des fichiers temporaires
  - Support multi-formats (WebM/Opus, MP4/AAC)

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

### Configuration GlitchTip (Tracking Cross-Provider)

#### Setup Initial
1. **Créer un compte** sur [GlitchTip](https://glitchtip.com/)
2. **Créer un projet** pour le plugin
3. **Récupérer le DSN** depuis les paramètres du projet
4. **Configurer dans Obsidian** : Settings → AI Voice Meeting Notes → GlitchTip DSN

#### Configuration du Tracking Cross-Provider
```typescript
interface VoiceNotesSettings {
  glitchTipDsn: string;        // DSN Glitchtip
  glitchTipEnabled: boolean;   // Activation/désactivation
}
```

#### DSN Glitchtip configuré
```
https://fc4c4cf2c55b4aaaa076954be7e02814@app.glitchtip.com/12695
```

**Note de sécurité** : Les clés sont cachées dans le code pour des raisons de sécurité.

#### Configuration Avancée
```typescript
// TrackingService.ts
class TrackingService {
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

#### Données Collectées par le Tracking

##### Métadonnées de session
- ID de session unique
- Timestamps de début/fin
- Providers utilisés (recording, transcription, summarization)
- Nombre d'étapes exécutées

##### Métadonnées d'enregistrement
- Durée d'enregistrement
- Taille du fichier audio
- Type MIME
- Nombre de chunks

##### Métadonnées de transcription
- Taille du fichier audio
- Longueur du texte transcrit
- Langue détectée
- Nombre de segments
- Temps de traitement

##### Métadonnées de résumé
- Longueur du texte source
- Longueur du résumé généré
- Tokens utilisés
- Ratio de compression
- Temps de traitement

#### Types d'Événements Trackés
- **Pipeline d'enregistrement** : `recording_start`, `recording_stop`, `recording_error`
- **Pipeline de transcription** : `transcription_start`, `transcription_success`, `transcription_error`
- **Pipeline de résumé IA** : `summarization_start`, `summarization_success`, `summarization_error`
- **Conversion audio** : `audio_conversion_start`, `audio_conversion_success`, `audio_conversion_error`
- **Mécanisme de fallback** : `fallback_triggered`, `fallback_success`, `fallback_failed`
- **Pipeline complet** : `pipeline_complete`, `pipeline_error_*`

#### Métriques de Conversion Audio
- **Formats** : Source (WebM/Opus) et cible (WAV/MP3/OGG/FLAC)
- **Tailles** : Fichier original vs converti
- **Performance** : Temps de conversion et de transcription
- **Providers** : Principal et fallback utilisés
- **Qualité** : Taux de succès/échec par provider

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
User → RecordingView → VoiceRecorder → Audio Blob (audio/webm;codecs=opus)
```

### 2. Transcription avec Conversion Audio
```
Audio Blob → Provider Detection → {
  Local Provider → AudioConversionService → WAV File → Local Transcription
  Cloud Provider → Direct Transcription
} → TranscriptionResult
```

### 3. Mécanisme de Fallback
```
Transcription Failure → Error Detection → {
  Format Error → Audio Conversion Retry
  Provider Error → Fallback to OpenAI
  Complete Failure → User Notification
}
```

### 4. Résumé
```
TranscriptionResult → Provider Registry → SummarizerProvider → SummarizationResult
```

### 5. Affichage et Nettoyage
```
Results → UI Components → User Interface
Temporary Files → Auto Cleanup → Disk Space Management
```

## 🎵 Gestion des Formats Audio

### Problème Résolu
Le plugin rencontrait des erreurs `"Format non supporté: Blob audio"` avec les providers locaux car :
- **VoiceRecorder** génère des `Blob` au format `audio/webm;codecs=opus`
- **Providers locaux** attendent des chemins de fichiers (`string`)
- **Environnement Electron** nécessite une conversion spécifique

### Solution Implémentée

#### 1. AudioConversionService
- **Conversion automatique** : Blob → WAV/MP3/OGG/FLAC
- **Optimisation** : 16kHz, mono, qualité 8/10 pour Whisper
- **Gestion temporaire** : Fichiers nettoyés automatiquement
- **Multi-formats** : WebM/Opus, MP4/AAC supportés

#### 2. Providers Locaux Améliorés
- **WhisperCpp** et **FasterWhisper** acceptent maintenant les `Blob`
- **Détection automatique** du type d'entrée
- **Conversion transparente** via `AudioConversionService`
- **Logging détaillé** du processus

#### 3. Mécanisme de Fallback Intelligent
- **Tentative principale** : Provider sélectionné par l'utilisateur
- **Fallback automatique** : Basculement vers OpenAI en cas d'échec
- **Notification utilisateur** : Information du changement de provider
- **Gestion robuste** : Erreurs en cascade gérées proprement

#### 4. Gestion d'Erreurs Améliorée
- **Messages informatifs** : Liste des formats supportés
- **Suggestions de résolution** : Indication de la conversion automatique
- **Codes d'erreur standardisés** : Métadonnées détaillées
- **Tracking complet** : Monitoring des conversions et fallbacks

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

## 🔮 **Améliorations Futures**

### 1. **Conversion Audio Avancée**
- **FFmpeg Integration** : Conversion de qualité professionnelle
- **Formats étendus** : Support de plus de formats audio
- **Conversion asynchrone** : Traitement en arrière-plan
- **Compression intelligente** : Adaptation selon le provider

### 2. **Optimisations Performance**
- **Cache des conversions** : Éviter les reconversions identiques
- **Conversion parallèle** : Traitement simultané de gros fichiers
- **Préchargement** : Anticipation des conversions fréquentes
- **Monitoring ressources** : Surveillance CPU/mémoire/disque

### 3. **Monitoring et Analytics**
- **Dashboard temps réel** : Métriques de conversion en direct
- **Alertes qualité** : Notifications de dégradation audio
- **Métriques avancées** : Analyse des patterns d'usage
- **Rapports de performance** : Statistiques détaillées par provider

### 4. **Expérience Utilisateur**
- **Conversion progressive** : Barre de progression pour les gros fichiers
- **Prévisualisation** : Aperçu audio avant conversion
- **Paramètres avancés** : Configuration fine de la qualité
- **Historique des conversions** : Suivi des fichiers traités

## 🎯 **Avantages de l'Architecture Audio**

### ✅ **Compatibilité Totale**
- Support complet des formats audio modernes
- Compatibilité avec tous les providers (local et cloud)
- Fonctionnement transparent pour l'utilisateur

### ✅ **Robustesse Maximale**
- Mécanisme de fallback automatique
- Gestion d'erreurs granulaire et informative
- Récupération automatique des échecs

### ✅ **Performance Optimisée**
- Conversion optimisée pour la transcription
- Nettoyage automatique des fichiers temporaires
- Monitoring détaillé des performances

### ✅ **Expérience Utilisateur Fluide**
- Messages d'erreur clairs et informatifs
- Notifications de changement de provider
- Fonctionnement transparent et fiable

---

**Dernière mise à jour** : 19 décembre 2024  
**Version** : 1.7.7  
**Auteur** : Victor Gross
