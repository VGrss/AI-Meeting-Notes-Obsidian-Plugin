# 📋 Spécification du Produit - AI Voice Meeting Notes

## 🎯 Vue d'ensemble du produit

**AI Voice Meeting Notes** est un plugin Obsidian qui permet d'enregistrer, transcrire et résumer automatiquement des réunions vocales en utilisant l'intelligence artificielle. Le plugin intègre les API OpenAI (Whisper pour la transcription et GPT-4o pour la génération de résumés) pour offrir une solution complète de prise de notes vocales directement dans l'environnement Obsidian.

## 🏗️ Architecture et composants

> **Note** : Pour une vue détaillée de l'architecture technique, consultez [architecture-overview.md](architecture-overview.md)

### Technologies utilisées
- **Framework** : Plugin Obsidian (TypeScript/JavaScript)
- **Architecture** : Système multi-providers modulaire
- **Transcription** : OpenAI Whisper API + providers locaux (WhisperCpp, FasterWhisper)
- **Résumé IA** : OpenAI GPT-4o API + providers locaux (Ollama, GPT4All)
- **Suivi d'erreurs** : GlitchTip (Sentry)
- **Compression audio** : Opus/AAC
- **Build** : esbuild + TypeScript
- **Tests** : Jest pour les tests unitaires

### Composants principaux
1. **Interface utilisateur** : Panneau latéral, barre de statut, modal d'enregistrement
2. **Service d'enregistrement** : Gestion audio avec contrôles pause/reprise
3. **Système de providers** : Architecture modulaire pour transcription et résumé
4. **Providers de transcription** : OpenAI Whisper, WhisperCpp, FasterWhisper
5. **Providers de résumé** : OpenAI GPT-4o, Ollama, GPT4All
6. **Registry des providers** : Gestion centralisée des providers disponibles
7. **Service de suivi d'erreurs** : Monitoring complet avec GlitchTip
8. **Gestion des données** : Stockage local des enregistrements et historique

## ✨ Fonctionnalités actuelles (v1.7.1)

### 🎙️ Enregistrement vocal
- **Démarrage/arrêt** d'enregistrement avec interface intuitive
- **Contrôles avancés** : pause, reprise, arrêt complet
- **Compression audio** : Réduction de 60-80% de la taille des fichiers
- **Validation pré-upload** : Prévention des erreurs 413 (fichier trop volumineux)
- **Chunking** : Infrastructure pour gérer les fichiers volumineux

### 🤖 Transcription IA
- **Providers multiples** : OpenAI Whisper, WhisperCpp, FasterWhisper
- **API Whisper** : Transcription précise multi-langues (cloud)
- **Providers locaux** : WhisperCpp et FasterWhisper pour traitement local
- **Gestion d'erreurs** : Retry automatique et messages d'erreur informatifs
- **Support multilingue** : Détection automatique de la langue
- **Monitoring** : Suivi complet des succès/échecs de transcription
- **Configuration flexible** : Choix du provider selon les besoins (privacy, performance)

### 📝 Résumé intelligent
- **Providers multiples** : OpenAI GPT-4o, Ollama, GPT4All
- **GPT-4o** : Génération de résumés structurés et complets (cloud)
- **Providers locaux** : Ollama et GPT4All pour traitement local
- **Structure standardisée** :
  - Sujets principaux discutés
  - Points clés
  - Décisions prises
  - Actions à entreprendre
  - Contexte et insights
- **Multilingue** : Résumés dans la même langue que la transcription
- **Tokens étendus** : 2000 tokens (2.5x plus que précédemment)
- **Gestion des longs transcripts** : Échantillonnage intelligent (40% début + 20% milieu + 40% fin)
- **Configuration flexible** : Choix du provider selon les besoins (privacy, performance, coût)

### 🎨 Interface utilisateur
- **Design moderne** : Style shadcn, interface épurée et efficace
- **Panneau latéral** : Accès rapide aux contrôles d'enregistrement
- **Barre de statut** : Indicateur d'état avec accès rapide
- **Cartes d'enregistrement** : Historique organisé avec onglets
- **Navigation par onglets** : Basculement facile entre résumé et transcription
- **Copie rapide** : Bouton de copie au survol pour partage
- **Configuration des providers** : Interface de sélection des providers de transcription et résumé
- **Gestion des paramètres locaux** : Configuration des providers locaux (Ollama, WhisperCpp, etc.)

### ⚡ Traitement en temps réel
- **Mises à jour de statut** : Suivi visuel du traitement
- **Feedback utilisateur** : Messages informatifs pendant le traitement
- **Gestion asynchrone** : Interface non-bloquante pendant le traitement

### 🔧 Architecture multi-providers
- **Système modulaire** : Architecture extensible pour nouveaux providers
- **Registry centralisé** : Gestion unifiée de tous les providers
- **Interface standardisée** : API commune pour tous les types de providers
- **Gestion d'erreurs robuste** : Codes d'erreur spécifiques et messages informatifs
- **Configuration flexible** : Choix du provider selon le contexte d'utilisation
- **Providers de transcription** :
  - **OpenAI Whisper** : Cloud, haute précision, multilingue
  - **WhisperCpp** : Local, privacy, performance variable
  - **FasterWhisper** : Local, optimisé, Python-based
- **Providers de résumé** :
  - **OpenAI GPT-4o** : Cloud, haute qualité, tokens étendus
  - **Ollama** : Local, modèles open-source, privacy totale
  - **GPT4All** : Local, léger, modèles spécialisés

