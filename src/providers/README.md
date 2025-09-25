# 🔌 Système de Providers

Ce module fournit une architecture modulaire pour gérer différents providers de transcription, résumé et synthèse vocale (TTS).

## 📋 Vue d'ensemble

Le système de providers isole le cœur du plugin des implémentations spécifiques (cloud/local) via des interfaces et un registry centralisé.

### 🏗️ Architecture

```
src/providers/
├── types.ts          # Interfaces et types
├── errors.ts         # Erreurs standardisées
├── registry.ts       # Registry et factory
├── index.ts          # Point d'entrée principal
├── __tests__/        # Tests unitaires
└── README.md         # Documentation
```

## 🚀 Utilisation

### Import des types et fonctions

```typescript
import {
  TranscriberProvider,
  SummarizerProvider,
  TTSProvider,
  ProviderError,
  ProviderErrorCode,
  registerProvider,
  getTranscriberProvider,
  ProviderFactory,
} from './src/providers';
```

### Enregistrement d'un provider

```typescript
// Provider de transcription
const myTranscriber: TranscriberProvider = {
  id: 'my-transcriber',
  name: 'Mon Transcriber',
  
  async check(): Promise<ProviderHealth> {
    return { ok: true, details: 'Provider opérationnel' };
  },
  
  async transcribe(audioPath: string, opts?: TranscriptionOptions): Promise<TranscriptionResult> {
    // Implémentation de la transcription
    return {
      text: 'Texte transcrit...',
      lang: 'fr',
      segments: [],
    };
  },
};

// Enregistrement
registerProvider(myTranscriber);
```

### Utilisation d'un provider

```typescript
try {
  const transcriber = getTranscriberProvider('my-transcriber');
  
  // Vérification de santé
  const health = await transcriber.check();
  if (!health.ok) {
    throw new Error(`Provider non disponible: ${health.details}`);
  }
  
  // Transcription
  const result = await transcriber.transcribe('/path/to/audio.mp3', {
    language: 'fr',
    model: 'whisper-1',
  });
  
  console.log('Texte transcrit:', result.text);
} catch (error) {
  if (error instanceof ProviderError) {
    console.error(`Erreur provider [${error.code}]: ${error.message}`);
    if (error.hint) {
      console.log(`Indice: ${error.hint}`);
    }
  }
}
```

### Factory pour création rapide

```typescript
// Création et enregistrement automatique
const provider = ProviderFactory.createTranscriberProvider(
  'whisper-local',
  'Whisper Local',
  {
    async check() {
      return { ok: true };
    },
    async transcribe(audioPath, opts) {
      // Implémentation...
      return { text: 'Transcription...' };
    },
  }
);
```

## 🔧 Interfaces principales

### TranscriberProvider

```typescript
interface TranscriberProvider {
  id: string;
  name: string;
  check(): Promise<ProviderHealth>;
  transcribe(audioPath: string, opts?: TranscriptionOptions): Promise<TranscriptionResult>;
}
```

### SummarizerProvider

```typescript
interface SummarizerProvider {
  id: string;
  name: string;
  check(): Promise<ProviderHealth>;
  summarize(text: string, opts?: SummarizationOptions): Promise<SummarizationResult>;
}
```

### TTSProvider

```typescript
interface TTSProvider {
  id: string;
  name: string;
  check(): Promise<ProviderHealth>;
  speak(text: string, opts?: TTSOptions): Promise<TTSResult>;
}
```

## 🚨 Gestion d'erreurs

### ProviderError

```typescript
// Erreur standardisée
const error = new ProviderError(
  ProviderErrorCode.CONFIG_INVALID,
  'Configuration invalide',
  {
    hint: 'Vérifiez votre clé API',
    providerId: 'openai',
    metadata: { field: 'apiKey' },
  }
);

// Méthodes statiques pour erreurs courantes
const configError = ProviderError.configMissing('apiKey', 'openai');
const connectionError = ProviderError.connectionFailed('openai', cause);
const quotaError = ProviderError.quotaExceeded('openai', '1000/month');
```

### Codes d'erreur disponibles

- `CONFIG_INVALID` - Configuration invalide
- `CONFIG_MISSING` - Configuration manquante
- `CONNECTION_FAILED` - Échec de connexion
- `AUTH_INVALID` - Authentification invalide
- `QUOTA_EXCEEDED` - Quota dépassé
- `FILE_NOT_FOUND` - Fichier non trouvé
- `PROCESSING_FAILED` - Échec de traitement
- `PROVIDER_NOT_FOUND` - Provider non trouvé
- Et plus...

## 🧪 Tests

```bash
# Lancer les tests
npm test

# Tests avec couverture
npm run test -- --coverage
```

### Tests unitaires

Les tests couvrent :
- ✅ Enregistrement et récupération des providers
- ✅ Gestion des erreurs
- ✅ Factory et registry
- ✅ Types de providers multiples

## 📊 Registry

### Fonctions disponibles

```typescript
// Enregistrement
registerProvider(provider);

// Récupération
getTranscriberProvider(id);
getSummarizerProvider(id);
getTTSProvider(id);

// Liste
getAllProviders(type);
getAllProvidersList();

// Gestion
isProviderRegistered(id);
unregisterProvider(id);
clearRegistry();

// Statistiques
getProviderCount();
getProviderIds(type);
```

## 🔄 Cycle de vie d'un provider

1. **Création** - Implémentation de l'interface
2. **Enregistrement** - Ajout au registry
3. **Vérification** - Appel de `check()`
4. **Utilisation** - Appel des méthodes métier
5. **Gestion d'erreurs** - Capture des `ProviderError`
6. **Nettoyage** - Désenregistrement si nécessaire

## 🎯 Bonnes pratiques

### ✅ À faire

- Toujours vérifier la santé du provider avant utilisation
- Implémenter une gestion d'erreur robuste
- Utiliser des IDs uniques et descriptifs
- Fournir des messages d'erreur clairs avec des indices
- Tester vos providers avec les tests unitaires

### ❌ À éviter

- Ne pas gérer les erreurs de réseau/timeout
- Utiliser des IDs génériques ou non-uniques
- Oublier de vérifier la santé du provider
- Ignorer les erreurs de configuration
- Créer des providers sans implémenter `check()`

## 🔮 Extensibilité

Le système est conçu pour être facilement extensible :

1. **Nouveaux types de providers** - Ajouter de nouvelles interfaces
2. **Nouvelles options** - Étendre les interfaces d'options
3. **Nouveaux codes d'erreur** - Ajouter à `ProviderErrorCode`
4. **Nouveaux formats** - Étendre les types de résultats

---

🤖 **Généré avec [Claude Code](https://claude.ai/code)**

