# Release Notes v1.7.6 - Système de Tracking Cross-Provider

## 🚀 Patch - Implémentation du Tracking Cross-Provider avec Glitchtip

Cette version apporte un système de tracking complet et cross-provider pour surveiller l'ensemble du pipeline de recording jusqu'au traitement IA, peu importe le modèle de STT et le LLM utilisé.

## ✨ Nouvelles fonctionnalités

- **Système de tracking cross-provider** : Surveillance complète du pipeline recording → transcription → résumé IA
- **Intégration Glitchtip** : Monitoring d'erreurs et de performance avec Sentry/Glitchtip
- **Tracking de session** : Suivi des sessions complètes avec métriques détaillées
- **Métriques de performance** : Temps de traitement, tailles de fichiers, tokens utilisés

## 🔧 Améliorations

- **ErrorTrackingService** : Service de base pour le monitoring avec Glitchtip
- **TrackingService** : Service centralisé pour le tracking cross-provider
- **Intégration VoiceRecorder** : Tracking des événements d'enregistrement
- **Intégration Providers** : Tracking des événements de transcription et résumé
- **Métadonnées enrichies** : Collecte de données anonymisées sur les performances

## 🐛 Corrections

- **Gestion d'erreurs améliorée** : Tracking des erreurs avec contexte détaillé
- **Monitoring des providers** : Surveillance des échecs de transcription et résumé
- **Debugging facilité** : Identification rapide des goulots d'étranglement

## 📊 Données collectées

### Métadonnées de session
- ID de session unique
- Timestamps de début/fin
- Providers utilisés (recording, transcription, summarization)
- Nombre d'étapes exécutées

### Métadonnées d'enregistrement
- Durée d'enregistrement
- Taille du fichier audio
- Type MIME
- Nombre de chunks

### Métadonnées de transcription
- Taille du fichier audio
- Longueur du texte transcrit
- Langue détectée
- Nombre de segments
- Temps de traitement

### Métadonnées de résumé
- Longueur du texte source
- Longueur du résumé généré
- Tokens utilisés
- Ratio de compression
- Temps de traitement

## 🔍 Événements trackés

- **Pipeline d'enregistrement** : `recording_start`, `recording_stop`, `recording_error`
- **Pipeline de transcription** : `transcription_start`, `transcription_success`, `transcription_error`
- **Pipeline de résumé IA** : `summarization_start`, `summarization_success`, `summarization_error`
- **Pipeline complet** : `pipeline_complete`, `pipeline_error_*`

## ⚙️ Configuration

Le système de tracking est configuré avec :
- **DSN Glitchtip** : `https://fc4c4cf2c55b4aaaa076954be7e02814@app.glitchtip.com/12695`
- **Activation/désactivation** : Paramètre `glitchTipEnabled` dans les settings
- **Données anonymisées** : Seules les métadonnées techniques sont envoyées

## 🔒 Sécurité et confidentialité

- Seules des données anonymisées sont envoyées
- Pas de contenu audio ou texte personnel
- Métadonnées techniques uniquement
- DSN sécurisé avec clés cachées
- Possibilité de désactiver le tracking

## 📦 Installation

1. Téléchargez les fichiers `main.js` et `manifest.json` depuis cette release
2. Placez-les dans votre dossier de plugins Obsidian
3. Activez le plugin dans les paramètres d'Obsidian
4. Configurez vos providers préférés dans les paramètres du plugin

## 🧪 Test du système

Un script de test est disponible dans `test-tracking.js` pour vérifier le fonctionnement du système de tracking.

## 🔗 Liens utiles

- [Spécifications du produit](rules/product-spec.md)
- [Architecture et configuration](rules/architecture-overview.md)

---

**Version** : 1.7.6  
**Date** : 25 septembre 2024  
**Auteur** : Victor Gross
