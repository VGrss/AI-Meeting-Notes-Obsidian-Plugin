/**
 * Script de débogage spécifique pour la transcription
 * À exécuter dans la console d'Obsidian
 */

// Fonction pour tester le flux complet de transcription
async function debugTranscriptionFlow() {
    console.log('🔍 Débogage du flux de transcription...');
    
    try {
        // 1. Vérifier l'initialisation des providers
        console.log('\n1️⃣ Vérification des providers...');
        
        // Importer les fonctions du système de providers
        const { getAllProvidersList, getTranscriberProvider, getSummarizerProvider } = await import('./src/providers/index.ts');
        
        const allProviders = getAllProvidersList();
        console.log('📋 Providers enregistrés:', allProviders);
        
        // 2. Vérifier le provider de transcription sélectionné
        console.log('\n2️⃣ Test du provider de transcription...');
        
        try {
            const transcriber = getTranscriberProvider('openai-whisper');
            console.log('✅ Provider OpenAI récupéré:', transcriber.name);
            
            // Test de santé du provider
            const health = await transcriber.check();
            console.log('🏥 Santé du provider:', health);
            
            if (!health.ok) {
                console.error('❌ Provider OpenAI non opérationnel:', health.details);
                return;
            }
            
        } catch (error) {
            console.error('❌ Erreur lors de la récupération du provider:', error);
            return;
        }
        
        // 3. Tester la création d'un Blob audio de test
        console.log('\n3️⃣ Test de création d\'un Blob audio...');
        
        // Créer un Blob audio de test (silence de 1 seconde)
        const sampleRate = 16000;
        const duration = 1; // 1 seconde
        const length = sampleRate * duration;
        const buffer = new ArrayBuffer(length * 2); // 16-bit
        const view = new DataView(buffer);
        
        // Remplir avec du silence (valeurs à 0)
        for (let i = 0; i < length; i++) {
            view.setInt16(i * 2, 0, true); // little-endian
        }
        
        const audioBlob = new Blob([buffer], { type: 'audio/wav' });
        console.log('🎵 Blob audio créé:', {
            size: audioBlob.size,
            type: audioBlob.type,
            sizeKB: (audioBlob.size / 1024).toFixed(2)
        });
        
        // 4. Tester la transcription
        console.log('\n4️⃣ Test de transcription...');
        
        try {
            const transcriber = getTranscriberProvider('openai-whisper');
            console.log('🔄 Début de la transcription...');
            
            const startTime = Date.now();
            const result = await transcriber.transcribe(audioBlob);
            const endTime = Date.now();
            
            console.log('✅ Transcription réussie:', {
                duration: `${endTime - startTime}ms`,
                text: result.text,
                language: result.lang,
                segments: result.segments?.length || 0
            });
            
        } catch (error) {
            console.error('❌ Erreur de transcription:', error);
            console.error('Détails de l\'erreur:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
        }
        
    } catch (error) {
        console.error('💥 Erreur générale:', error);
    }
}

// Fonction pour tester la configuration des paramètres
async function debugSettings() {
    console.log('\n🔧 Vérification de la configuration...');
    
    try {
        // Accéder aux paramètres du plugin (si possible)
        const app = window.app;
        if (app && app.plugins) {
            const plugin = app.plugins.plugins['ai-voice-meeting-notes'];
            if (plugin) {
                console.log('⚙️ Paramètres du plugin:', plugin.settings);
                
                // Vérifier la clé API
                if (plugin.settings.openaiApiKey) {
                    console.log('🔑 Clé API OpenAI configurée:', plugin.settings.openaiApiKey.substring(0, 8) + '...');
                } else {
                    console.warn('⚠️ Clé API OpenAI non configurée');
                }
                
                // Vérifier le provider sélectionné
                console.log('🎯 Provider de transcription:', plugin.settings.transcriberProvider);
                console.log('📝 Provider de résumé:', plugin.settings.summarizerProvider);
                
            } else {
                console.warn('⚠️ Plugin non trouvé');
            }
        } else {
            console.warn('⚠️ Impossible d\'accéder aux paramètres du plugin');
        }
    } catch (error) {
        console.error('❌ Erreur lors de la vérification des paramètres:', error);
    }
}

// Fonction pour tester l'enregistrement audio
async function debugAudioRecording() {
    console.log('\n🎙️ Test de l\'enregistrement audio...');
    
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error('❌ getUserMedia non supporté');
            return;
        }
        
        // Tester l'accès au microphone
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                channelCount: 1,
                sampleRate: 16000,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
        
        console.log('✅ Accès au microphone réussi');
        
        // Tester MediaRecorder
        const supportedTypes = [
            'audio/webm;codecs=opus',
            'audio/mp4;codecs=mp4a.40.2',
            'audio/webm',
            'audio/mp4'
        ];
        
        const supportedType = supportedTypes.find(type => MediaRecorder.isTypeSupported(type));
        console.log('🎵 Format audio supporté:', supportedType);
        
        // Créer un enregistrement de test
        const mediaRecorder = new MediaRecorder(stream, { mimeType: supportedType });
        const chunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                chunks.push(event.data);
            }
        };
        
        return new Promise((resolve) => {
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(chunks, { type: supportedType });
                console.log('🎵 Enregistrement de test créé:', {
                    size: audioBlob.size,
                    type: audioBlob.type,
                    chunks: chunks.length
                });
                
                // Nettoyer
                stream.getTracks().forEach(track => track.stop());
                resolve(audioBlob);
            };
            
            // Enregistrer pendant 1 seconde
            mediaRecorder.start();
            setTimeout(() => mediaRecorder.stop(), 1000);
        });
        
    } catch (error) {
        console.error('❌ Erreur lors du test audio:', error);
    }
}

// Fonction principale de débogage
async function runFullDebug() {
    console.log('🚀 Démarrage du débogage complet de la transcription...\n');
    
    await debugSettings();
    await debugAudioRecording();
    await debugTranscriptionFlow();
    
    console.log('\n✅ Débogage terminé');
}

// Exporter les fonctions
window.debugTranscriptionFlow = {
    runFullDebug,
    debugSettings,
    debugAudioRecording,
    debugTranscriptionFlow
};

console.log('🔧 Script de débogage de transcription chargé. Utilisez:');
console.log('- debugTranscriptionFlow.runFullDebug() pour un débogage complet');
console.log('- debugTranscriptionFlow.debugSettings() pour vérifier la config');
console.log('- debugTranscriptionFlow.debugAudioRecording() pour tester l\'audio');
console.log('- debugTranscriptionFlow.debugTranscriptionFlow() pour tester la transcription');
