#!/bin/bash
# Script de mise à jour locale rapide pour AI Voice Meeting Notes

OBSIDIAN_PLUGIN_PATH="/Users/victorgross/Library/Mobile Documents/iCloud~md~obsidian/Documents/Vic Brain/.obsidian/plugins/ai-voice-meeting-notes/"

echo "🔄 Mise à jour locale du plugin AI Voice Meeting Notes..."

# Vérifier que les fichiers existent
if [ ! -f "main.js" ] || [ ! -f "manifest.json" ]; then
    echo "❌ Erreur: main.js ou manifest.json introuvable"
    echo "Lancez d'abord: npm run build"
    exit 1
fi

# Vérifier que le dossier de destination existe
if [ ! -d "$OBSIDIAN_PLUGIN_PATH" ]; then
    echo "❌ Erreur: Dossier de plugins Obsidian introuvable: $OBSIDIAN_PLUGIN_PATH"
    echo "Veuillez ajuster la variable OBSIDIAN_PLUGIN_PATH dans ce script"
    exit 1
fi

# Copier les fichiers
echo "📁 Copie des fichiers..."
cp main.js "$OBSIDIAN_PLUGIN_PATH/"
cp manifest.json "$OBSIDIAN_PLUGIN_PATH/"

# Vérifier la copie
if [ -f "$OBSIDIAN_PLUGIN_PATH/main.js" ] && [ -f "$OBSIDIAN_PLUGIN_PATH/manifest.json" ]; then
    echo "✅ Mise à jour locale réussie!"
    echo "📊 Taille du nouveau main.js: $(ls -lh main.js | awk '{print $5}')"
    echo "📋 Version: $(grep '"version"' manifest.json | cut -d'"' -f4)"
else
    echo "❌ Erreur lors de la copie des fichiers"
    exit 1
fi

# Instructions pour l'utilisateur
echo ""
echo "🎯 Prochaines étapes:"
echo "1. Redémarrez Obsidian pour que les changements prennent effet"
echo "2. Vérifiez la version dans Settings → Community Plugins → AI Voice Meeting Notes"
echo "3. Testez les nouvelles fonctionnalités"
echo ""
echo "📍 Fichiers mis à jour:"
echo "   - $OBSIDIAN_PLUGIN_PATH/main.js"
echo "   - $OBSIDIAN_PLUGIN_PATH/manifest.json"
