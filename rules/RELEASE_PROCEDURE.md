# 📋 Procédure de Publication - AI Voice Meeting Notes

## 🎯 Vue d'ensemble

Ce document décrit la procédure complète pour publier une nouvelle version du plugin AI Voice Meeting Notes, incluant le versioning, le déploiement local et distant, et la mise à jour de la documentation.

## 📝 Prérequis

- Accès au repository GitHub
- Node.js et npm installés
- Git configuré
- Accès à Obsidian pour les tests locaux

## 🔄 Procédure de Publication

### 1. 🏷️ Détermination du Type de Version

Avant de commencer, déterminer le type de version :

#### Version Majeure (X.0.0)
- **Critères** : Changements majeurs, breaking changes, nouvelles fonctionnalités importantes
- **Exemples** : Refactorisation complète, nouvelle architecture, changements d'API
- **Impact** : Peut nécessiter une migration des données utilisateur

#### Version Mineure (X.Y.0)
- **Critères** : Nouvelles fonctionnalités, améliorations, ajouts de providers
- **Exemples** : Nouveau provider, amélioration UI, nouvelles options
- **Impact** : Compatible avec les versions précédentes

#### Version Patch (X.Y.Z)
- **Critères** : Corrections de bugs, améliorations de performance, corrections de sécurité
- **Exemples** : Fix de bugs, optimisations, corrections de typos
- **Impact** : Aucun impact sur l'utilisateur final

### 2. 🔧 Préparation du Code

```bash
# 1. Vérifier que tous les tests passent
npm test

# 2. Construire le projet
npm run build

# 3. Vérifier qu'il n'y a pas d'erreurs de linting
npm run lint  # si disponible
```

### 3. 📊 Mise à Jour des Versions

#### 3.1 Mise à jour automatique (recommandée)
```bash
# Utiliser le script de versioning
npm run version
```

#### 3.2 Mise à jour manuelle
Mettre à jour les fichiers suivants :

**package.json**
```json
{
  "version": "X.Y.Z"
}
```

**manifest.json**
```json
{
  "version": "X.Y.Z"
}
```

**versions.json**
```json
{
  "X.Y.Z": "0.15.0"
}
```

### 4. 📚 Mise à Jour de la Documentation

#### 4.1 Mettre à jour product-spec.md
```bash
# Éditer le fichier
code rules/product-spec.md
```

**Changements requis :**
- Mettre à jour la version actuelle (ligne 25)
- Mettre à jour les technologies utilisées si nécessaire
- Ajouter les nouvelles fonctionnalités
- Mettre à jour la feuille de route
- Mettre à jour la version en bas de page (ligne 199)

#### 4.2 Créer les Release Notes
```bash
# Créer le fichier de release notes
touch "release notes/RELEASE_NOTES_vX.Y.Z.md"
```

**Template des Release Notes :**
```markdown
# Release Notes vX.Y.Z - [Titre de la Release]

## 🚀 [Type de version] - [Description courte]

[Description détaillée des changements]

## ✨ Nouvelles fonctionnalités
- [Liste des nouvelles fonctionnalités]

## 🔧 Améliorations
- [Liste des améliorations]

## 🐛 Corrections
- [Liste des corrections de bugs]

## ⚠️ Changements majeurs (si applicable)
- [Liste des breaking changes]

## 📦 Installation
1. Téléchargez les fichiers `main.js` et `manifest.json` depuis cette release
2. Placez-les dans votre dossier de plugins Obsidian
3. Activez le plugin dans les paramètres d'Obsidian
4. Configurez vos providers préférés dans les paramètres du plugin

## 🔗 Liens utiles
- [Documentation des providers locaux](rules/local-providers.md)
- [Guide de configuration multi-providers](rules/multi-providers-setup.md)
- [Spécifications du produit](rules/product-spec.md)

---
**Version** : X.Y.Z  
**Date** : [Date de publication]  
**Auteur** : Victor Gross
```

### 5. 🏗️ Build et Test Local

```bash
# 1. Nettoyer et reconstruire
npm run build

# 2. Vérifier que les fichiers sont générés
ls -la main.js manifest.json

# 3. Tester localement dans Obsidian
# - Copier main.js et manifest.json vers le dossier de plugins
# - Redémarrer Obsidian
# - Tester les fonctionnalités principales
```

### 6. 📤 Déploiement sur GitHub

