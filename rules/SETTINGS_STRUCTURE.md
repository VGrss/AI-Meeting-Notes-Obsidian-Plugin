# ⚙️ Structure des Paramètres - AI Voice Meeting Notes

## 🎯 Vue d'ensemble

Ce document centralise la structure et l'organisation de la page de paramètres du plugin dans Obsidian. Il sert de référence pour le développement et l'itération sur l'interface de configuration.

## 📋 Structure Actuelle des Paramètres (v1.7.1)

### Interface Utilisateur
**Chemin d'accès** : `Settings → Community Plugins → AI Voice Meeting Notes`

### Sections Principales

#### 1. 🤖 Configuration des Providers
- **Titre** : "Configuration des Providers"
- **Description** : "Sélectionnez les providers pour la transcription audio et le résumé IA. La clé OpenAI n'est requise que pour les providers cloud OpenAI."

##### Sélection des Providers
- **Provider de Transcription** : Dropdown
  - Options : `openai-whisper`, `whispercpp`, `fasterwhisper`
  - Défaut : `openai-whisper`
  - Labels : "OpenAI Whisper (Cloud)", "Whisper.cpp (Local)", "FasterWhisper (Local)"
- **Provider de Résumé** : Dropdown
  - Options : `openai-gpt4o`, `ollama`, `gpt4all`
  - Défaut : `openai-gpt4o`
  - Labels : "OpenAI GPT-4o (Cloud)", "Ollama (Local)", "GPT4All (Local)"

##### Clé API OpenAI (Conditionnelle)
- **Affichage** : Visible uniquement si `openai-whisper` ou `openai-gpt4o` est sélectionné
- **Type** : Text input (password)
- **Placeholder** : "Entrez votre clé API OpenAI"
- **Validation** : Format de clé API OpenAI
- **Masquage** : Affichage avec astérisques
- **Bouton d'aide** : Lien vers platform.openai.com/api-keys
- **Message d'aide** : "💡 Besoin d'une clé API ? Visitez la plateforme OpenAI ci-dessus pour créer votre compte et obtenir votre clé API."

##### Configuration des Providers Locaux
- **Affichage** : Visible uniquement si un provider local est sélectionné
- **Ollama** (si `ollama` sélectionné) :
  - Host : Text input (défaut: localhost)
  - Port : Text input (défaut: 11434)
  - Modèle : Text input (défaut: mistral:7b)
- **WhisperCpp** (si `whispercpp` sélectionné) :
  - Chemin binaire : Text input
  - Chemin modèle : Text input
- **FasterWhisper** (si `fasterwhisper` sélectionné) :
  - Chemin Python : Text input (défaut: python)
  - Nom du modèle : Text input (défaut: small)

#### 2. 📝 Personnalisation IA
- **Titre** : "Personnalisation IA"
- **Description** : "Personnalisez le prompt utilisé pour générer les résumés de vos enregistrements vocaux. Cela vous permet d'adapter le format de sortie et le focus à vos besoins spécifiques."

##### Custom Summary Prompt
- **Type** : Textarea (12 lignes)
- **Placeholder** : "Entrez votre prompt de résumé personnalisé..."
- **Valeur par défaut** : Template de résumé standardisé
- **Bouton de reset** : Restaurer le prompt par défaut
- **Message d'aide** : "💡 Le prompt doit inclure des instructions pour l'IA sur la façon d'analyser et de résumer les enregistrements vocaux. Utilisez "**Transcript:**" comme placeholder où le transcript réel sera inséré."

#### 3. 🛡️ Monitoring
- **Titre** : "Monitoring"
- **Description** : "Configuration du monitoring d'erreurs avec GlitchTip pour améliorer la fiabilité du plugin."

##### GlitchTip Token
- **Type** : Text input (password)
- **Valeur par défaut** : `https://fc4c4cf2c55b4aaaa076954be7e02814@app.glitchtip.com/12695`
- **Bouton d'aide** : Lien vers glitchtip.com
- **Message d'aide** : "💡 GlitchTip est un service open-source de suivi d'erreurs. Le token par défaut est configuré pour le monitoring automatique."

## 🔧 Structure Technique

### Interface TypeScript
```typescript
interface VoiceNotesSettings {
  // API Keys - conditionnelles selon le provider choisi
  openaiApiKey: string;
  glitchTipDsn: string;
  
  // Provider settings
  transcriberProvider: 'openai-whisper' | 'whispercpp' | 'fasterwhisper';
  summarizerProvider: 'openai-gpt4o' | 'ollama' | 'gpt4all';
  
  // Customization
  customSummaryPrompt: string;
  
  // Local provider configurations
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
}
```

### Valeurs par Défaut
```typescript
const DEFAULT_SETTINGS: VoiceNotesSettings = {
  openaiApiKey: '',
  glitchTipDsn: 'https://fc4c4cf2c55b4aaaa076954be7e02814@app.glitchtip.com/12695',
  customSummaryPrompt: DEFAULT_SUMMARY_PROMPT,
  
  // Provider settings
  transcriberProvider: 'openai-whisper',
  summarizerProvider: 'openai-gpt4o',
  
  // Local provider configurations
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
├── 🤖 Configuration des Providers
│   ├── Provider de Transcription (dropdown)
│   ├── Provider de Résumé (dropdown)
│   ├── Clé API OpenAI (conditionnelle)
│   │   ├── Input field (password)
│   │   ├── Help button
│   │   └── Help text
│   └── Configuration des Providers Locaux (conditionnelle)
│       ├── Ollama Settings (si ollama sélectionné)
│       ├── WhisperCpp Settings (si whispercpp sélectionné)
│       └── FasterWhisper Settings (si fasterwhisper sélectionné)
├── 📝 Personnalisation IA
│   ├── Custom Summary Prompt (textarea 12 lignes)
│   ├── Reset button
│   └── Help text
└── 🛡️ Monitoring
    ├── GlitchTip Token (input password)
    ├── Help button
    └── Help text
```

