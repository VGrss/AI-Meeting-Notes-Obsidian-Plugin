# Release Notes v1.7.1 - Multi-Provider Architecture

## 🚀 Nouvelle architecture multi-providers

Cette version majeure introduit une architecture modulaire complètement refactorisée pour supporter plusieurs providers de transcription et de résumé.

## ✨ Nouvelles fonctionnalités

- **Architecture multi-providers** : Support pour plusieurs providers de transcription et de résumé
- **Providers OpenAI** : Intégration complète de Whisper et GPT-4o
- **Support des providers locaux** : Ollama, WhisperCpp, FasterWhisper
- **Gestion d'erreurs avancée** : Système de tracking d'erreurs avec GlitchTip
- **Interface utilisateur améliorée** : Meilleure gestion des enregistrements
- **Documentation complète** : Guides de configuration pour tous les providers

## 🔧 Améliorations techniques

- Refactorisation complète du code en modules
- Système de registry pour les providers
- Gestion d'erreurs robuste avec codes d'erreur spécifiques
- Tests unitaires pour le système de providers
- Configuration flexible pour tous les providers

## 📚 Documentation

- Guide de configuration des providers locaux
- Documentation complète de l'architecture
- Exemples d'utilisation et de configuration

## ⚠️ Changements majeurs

- **Breaking changes** : Restructuration des paramètres pour supporter les providers multiples
- Migration automatique des paramètres existants
- Nouvelle interface de configuration des providers

## 🐛 Corrections

- Amélioration de la stabilité des enregistrements
- Meilleure gestion des erreurs de transcription
- Interface utilisateur plus intuitive

## 📦 Installation

1. Téléchargez les fichiers `main.js` et `manifest.json` depuis cette release
2. Placez-les dans votre dossier de plugins Obsidian
3. Activez le plugin dans les paramètres d'Obsidian
4. Configurez vos providers préférés dans les paramètres du plugin

## 🔗 Liens utiles

- [Documentation des providers locaux](docs/local-providers.md)
- [Guide de configuration multi-providers](docs/multi-providers-setup.md)
- [Spécifications du produit](docs/product-spec.md)

---

**Version** : 1.7.1  
**Date** : 25 septembre 2024  
**Auteur** : Victor Gross
