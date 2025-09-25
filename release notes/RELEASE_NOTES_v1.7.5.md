# Release Notes v1.7.5 - Corrections de Transcription

## 🚀 Version Patch - Corrections majeures des erreurs de transcription

Cette version corrige plusieurs problèmes critiques dans le système de transcription qui causaient des erreurs avec OpenAI Whisper et les providers locaux.

## ✨ Nouvelles fonctionnalités
- **Script de diagnostic** : Nouveau script `debug-transcription.js` pour identifier les problèmes de transcription
- **Guide de dépannage** : Documentation complète `TROUBLESHOOTING.md` pour résoudre les erreurs courantes
- **Providers locaux** : Structure de base pour WhisperCpp et FasterWhisper (implémentation en cours)

## 🔧 Améliorations
- **Interface unifiée** : `TranscriberProvider` accepte maintenant `string | Blob` pour une meilleure compatibilité
- **Validation des formats audio** : Vérification automatique des formats supportés par OpenAI Whisper
- **Gestion d'erreurs améliorée** : Messages d'erreur plus clairs et informatifs
- **Logs détaillés** : Meilleur suivi des opérations de transcription

## 🐛 Corrections
- **Incompatibilité de types** : Correction de l'erreur TypeScript lors de l'appel à `transcriber.transcribe()`
- **Format audio incorrect** : `VoiceRecorder` utilise maintenant le bon type MIME basé sur les paramètres d'enregistrement
- **Providers locaux manquants** : Création des providers `WhisperCppTranscriber` et `FasterWhisperTranscriber`
- **Gestion des erreurs** : Correction des erreurs de compilation TypeScript avec FormData
- **Architecture unifiée** : Suppression des conflits entre ancien et nouveau système de transcription

## ⚠️ Changements majeurs
- **Interface TranscriberProvider** : Le paramètre `audioPath` est maintenant `audioInput` et accepte `string | Blob`
- **Providers locaux** : Structure de base créée, implémentation complète en cours

## 📦 Installation
1. Téléchargez les fichiers `main.js` et `manifest.json` depuis cette release
2. Placez-les dans votre dossier de plugins Obsidian
3. Activez le plugin dans les paramètres d'Obsidian
4. Configurez vos providers préférés dans les paramètres du plugin

## 🔧 Diagnostic des problèmes
Si vous rencontrez encore des erreurs de transcription :

1. **Utilisez le script de diagnostic** :
   ```javascript
   // Dans la console du navigateur ou Obsidian
   debugTranscription.runDiagnostics();
   ```

2. **Consultez le guide de dépannage** : `TROUBLESHOOTING.md`

3. **Vérifiez les formats audio supportés** :
   - MP3, WAV, WebM, OGG, FLAC, M4A
   - Taille maximale : 25MB (recommandé : < 20MB)

## 🔗 Liens utiles
- [Spécifications du produit](rules/product-spec.md)
- [Guide de dépannage](TROUBLESHOOTING.md)
- [Script de diagnostic](debug-transcription.js)

---
**Version** : 1.7.5  
**Date** : 25 septembre 2025  
**Auteur** : Victor Gross
