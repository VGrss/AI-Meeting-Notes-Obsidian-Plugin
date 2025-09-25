# 🧪 Guide de Test - Transcription

## 🎯 Objectif
Tester et diagnostiquer pourquoi la transcription ne fonctionne pas après les corrections.

## 📋 Étapes de Test

### 1. **Vérification de la Configuration**

1. **Ouvrir Obsidian** et aller dans `Settings → Community Plugins → AI Voice Meeting Notes`
2. **Vérifier les paramètres** :
   - Provider de transcription : `openai-whisper`
   - Provider de résumé : `openai-gpt4o`
   - Clé API OpenAI : Doit être configurée et valide

### 2. **Test avec la Console de Débogage**

1. **Ouvrir la console** dans Obsidian (`Ctrl+Shift+I` ou `Cmd+Option+I`)
2. **Charger le script de débogage** :
   ```javascript
   // Copier-coller le contenu de test-transcription-debug.js dans la console
   ```

3. **Exécuter le débogage complet** :
   ```javascript
   debugTranscriptionFlow.runFullDebug();
   ```

### 3. **Test d'Enregistrement Simple**

1. **Ouvrir le panneau d'enregistrement** (icône microphone dans la barre latérale)
2. **Faire un enregistrement court** (5-10 secondes)
3. **Cliquer sur "Complete Recording"**
4. **Observer les logs** dans la console pour voir où ça échoue

### 4. **Vérification des Logs**

Dans la console, vous devriez voir :
```
🔄 Début du traitement de l'enregistrement...
✅ Providers récupérés: {transcriber: "OpenAI Whisper", summarizer: "OpenAI GPT-4o"}
🎯 Début de la transcription...
✅ Transcription terminée: {textLength: X, language: "fr"}
```

Si vous voyez des erreurs, notez-les.

## 🔍 Diagnostic des Problèmes Courants

### Problème : "Provider non trouvé"
**Cause** : Les providers ne sont pas correctement enregistrés
**Solution** : 
1. Vérifier que la clé API OpenAI est configurée
2. Redémarrer Obsidian
3. Vérifier les logs de débogage

### Problème : "Clé API OpenAI invalide"
**Cause** : Clé API incorrecte ou expirée
**Solution** :
1. Vérifier la clé dans les paramètres
2. Tester la clé sur platform.openai.com
3. Générer une nouvelle clé si nécessaire

### Problème : "Fichier audio trop volumineux"
**Cause** : Enregistrement trop long ou qualité trop élevée
**Solution** :
1. Faire des enregistrements plus courts (< 2 minutes)
2. Vérifier les paramètres de compression audio

### Problème : "Format non supporté"
**Cause** : Navigateur ne supporte pas le format audio
**Solution** :
1. Utiliser Chrome ou Firefox
2. Vérifier les permissions microphone
3. Tester avec un autre navigateur

## 📊 Logs Attendus

### Succès
```
🔄 Début du traitement de l'enregistrement...
  transcriberProviderId: "openai-whisper"
  summarizerProviderId: "openai-gpt4o"
  audioBlobSize: 12345
  audioBlobType: "audio/webm"

✅ Providers récupérés:
  transcriber: "OpenAI Whisper"
  summarizer: "OpenAI GPT-4o"

🎯 Début de la transcription...
✅ Transcription terminée:
  textLength: 150
  language: "fr"
```

### Échec
```
❌ Erreur lors du traitement: ProviderError: Provider non trouvé: openai-whisper
```

## 🛠️ Actions Correctives

### Si la transcription échoue encore :

1. **Vérifier la clé API** :
   ```javascript
   // Dans la console
   debugTranscriptionFlow.debugSettings();
   ```

2. **Tester la connexion OpenAI** :
   ```javascript
   // Dans la console
   const { getTranscriberProvider } = await import('./src/providers/index.ts');
   const provider = getTranscriberProvider('openai-whisper');
   const health = await provider.check();
   console.log(health);
   ```

3. **Vérifier les providers enregistrés** :
   ```javascript
   // Dans la console
   const { getAllProvidersList } = await import('./src/providers/index.ts');
   console.log(getAllProvidersList());
   ```

## 📞 Support

Si le problème persiste :

1. **Copier tous les logs** de la console
2. **Noter la version** d'Obsidian et du plugin
3. **Décrire les étapes** qui mènent à l'erreur
4. **Inclure les paramètres** (sans la clé API complète)

## 🔄 Prochaines Étapes

Une fois que la transcription fonctionne :

1. **Tester avec différents types d'enregistrements**
2. **Vérifier la qualité de la transcription**
3. **Tester les providers locaux** (si configurés)
4. **Valider le flux complet** (transcription + résumé)