### 🛡️ Fiabilité et monitoring
- **Suivi d'erreurs complet** : Intégration GlitchTip pour monitoring
- **Contexte enrichi** : Informations détaillées sur chaque erreur
- **Configuration sécurisée** : Interface pour activer/désactiver le suivi
- **Logging détaillé** : Métriques de traitement et diagnostics

## ⚙️ Configuration et paramètres

### Paramètres utilisateur
- **Clé API OpenAI** : Authentification pour Whisper et GPT-4o
- **Sélection des providers** : Choix du provider de transcription et de résumé
- **Configuration des providers locaux** :
  - **Ollama** : Host, port, modèle
  - **WhisperCpp** : Chemin binaire, modèle, arguments
  - **FasterWhisper** : Chemin Python, nom du modèle
- **DSN GlitchTip** : Configuration optionnelle du monitoring d'erreurs
- **Activation du suivi d'erreurs** : Contrôle utilisateur sur le monitoring
- **Prompt personnalisé** : Personnalisation du template de résumé

### Prérequis techniques
- **Obsidian** : Version minimale 0.15.0
- **Plateforme** : Desktop uniquement (pas de support mobile)
- **Permissions** : Accès microphone requis
- **Connectivité** : 
  - Accès internet pour les API OpenAI (providers cloud)
  - Accès local pour les providers locaux (Ollama, WhisperCpp, FasterWhisper)
- **Providers locaux** (optionnels) :
  - **Ollama** : Installation locale d'Ollama avec modèles appropriés
  - **WhisperCpp** : Compilation et installation de WhisperCpp
  - **FasterWhisper** : Installation Python avec FasterWhisper

## 🎯 Cas d'usage principaux

### 1. Réunions d'équipe
- Enregistrement complet des discussions
- Génération automatique de comptes-rendus
- Extraction des décisions et actions

### 2. Interviews et entretiens
- Transcription précise des échanges
- Résumés structurés pour analyse
- Conservation de l'historique

### 3. Cours et formations
- Capture du contenu pédagogique
- Résumés pour révision
- Extraction des points clés

### 4. Brainstorming et créativité
- Capture des idées spontanées
- Structuration des concepts émergents
- Suivi de l'évolution des idées

## 📊 Métriques et performance

### Capacités techniques
- **Taille de fichier** : Gestion jusqu'à 25MB (limite Whisper)
- **Durée d'enregistrement** : Pas de limite technique
- **Compression** : Réduction de 60-80% de la taille
- **Tokens de résumé** : 2000 tokens maximum
- **Langues supportées** : Toutes les langues supportées par Whisper

### Performance
- **Temps de transcription** : Dépend de la durée et complexité
- **Temps de résumé** : Généralement 10-30 secondes
- **Interface** : Réactive et non-bloquante
- **Fiabilité** : Monitoring complet des erreurs

## 🔒 Sécurité et conformité

### Mesures de sécurité
- **Pas de raccourcis par défaut** : Évite les conflits utilisateur
- **API DOM sécurisées** : Remplacement d'innerHTML par des appels DOM sécurisés
- **Conformité Obsidian** : Respect des guidelines de sécurité des plugins
- **Gestion des clés API** : Stockage local sécurisé

### Conformité
- **Licence MIT** : Open source avec permissions étendues
- **Respect de la vie privée** : Données traitées localement quand possible
- **Transparence** : Code source disponible et auditable

## 🚀 Feuille de route et évolutions

### Version actuelle : v1.7.1
- **Architecture multi-providers** : Refactorisation complète en système modulaire
- **Providers multiples** : Support OpenAI + providers locaux (Ollama, WhisperCpp, FasterWhisper)
- **Configuration flexible** : Choix des providers selon les besoins (privacy, performance, coût)
- **Documentation complète** : Guides de configuration pour tous les providers
- **Tests unitaires** : Infrastructure de tests avec Jest
- **Interface améliorée** : Configuration des providers dans l'UI

### Évolutions récentes
- **v1.7.1** : Architecture multi-providers complète
- **v1.6.3** : Correction majeure de la troncature des résumés
- **v1.6.2** : Corrections de sécurité et conformité
- **v1.6.1** : Intégration GlitchTip et optimisations de taille
- **v1.6.0** : Système de monitoring d'erreurs complet

### Potentielles améliorations futures
- **Providers TTS** : Text-to-Speech pour lecture des résumés
- **Providers supplémentaires** : Intégration d'autres services (Anthropic, Google, etc.)
- **Support mobile** : Adaptation pour les plateformes mobiles
- **Templates avancés** : Système de templates personnalisables
- **Export multi-formats** : PDF, Word, Markdown structuré
- **Intégration Obsidian** : Tags, liens, graph view
- **Workflow automatisés** : Déclencheurs et automatisations

## 📈 Succès et adoption

### Indicateurs de qualité
- **Stabilité** : Suivi d'erreurs complet et corrections rapides
- **Performance** : Optimisations continues (compression, tokens)
- **Sécurité** : Conformité aux standards Obsidian
- **Utilisabilité** : Interface intuitive et documentation claire

### Communauté
- **Open source** : Développement transparent et collaboratif
- **Documentation** : README complet et notes de version détaillées
- **Support** : Monitoring d'erreurs pour diagnostic rapide

---

*Cette spécification reflète l'état actuel du produit (v1.7.1) et sera mise à jour avec les nouvelles versions.*
