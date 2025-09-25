# ⚙️ Structure des Paramètres - AI Voice Meeting Notes

## 🎯 Vue d'ensemble

Ce document centralise la structure et l'organisation de la page de paramètres du plugin dans Obsidian. Il sert de référence pour le développement et l'itération sur l'interface de configuration.

## 📋 Structure Actuelle des Paramètres

### Interface Utilisateur
**Chemin d'accès** : `Settings → Community Plugins → AI Voice Meeting Notes`

### Sections Principales

#### 1. 🔑 Configuration API
- **Titre** : "AI Voice Meeting Notes Settings"
- **Description** : "This plugin uses OpenAI Whisper for audio transcription and GPT-4o for intelligent summarization of your voice recordings."

##### OpenAI API Key
- **Type** : Text input (password)
- **Placeholder** : "Enter your OpenAI API key"
- **Validation** : Format de clé API OpenAI
- **Masquage** : Affichage avec astérisques
- **Bouton d'aide** : Lien vers platform.openai.com/api-keys
- **Message d'aide** : "💡 Need an API key? Visit the OpenAI Platform above to create your account and get your API key."

#### 2. 🤖 Configuration des Providers

##### Sélection des Providers
- **Provider de Transcription** : Dropdown
  - Options : `openai-whisper`, `whispercpp`, `fasterwhisper`
  - Défaut : `openai-whisper`
- **Provider de Résumé** : Dropdown
  - Options : `openai-gpt4o`, `ollama`, `gpt4all`
  - Défaut : `openai-gpt4o`

##### Configuration des Providers Locaux
- **Ollama** :
  - Host : Text input (défaut: localhost)
  - Port : Number input (défaut: 11434)
  - Modèle : Text input (défaut: mistral:7b)
- **WhisperCpp** :
  - Chemin binaire : Text input
  - Chemin modèle : Text input
  - Arguments supplémentaires : Text input (array)
- **FasterWhisper** :
  - Chemin Python : Text input (défaut: python)
  - Nom du modèle : Text input (défaut: small)

#### 3. 📝 Personnalisation IA

##### Custom Summary Prompt
- **Type** : Textarea (8 lignes)
- **Placeholder** : "Enter your custom summary prompt..."
- **Valeur par défaut** : Template de résumé standardisé
- **Bouton de reset** : Restaurer le prompt par défaut
- **Message d'aide** : "💡 The prompt should include instructions for the AI on how to analyze and summarize voice recordings. Use "**Transcript:**" as a placeholder where the actual transcript will be inserted."

#### 4. 🛡️ Monitoring et Erreurs

##### Error Tracking (Optional)
- **Titre** : "Error Tracking (Optional)"
- **Description** : "Configure GlitchTip error tracking to monitor issues and improve reliability. This helps identify problems like transcription failures."

##### Enable Error Tracking
- **Type** : Toggle
- **Défaut** : true
- **Action** : Réinitialise le service de tracking

##### GlitchTip DSN
- **Type** : Text input
- **Placeholder** : "https://your-key@your-glitchtip-instance.com/project-id"
- **Bouton d'aide** : Lien vers glitchtip.com
- **Message d'aide** : "💡 GlitchTip is an open-source error tracking service. You can use the hosted service or self-host it."

## 🔧 Structure Technique

### Interface TypeScript
```typescript
interface VoiceNotesSettings {
  // API Keys
  openaiApiKey: string;
  glitchTipDsn: string;
  enableErrorTracking: boolean;
  
  // Provider Selection
  transcriberProvider: 'openai-whisper' | 'whispercpp' | 'fasterwhisper';
  summarizerProvider: 'openai-gpt4o' | 'ollama' | 'gpt4all';
  
  // Local Provider Configuration
  localProviders: {
    ollama: {
      host: string;
      port: number;
      model: string;
    };
    whispercpp: {
      binaryPath: string;
      modelPath: string;
      extraArgs: string[];
    };
    fasterwhisper: {
      pythonPath: string;
      modelName: string;
    };
  };
  
  // Customization
  customSummaryPrompt: string;
}
```

### Valeurs par Défaut
```typescript
const DEFAULT_SETTINGS: VoiceNotesSettings = {
  openaiApiKey: '',
  glitchTipDsn: '',
  enableErrorTracking: true,
  customSummaryPrompt: DEFAULT_SUMMARY_PROMPT,
  
  transcriberProvider: 'openai-whisper',
  summarizerProvider: 'openai-gpt4o',
  
  localProviders: {
    ollama: {
      host: 'localhost',
      port: 11434,
      model: 'mistral:7b',
    },
    whispercpp: {
      binaryPath: '',
      modelPath: '',
      extraArgs: [],
    },
    fasterwhisper: {
      pythonPath: 'python',
      modelName: 'small',
    },
  },
}
```

## 🎨 Organisation Visuelle

