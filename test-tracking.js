/**
 * Script de test pour vérifier le système de tracking Glitchtip
 * Ce script simule le pipeline complet de recording -> transcription -> résumé
 */

const { TrackingService } = require('./services/TrackingService.ts');

async function testTrackingPipeline() {
    console.log('🧪 Début du test du système de tracking...');
    
    // Initialiser le service de tracking
    const trackingService = TrackingService.getInstance();
    const testDsn = 'https://fc4c4cf2c55b4aaaa076954be7e02814@app.glitchtip.com/12695';
    trackingService.init(testDsn, true);
    
    console.log('✅ Service de tracking initialisé');
    
    try {
        // Simuler une session de pipeline complète
        const sessionId = trackingService.startPipelineSession(
            'voice-recorder',
            'openai-whisper',
            'openai-gpt4o'
        );
        
        console.log(`📊 Session de pipeline démarrée: ${sessionId}`);
        
        // Simuler le démarrage d'enregistrement
        trackingService.trackRecordingStart({
            userAgent: 'test-agent',
            chunkDurationMs: 120000
        });
        
        console.log('🎙️ Enregistrement démarré (tracking)');
        
        // Simuler l'arrêt d'enregistrement
        trackingService.trackRecordingStop(30.5, {
            audioSizeBytes: 1024000,
            mimeType: 'audio/webm',
            chunksCount: 2
        });
        
        console.log('⏹️ Enregistrement arrêté (tracking)');
        
        // Simuler le démarrage de transcription
        trackingService.trackTranscriptionStart('openai-whisper', 1024000, {
            audioType: 'audio/webm',
            language: 'fr',
            model: 'whisper-1'
        });
        
        console.log('📝 Transcription démarrée (tracking)');
        
        // Simuler le succès de transcription
        const mockTranscriptionResult = {
            text: 'Bonjour, ceci est un test de transcription.',
            lang: 'fr',
            segments: [
                { text: 'Bonjour, ceci est un test de transcription.', start: 0, end: 5, confidence: 0.95 }
            ]
        };
        
        trackingService.trackTranscriptionSuccess('openai-whisper', mockTranscriptionResult, 2500, {
            audioBlobSize: 1024000,
            transcriptLength: mockTranscriptionResult.text.length,
            mimeType: 'audio/webm',
            language: 'fr',
            segmentsCount: 1
        });
        
        console.log('✅ Transcription réussie (tracking)');
        
        // Simuler le démarrage de résumé
        trackingService.trackSummarizationStart('openai-gpt4o', mockTranscriptionResult.text.length, {
            originalTextLength: mockTranscriptionResult.text.length,
            style: 'detailed',
            language: 'fr',
            hasCustomPrompt: false
        });
        
        console.log('🤖 Résumé IA démarré (tracking)');
        
        // Simuler le succès de résumé
        const mockSummaryResult = {
            summary: 'Test de résumé automatique d\'un enregistrement audio.',
            tokens: 150,
            metadata: {
                originalLength: mockTranscriptionResult.text.length,
                compressionRatio: 0.8,
                model: 'gpt-4o',
                processingTime: 1500
            }
        };
        
        trackingService.trackSummarizationSuccess('openai-gpt4o', mockSummaryResult, 1500, {
            originalTextLength: mockTranscriptionResult.text.length,
            summaryLength: mockSummaryResult.summary.length,
            tokensUsed: 150,
            compressionRatio: 0.8
        });
        
        console.log('✅ Résumé IA réussi (tracking)');
        
        // Finaliser la session de pipeline
        trackingService.completePipelineSession({
            recordingId: 'test-recording-123',
            audioBlobSize: 1024000,
            transcriptLength: mockTranscriptionResult.text.length,
            summaryLength: mockSummaryResult.summary.length,
            language: 'fr'
        });
        
        console.log('🎯 Pipeline complet terminé (tracking)');
        
        console.log('\n📈 Statistiques de la session:');
        const currentSession = trackingService.getCurrentSession();
        if (currentSession) {
            console.log(`- ID de session: ${currentSession.id}`);
            console.log(`- Provider d'enregistrement: ${currentSession.recordingProvider}`);
            console.log(`- Provider de transcription: ${currentSession.transcriptionProvider}`);
            console.log(`- Provider de résumé: ${currentSession.summarizationProvider}`);
            console.log(`- Nombre d'étapes: ${currentSession.stages.length}`);
            console.log(`- Durée totale: ${Date.now() - currentSession.startTime}ms`);
        }
        
        console.log('\n✅ Test du système de tracking terminé avec succès !');
        console.log('🔍 Vérifiez votre dashboard Glitchtip pour voir les événements.');
        
    } catch (error) {
        console.error('❌ Erreur lors du test de tracking:', error);
        
        // Simuler une erreur de pipeline
        trackingService.trackPipelineError('test', error, {
            testMode: true,
            errorDetails: error.message
        });
    }
}

// Fonction pour tester les erreurs
async function testErrorTracking() {
    console.log('\n🧪 Test du tracking d\'erreurs...');
    
    const trackingService = TrackingService.getInstance();
    
    try {
        // Simuler une erreur d'enregistrement
        const recordingError = new Error('Microphone access denied');
        trackingService.trackRecordingError('voice-recorder', recordingError, {
            reason: 'microphone_access_denied',
            userAgent: 'test-agent'
        });
        
        console.log('🎙️ Erreur d\'enregistrement trackée');
        
        // Simuler une erreur de transcription
        const transcriptionError = new Error('Audio file too large');
        trackingService.trackTranscriptionError('openai-whisper', transcriptionError, {
            audioInputType: 'Blob',
            audioSize: 30000000,
            errorType: 'provider_error'
        });
        
        console.log('📝 Erreur de transcription trackée');
        
        // Simuler une erreur de résumé
        const summaryError = new Error('API rate limit exceeded');
        trackingService.trackSummarizationError('openai-gpt4o', summaryError, {
            originalTextLength: 1000,
            errorType: 'provider_error',
            style: 'detailed'
        });
        
        console.log('🤖 Erreur de résumé trackée');
        
        console.log('✅ Test du tracking d\'erreurs terminé !');
        
    } catch (error) {
        console.error('❌ Erreur lors du test d\'erreurs:', error);
    }
}

// Exécuter les tests
if (require.main === module) {
    testTrackingPipeline()
        .then(() => testErrorTracking())
        .then(() => {
            console.log('\n🎉 Tous les tests de tracking sont terminés !');
            console.log('💡 Vérifiez votre dashboard Glitchtip pour voir les données.');
        })
        .catch((error) => {
            console.error('❌ Erreur lors des tests:', error);
            process.exit(1);
        });
}

module.exports = { testTrackingPipeline, testErrorTracking };
