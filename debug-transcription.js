/**
 * Script de débogage pour diagnostiquer les problèmes de transcription
 * À exécuter dans la console du navigateur ou dans Obsidian
 */

// Fonction pour tester la configuration des providers
async function testTranscriptionProviders() {
    console.log('🔍 Test des providers de transcription...');
    
    try {
        // Test 1: Vérifier l'enregistrement des providers
        const { getAllProvidersList, getTranscriberProvider } = await import('./src/providers/index.ts');
        
        const allProviders = getAllProvidersList();
        console.log('📋 Providers enregistrés:', allProviders);
        
        // Test 2: Tester chaque provider de transcription
        for (const { type, providers } of allProviders) {
            if (type === 'transcriber') {
                for (const provider of providers) {
                    console.log(`\n🧪 Test du provider: ${provider.name} (${provider.id})`);
                    
                    try {
                        const health = await provider.check();
                        console.log(`✅ Santé du provider:`, health);
                        
                        if (health.ok) {
                            console.log(`🎯 Provider ${provider.name} est opérationnel`);
                        } else {
                            console.log(`❌ Provider ${provider.name} a des problèmes:`, health.details);
                        }
                    } catch (error) {
                        console.error(`💥 Erreur lors du test de ${provider.name}:`, error);
                    }
                }
            }
        }
        
        // Test 3: Tester la récupération d'un provider spécifique
        try {
            const openaiProvider = getTranscriberProvider('openai-whisper');
            console.log('\n🎯 Provider OpenAI récupéré:', openaiProvider.name);
        } catch (error) {
            console.error('❌ Impossible de récupérer le provider OpenAI:', error);
        }
        
    } catch (error) {
        console.error('💥 Erreur lors du test des providers:', error);
    }
}

// Fonction pour tester l'enregistrement audio
async function testAudioRecording() {
    console.log('\n🎙️ Test de l\'enregistrement audio...');
    
    try {
        // Vérifier les capacités du navigateur
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error('❌ getUserMedia non supporté dans ce navigateur');
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
        console.log('📊 Configuration audio:', {
            audioTracks: stream.getAudioTracks().length,
            trackSettings: stream.getAudioTracks()[0]?.getSettings()
        });
        
        // Tester MediaRecorder
        const supportedTypes = [
            'audio/webm;codecs=opus',
            'audio/mp4;codecs=mp4a.40.2',
            'audio/webm',
            'audio/mp4'
        ];
        
        const supportedType = supportedTypes.find(type => MediaRecorder.isTypeSupported(type));
        console.log('🎵 Format audio supporté:', supportedType || 'Aucun format optimisé trouvé');
        
        // Nettoyer
        stream.getTracks().forEach(track => track.stop());
        
    } catch (error) {
        console.error('💥 Erreur lors du test audio:', error);
    }
}

// Fonction pour tester la transcription avec un fichier d'exemple
async function testTranscriptionWithSample() {
    console.log('\n📝 Test de transcription avec échantillon...');
    
    try {
        // Charger le fichier d'exemple
        const response = await fetch('./samples/10s_meeting.mp3');
        if (!response.ok) {
            console.log('⚠️ Fichier d\'exemple non trouvé, test ignoré');
            return;
        }
        
        const audioBlob = await response.blob();
        console.log('📁 Fichier audio chargé:', {
            size: audioBlob.size,
            type: audioBlob.type,
            sizeMB: (audioBlob.size / (1024 * 1024)).toFixed(2)
        });
        
        // Tester la transcription
        const { getTranscriberProvider } = await import('./src/providers/index.ts');
        const transcriber = getTranscriberProvider('openai-whisper');
        
        console.log('🔄 Début de la transcription...');
        const startTime = Date.now();
        
        const result = await transcriber.transcribe(audioBlob);
        
        const endTime = Date.now();
        console.log('✅ Transcription terminée:', {
            duration: `${endTime - startTime}ms`,
            textLength: result.text.length,
            language: result.lang,
            segments: result.segments?.length || 0
        });
        
        console.log('📄 Texte transcrit:', result.text);
        
    } catch (error) {
        console.error('💥 Erreur lors de la transcription:', error);
    }
}

// Fonction principale de diagnostic
async function runDiagnostics() {
    console.log('🚀 Démarrage du diagnostic de transcription...\n');
    
    await testTranscriptionProviders();
    await testAudioRecording();
    await testTranscriptionWithSample();
    
    console.log('\n✅ Diagnostic terminé');
}

// Exporter les fonctions pour utilisation manuelle
window.debugTranscription = {
    runDiagnostics,
    testTranscriptionProviders,
    testAudioRecording,
    testTranscriptionWithSample
};

console.log('🔧 Script de diagnostic chargé. Utilisez:');
console.log('- debugTranscription.runDiagnostics() pour un diagnostic complet');
console.log('- debugTranscription.testTranscriptionProviders() pour tester les providers');
console.log('- debugTranscription.testAudioRecording() pour tester l\'audio');
console.log('- debugTranscription.testTranscriptionWithSample() pour tester la transcription');