### Hiérarchie des Sections
```
AI Voice Meeting Notes Settings
├── Description générale
├── 🔑 OpenAI API Key
│   ├── Input field (password)
│   ├── Help button
│   └── Help text
├── 🤖 Provider Configuration
│   ├── Transcriber Provider (dropdown)
│   ├── Summarizer Provider (dropdown)
│   └── Local Providers Configuration
│       ├── Ollama Settings
│       ├── WhisperCpp Settings
│       └── FasterWhisper Settings
├── 📝 AI Summary Customization
│   ├── Custom Summary Prompt (textarea)
│   ├── Reset button
│   └── Help text
└── 🛡️ Error Tracking (Optional)
    ├── Enable Error Tracking (toggle)
    ├── GlitchTip DSN (input)
    ├── Help button
    └── Help text
```

### Diagramme de Flux de Configuration
```
┌─────────────────────────────────────────────────────────────┐
│                    AI Voice Meeting Notes                  │
│                      Settings Page                         │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│  🔑 API Configuration                                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ OpenAI API Key: [••••••••••••••••] [Get API Key]       │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│  🤖 Provider Selection                                      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Transcriber: [OpenAI Whisper ▼]                        │ │
│  │ Summarizer:  [OpenAI GPT-4o ▼]                         │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│  🏠 Local Providers (if selected)                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Ollama: Host[localhost] Port[11434] Model[mistral:7b]  │ │
│  │ WhisperCpp: Binary[/path] Model[/path] Args[--threads] │ │
│  │ FasterWhisper: Python[/usr/bin/python] Model[small]    │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│  📝 AI Customization                                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Custom Summary Prompt:                                  │ │
│  │ ┌─────────────────────────────────────────────────────┐ │ │
│  │ │ You are analyzing a voice recording...              │ │ │
│  │ │ [8 lines of textarea]                              │ │ │
│  │ └─────────────────────────────────────────────────────┘ │ │
│  │ [Reset to Default]                                     │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│  🛡️ Error Tracking (Optional)                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Enable Error Tracking: [✓]                             │ │
│  │ GlitchTip DSN: [https://...] [Learn about GlitchTip]  │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Styles et Classes CSS
- **Section titles** : `h2` avec icônes
- **Subsection titles** : `h3`
- **Help text** : `.help-text` avec icône 💡
- **Description** : `.setting-description`
- **Custom textarea** : `.custom-summary-prompt-textarea`

## 🔄 Workflow de Configuration

### 1. Configuration Initiale
1. **Ouvrir les paramètres** : Settings → Community Plugins
2. **Activer le plugin** : Toggle "AI Voice Meeting Notes"
3. **Configurer l'API** : Entrer la clé OpenAI
4. **Choisir les providers** : Sélectionner transcription et résumé
5. **Configurer les providers locaux** (si nécessaire)
6. **Personnaliser le prompt** (optionnel)
7. **Activer le monitoring** (optionnel)

### 2. Configuration Avancée
1. **Providers locaux** : Installer et configurer Ollama/WhisperCpp
2. **Monitoring** : Configurer GlitchTip pour le suivi d'erreurs
3. **Personnalisation** : Adapter le prompt de résumé

### 3. Validation et Test
1. **Vérifier la configuration** : Tous les champs requis remplis
2. **Tester la connexion** : Bouton de test pour les providers
3. **Enregistrer les paramètres** : Sauvegarde automatique
4. **Tester le plugin** : Enregistrement et transcription

## 🚀 Améliorations Futures

### Fonctionnalités à Ajouter
- **Boutons de test** : Tester la connexion aux providers
- **Validation en temps réel** : Vérification des paramètres
- **Présets de configuration** : Configurations prédéfinies
- **Import/Export** : Sauvegarde et restauration des paramètres
- **Aide contextuelle** : Tooltips et guides intégrés

### Améliorations UX
- **Groupement visuel** : Cards pour chaque section
- **Indicateurs de statut** : État de connexion des providers
- **Wizard de configuration** : Guide étape par étape
- **Thème sombre** : Support des thèmes Obsidian

## 📝 Notes de Développement

### Fichiers Concernés
- **Main settings** : `main.ts` (classe `VoiceNotesSettingTab`)
- **Types** : `main.ts` (interface `VoiceNotesSettings`)
- **Styles** : `styles.css` (classes de paramètres)
- **Validation** : `main.ts` (méthodes de validation)

### Patterns Utilisés
- **Setting API** : Utilisation de l'API Obsidian Setting
- **Validation** : Vérification des paramètres avant sauvegarde
- **Persistence** : Sauvegarde automatique des changements
- **Reactive UI** : Mise à jour de l'interface selon les paramètres

---

**Dernière mise à jour** : 25 septembre 2024  
**Version** : 1.0  
**Auteur** : Victor Gross