### Diagramme de Flux de Configuration
```
┌─────────────────────────────────────────────────────────────┐
│                    AI Voice Meeting Notes                  │
│                      Settings Page                         │
│        "Configurez votre plugin de prise de notes         │
│         vocales avec IA. Choisissez vos providers          │
│         de transcription et de résumé selon vos besoins."  │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│  🤖 Configuration des Providers                            │
│  "Sélectionnez les providers pour la transcription audio   │
│   et le résumé IA. La clé OpenAI n'est requise que pour    │
│   les providers cloud OpenAI."                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Provider de Transcription: [OpenAI Whisper ▼]          │ │
│  │   • OpenAI Whisper (Cloud)                             │ │
│  │   • Whisper.cpp (Local)                                │ │
│  │   • FasterWhisper (Local)                              │ │
│  │                                                         │ │
│  │ Provider de Résumé: [OpenAI GPT-4o ▼]                  │ │
│  │   • OpenAI GPT-4o (Cloud)                              │ │
│  │   • Ollama (Local)                                     │ │
│  │   • GPT4All (Local)                                    │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│  🔑 Clé API OpenAI (si openai-whisper OU openai-gpt4o)     │
│  "Requis pour les providers OpenAI (Whisper et/ou GPT-4o)" │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ OpenAI API Key: [••••••••••••••••] [Get API Key]       │ │
│  │ 💡 Besoin d'une clé API ? Visitez la plateforme OpenAI │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│  🏠 Configuration des Providers Locaux (si sélectionnés)   │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Si Ollama sélectionné:                                  │ │
│  │   Host Ollama: [localhost] Port: [11434]                │ │
│  │   Modèle: [mistral:7b]                                  │ │
│  │                                                         │ │
│  │ Si WhisperCpp sélectionné:                              │ │
│  │   Chemin binaire: [/path/to/whisper]                    │ │
│  │   Chemin modèle: [/path/to/model]                       │ │
│  │                                                         │ │
│  │ Si FasterWhisper sélectionné:                           │ │
│  │   Chemin Python: [python] Modèle: [small]              │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│  📝 Personnalisation IA                                    │
│  "Personnalisez le prompt utilisé pour générer les         │
│   résumés de vos enregistrements vocaux."                  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Prompt de Résumé Personnalisé:                          │ │
│  │ ┌─────────────────────────────────────────────────────┐ │ │
│  │ │ You are analyzing a voice recording transcript...   │ │ │
│  │ │ [12 lignes de textarea - min-height: 200px]        │ │ │
│  │ │ [max-height: 400px, font-family: monospace]        │ │ │
│  │ └─────────────────────────────────────────────────────┘ │ │
│  │ [Reset to Default]                                     │ │
│  │ 💡 Le prompt doit inclure des instructions pour l'IA  │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Styles et Classes CSS
- **Section titles** : `h2` avec icônes
- **Subsection titles** : `h3`, `h4`, `h5`
- **Help text** : `.help-text` avec icône 💡
- **Description** : `.setting-description`
- **Custom textarea** : `.custom-summary-prompt-textarea`
  - `min-height: 200px`
  - `max-height: 400px`
  - `font-family: monospace`
  - `resize: vertical`

## 🔄 Workflow de Configuration

### 1. Configuration Initiale
1. **Ouvrir les paramètres** : Settings → Community Plugins
2. **Activer le plugin** : Toggle "AI Voice Meeting Notes"
3. **Choisir les providers** : Sélectionner transcription et résumé
4. **Configurer l'API** : Entrer la clé OpenAI (si providers cloud sélectionnés)
5. **Configurer les providers locaux** (si providers locaux sélectionnés)
6. **Personnaliser le prompt** (optionnel)
7. **Vérifier le monitoring** : Token GlitchTip configuré par défaut

### 2. Configuration Avancée
1. **Providers locaux** : Installer et configurer Ollama/WhisperCpp/FasterWhisper
2. **Personnalisation** : Adapter le prompt de résumé selon vos besoins
3. **Monitoring** : Modifier le token GlitchTip si nécessaire

### 3. Validation et Test
1. **Vérifier la configuration** : Tous les champs requis remplis selon les providers choisis
2. **Enregistrer les paramètres** : Sauvegarde automatique
3. **Tester le plugin** : Enregistrement et transcription avec les providers sélectionnés

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
**Version** : 1.7.1  
**Auteur** : Victor Gross

## 📝 Changelog v1.7.1

### Nouvelles fonctionnalités
- **Interface des paramètres refaite** : Interface entièrement en français avec organisation logique
- **Sélection des providers** : Choix indépendant des providers de transcription et de résumé
- **Clé API conditionnelle** : La clé OpenAI n'est demandée que pour les providers cloud
- **Configuration locale** : Paramètres pour Ollama, WhisperCpp et FasterWhisper
- **Champ de prompt amélioré** : Textarea agrandi (12 lignes) avec styles optimisés
- **Monitoring simplifié** : Token GlitchTip configuré par défaut, suppression de la logique complexe d'error tracking

### Améliorations techniques
- **Suppression d'ErrorTrackingService** : Simplification du code, remplacement par console.log/console.error
- **Interface conditionnelle** : Affichage dynamique des champs selon les providers sélectionnés
- **Styles CSS améliorés** : Meilleure présentation du champ de texte du prompt