#### 6.1 Commit et Push
```bash
# 1. Ajouter tous les changements
git add .

# 2. Créer le commit
git commit -m "feat/fix/docs: [Description des changements] vX.Y.Z

- [Liste des changements principaux]
- [Détails techniques si nécessaire]

Breaking changes (si applicable):
- [Liste des breaking changes]"

# 3. Créer et pousser le tag
git tag vX.Y.Z
git push origin main
git push origin vX.Y.Z
```

#### 6.2 Créer la Release sur GitHub
1. Aller sur https://github.com/VGrss/AI-Meeting-Notes-Obsidian-Plugin
2. Cliquer sur "Releases" → "Create a new release"
3. Remplir les informations :
   - **Tag** : `vX.Y.Z`
   - **Titre** : `vX.Y.Z - [Titre de la Release]`
   - **Description** : Copier le contenu du fichier `release notes/RELEASE_NOTES_vX.Y.Z.md`
   - **Attacher les fichiers** : `main.js` et `manifest.json`

### 7. 🏠 Déploiement Local

#### 7.1 Localisation du dossier Obsidian
```bash
# Dossier de plugins Obsidian
/Users/victorgross/Library/Mobile Documents/iCloud~md~obsidian/Documents/Vic Brain/.obsidian/plugins/ai-voice-meeting-notes/
```

#### 7.2 Mise à jour locale
```bash
# 1. Sauvegarder l'ancienne version (optionnel)
cp "/Users/victorgross/Library/Mobile Documents/iCloud~md~obsidian/Documents/Vic Brain/.obsidian/plugins/ai-voice-meeting-notes/main.js" main.js.backup

# 2. Copier les nouveaux fichiers
cp main.js "/Users/victorgross/Library/Mobile Documents/iCloud~md~obsidian/Documents/Vic Brain/.obsidian/plugins/ai-voice-meeting-notes/"
cp manifest.json "/Users/victorgross/Library/Mobile Documents/iCloud~md~obsidian/Documents/Vic Brain/.obsidian/plugins/ai-voice-meeting-notes/"

# 3. Redémarrer Obsidian
# 4. Tester les fonctionnalités
```

### 8. ✅ Vérifications Post-Déploiement

#### 8.1 Vérifications GitHub
- [ ] Release créée avec les bons fichiers
- [ ] Tag poussé correctement
- [ ] Description complète et correcte
- [ ] Fichiers attachés (main.js, manifest.json)

#### 8.2 Vérifications Locales
- [ ] Plugin se charge sans erreur
- [ ] Interface utilisateur fonctionne
- [ ] Fonctionnalités principales testées
- [ ] Paramètres sauvegardés correctement
- [ ] Pas de régression détectée

#### 8.3 Vérifications Documentation
- [ ] product-spec.md mis à jour
- [ ] Release notes créées
- [ ] Version cohérente partout
- [ ] Liens fonctionnels

## 🚨 Points d'Attention

### ⚠️ Avant la Publication
- **Toujours tester localement** avant de publier
- **Vérifier les breaking changes** et les documenter
- **S'assurer que tous les fichiers sont à jour**
- **Tester avec différents providers** si applicable

### 🔍 Pendant la Publication
- **Suivre l'ordre des étapes** pour éviter les erreurs
- **Vérifier chaque commande** avant de l'exécuter
- **Garder une trace** des changements effectués

### 📋 Après la Publication
- **Tester immédiatement** la version publiée
- **Surveiller les issues** sur GitHub
- **Documenter les problèmes** rencontrés
- **Préparer les hotfixes** si nécessaire

## 🆘 Dépannage

### Problèmes Courants

#### Erreur de Build
```bash
# Nettoyer et reconstruire
rm -rf node_modules
npm install
npm run build
```

#### Erreur de Git
```bash
# Vérifier le statut
git status

# Annuler les changements non commités
git checkout -- .

# Forcer le push si nécessaire
git push origin main --force-with-lease
```

#### Plugin ne se charge pas
- Vérifier que main.js et manifest.json sont dans le bon dossier
- Vérifier les permissions des fichiers
- Redémarrer Obsidian complètement
- Vérifier les logs d'erreur d'Obsidian

## 📞 Support

En cas de problème :
1. Vérifier cette procédure
2. Consulter les logs d'erreur
3. Créer une issue sur GitHub si nécessaire
4. Documenter la solution pour les prochaines fois

---

**Dernière mise à jour** : 25 septembre 2024  
**Version de la procédure** : 1.0  
**Auteur** : Victor Gross
