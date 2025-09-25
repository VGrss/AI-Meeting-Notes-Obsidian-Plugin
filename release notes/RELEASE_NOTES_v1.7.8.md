# Release Notes v1.7.8 - Correction Critique du Format de Build

## 🚀 Version Patch - Correction Critique

Cette version corrige un problème critique qui empêchait le plugin de se charger dans Obsidian. Le plugin générait des fichiers au format ES6 au lieu du format CommonJS requis par Obsidian.

## ✨ Nouvelles fonctionnalités
- Aucune nouvelle fonctionnalité dans cette version patch

## 🔧 Améliorations
- **Gestion d'erreurs robuste** : Amélioration de la stabilité avec des mécanismes de fallback
- **Initialisation sécurisée** : Les providers sont maintenant initialisés de manière plus sûre
- **Logs de debugging** : Ajout de logs pour faciliter le diagnostic des problèmes

## 🐛 Corrections
- **Correction critique** : Changement du format de build de ES6 vers CommonJS
- **Erreur de syntaxe** : Résolution de l'erreur "Cannot use import statement outside a module"
- **IDs de providers** : Correction des identifiants des providers (openai-whisper, openai-gpt4o)
- **Gestion des providers manquants** : Ajout de fallback automatique vers OpenAI

## ⚠️ Changements majeurs
- **Format de build** : Le plugin utilise maintenant le format CommonJS au lieu d'ES6
- **Compatibilité** : Amélioration de la compatibilité avec Obsidian

## 📦 Installation
1. Téléchargez les fichiers `main.js` et `manifest.json` depuis cette release
2. Placez-les dans votre dossier de plugins Obsidian
3. Activez le plugin dans les paramètres d'Obsidian
4. Configurez vos providers préférés dans les paramètres du plugin

## 🔗 Liens utiles
- [Spécifications du produit](rules/product-spec.md)

---
**Version** : 1.7.8  
**Date** : 25 septembre 2025  
**Auteur** : Victor Gross
