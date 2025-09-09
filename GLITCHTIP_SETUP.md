# Configuration GlitchTip pour AI Voice Meeting Notes

Ce plugin utilise GlitchTip pour le suivi des erreurs afin d'améliorer la fiabilité et de détecter rapidement les problèmes comme les échecs de transcription.

## Configuration sécurisée

### Étape 1 : Accéder aux paramètres du plugin
1. Ouvrez Obsidian
2. Allez dans Paramètres → Plugins communautaires
3. Trouvez "AI Voice Meeting Notes" et cliquez sur l'icône d'engrenage

### Étape 2 : Configurer le suivi d'erreurs
1. Faites défiler jusqu'à la section "Error Tracking (Optional)"
2. Activez "Enable Error Tracking" 
3. Dans le champ "GlitchTip DSN", entrez : 
   ```
   https://fc4c4cf2c55b4aaaa076954be7e02814@app.glitchtip.com/12695
   ```

### Étape 3 : Vérification
- Le plugin commencera automatiquement à surveiller les erreurs
- En cas d'erreur de transcription, elle sera automatiquement reportée avec le contexte complet
- Vous pouvez surveiller les erreurs sur : https://app.glitchtip.com/

## Types d'erreurs surveillées

Le plugin capture automatiquement :
- ❌ Échecs de transcription OpenAI Whisper
- ❌ Erreurs d'accès au microphone
- ❌ Problèmes de permissions
- ❌ Échecs de génération de résumé IA
- ❌ Erreurs de compatibilité navigateur
- ✅ Succès d'opérations pour le monitoring des performances

## Sécurité

- Le DSN est stocké localement dans Obsidian uniquement
- Aucune donnée sensible n'est exposée dans le code source public
- Les données d'erreur ne contiennent pas d'informations personnelles
- Seuls les contextes techniques sont envoyés (taille de fichiers, codes d'erreur, etc.)

## Désactiver le suivi

Pour désactiver le suivi d'erreurs à tout moment :
1. Allez dans les paramètres du plugin
2. Désactivez "Enable Error Tracking"
3. Le DSN peut être laissé en place pour une réactivation facile

## Support

Si vous rencontrez des problèmes avec la configuration GlitchTip, vérifiez :
- Que le DSN est correctement saisi (sans espaces supplémentaires)
- Que la connexion internet fonctionne
- Que les cookies/localStorage sont autorisés pour Obsidian