# 🔧 Guide de dépannage - Erreurs de transcription

## 🚨 Problèmes identifiés et corrigés

### 1. **Problème d'incompatibilité de types** ✅ CORRIGÉ
**Symptôme :** Erreurs TypeScript lors de l'appel à `transcriber.transcribe()`
**Cause :** L'interface `TranscriberProvider` attendait un `string` mais recevait un `Blob`
**Solution :** Mise à jour de l'interface pour accepter `string | Blob`

### 2. **Format audio incorrect** ✅ CORRIGÉ
**Symptôme :** Fichiers audio mal formatés pour OpenAI Whisper
**Cause :** `VoiceRecorder` créait des Blobs avec le mauvais type MIME
**Solution :** Utilisation du type MIME correct basé sur les paramètres d'enregistrement

### 3. **Providers locaux non implémentés** ✅ CORRIGÉ
**Symptôme :** Erreurs lors de la sélection de Whisper local
**Cause :** Providers locaux commentés dans le code
**Solution :** Création des providers `WhisperCppTranscriber` et `FasterWhisperTranscriber`

## 🔍 Diagnostic des erreurs courantes

### Erreur : "Provider non trouvé"
```javascript
// Vérifier les providers enregistrés
const { getAllProvidersList } = await import('./src/providers/index.ts');
console.log(getAllProvidersList());
```

### Erreur : "Clé API OpenAI invalide"
1. Vérifiez que votre clé API est correcte dans les paramètres
2. Testez la clé avec :
```javascript
const { getTranscriberProvider } = await import('./src/providers/index.ts');
const provider = getTranscriberProvider('openai-whisper');
const health = await provider.check();
console.log(health);
```

### Erreur : "Fichier audio trop volumineux"
- Limite OpenAI : 25MB
- Recommandation : < 20MB
- Solutions :
  - Enregistrements plus courts (< 10 minutes)
  - Qualité audio réduite
  - Compression audio

### Erreur : "Format non supporté"
Formats supportés par OpenAI Whisper :
- MP3 (`audio/mpeg`)
- WAV (`audio/wav`)
- WebM (`audio/webm`)
- OGG (`audio/ogg`)
- FLAC (`audio/flac`)
- M4A (`audio/m4a`)

## 🛠️ Script de diagnostic

Utilisez le script `debug-transcription.js` pour diagnostiquer les problèmes :

```javascript
// Dans la console du navigateur ou Obsidian
debugTranscription.runDiagnostics();
```

## 📋 Checklist de vérification

### Configuration de base
- [ ] Clé API OpenAI configurée et valide
- [ ] Providers enregistrés correctement
- [ ] Paramètres de transcription sélectionnés

### Test audio
- [ ] Microphone accessible
- [ ] Format audio supporté détecté
- [ ] Enregistrement fonctionne

### Test transcription
- [ ] Provider OpenAI répond au test de santé
- [ ] Fichier audio dans un format supporté
- [ ] Taille de fichier < 25MB

## 🚀 Solutions pour les providers locaux

### WhisperCpp
1. Installer WhisperCpp :
```bash
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp
make
```

2. Télécharger un modèle :
```bash
bash ./models/download-ggml-model.sh base
```

3. Configurer dans Obsidian :
   - Binary Path : `/chemin/vers/whisper.cpp/main`
   - Model Path : `/chemin/vers/whisper.cpp/models/ggml-base.bin`

### FasterWhisper
1. Installer Python et les dépendances :
```bash
pip install faster-whisper
```

2. Configurer dans Obsidian :
   - Python Path : `python` (ou chemin complet)
   - Model Name : `small` (ou autre modèle)

## 📞 Support

Si les problèmes persistent :

1. Exécutez le script de diagnostic complet
2. Vérifiez les logs de la console
3. Testez avec un fichier audio court (< 1 minute)
4. Vérifiez votre connexion internet (pour OpenAI)
5. Consultez les logs d'erreur dans GlitchTip

## 🔄 Prochaines améliorations

- [ ] Implémentation complète des providers locaux
- [ ] Gestion des erreurs plus détaillée
- [ ] Support de la compression audio automatique
- [ ] Interface de diagnostic intégrée
- [ ] Tests automatisés
