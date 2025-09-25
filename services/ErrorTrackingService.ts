import * as Sentry from '@sentry/browser';

/**
 * Service de suivi d'erreurs utilisant GlitchTip (Sentry)
 * Tracking cross-provider pour tout le pipeline de recording jusqu'au traitement IA
 */
export class ErrorTrackingService {
	private isInitialized = false;
	private sessionId: string = '';

	init(dsn: string, enabled: boolean) {
		if (!enabled || !dsn || this.isInitialized) return;

		try {
			// Générer un ID de session unique pour cette instance
			this.sessionId = this.generateSessionId();
			
			Sentry.init({
				dsn: dsn,
				environment: 'production',
				integrations: [
					Sentry.browserTracingIntegration(),
				],
				tracesSampleRate: 0.1,
				beforeSend(event) {
					if (event.exception) {
						const error = event.exception.values?.[0];
						if (error) {
							console.error('Error captured by GlitchTip:', error);
						}
					}
					return event;
				}
			});
			
			Sentry.setTag('plugin', 'ai-voice-meeting-notes');
			Sentry.setTag('session_id', this.sessionId);
			this.isInitialized = true;
			console.log('GlitchTip error tracking initialized with session:', this.sessionId);
		} catch (error) {
			console.error('Failed to initialize GlitchTip:', error);
		}
	}

	private generateSessionId(): string {
		return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	captureError(error: Error, context?: Record<string, any>) {
		if (!this.isInitialized) {
			console.error('Error (tracking disabled):', error);
			return;
		}

		Sentry.withScope((scope) => {
			if (context) {
				Object.entries(context).forEach(([key, value]) => {
					scope.setExtra(key, value);
				});
			}
			Sentry.captureException(error);
		});
	}

	captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) {
		if (!this.isInitialized) {
			console.log(`Message (tracking disabled): ${message}`);
			return;
		}

		Sentry.withScope((scope) => {
			scope.setLevel(level);
			if (context) {
				Object.entries(context).forEach(([key, value]) => {
					scope.setExtra(key, value);
				});
			}
			Sentry.captureMessage(message);
		});
	}

	setUserContext(userId: string, userData?: Record<string, any>) {
		if (!this.isInitialized) return;
		
		Sentry.setUser({
			id: userId,
			...userData
		});
	}

	/**
	 * Tracking spécialisé pour le pipeline de recording
	 */
	trackRecordingStart(provider: string, options?: Record<string, any>) {
		this.captureMessage('Recording started', 'info', {
			pipeline_stage: 'recording_start',
			provider,
			session_id: this.sessionId,
			...options
		});
	}

	trackRecordingStop(provider: string, duration: number, options?: Record<string, any>) {
		this.captureMessage('Recording stopped', 'info', {
			pipeline_stage: 'recording_stop',
			provider,
			duration_seconds: duration,
			session_id: this.sessionId,
			...options
		});
	}

	trackRecordingError(provider: string, error: Error, options?: Record<string, any>) {
		this.captureError(error, {
			pipeline_stage: 'recording_error',
			provider,
			session_id: this.sessionId,
			...options
		});
	}

	/**
	 * Tracking spécialisé pour la transcription
	 */
	trackTranscriptionStart(provider: string, audioSize?: number, options?: Record<string, any>) {
		this.captureMessage('Transcription started', 'info', {
			pipeline_stage: 'transcription_start',
			provider,
			audio_size_bytes: audioSize,
			session_id: this.sessionId,
			...options
		});
	}

	trackTranscriptionSuccess(provider: string, result: any, processingTime?: number, options?: Record<string, any>) {
		this.captureMessage('Transcription completed', 'info', {
			pipeline_stage: 'transcription_success',
			provider,
			processing_time_ms: processingTime,
			text_length: result?.text?.length || 0,
			language_detected: result?.lang,
			session_id: this.sessionId,
			...options
		});
	}

	trackTranscriptionError(provider: string, error: Error, options?: Record<string, any>) {
		this.captureError(error, {
			pipeline_stage: 'transcription_error',
			provider,
			session_id: this.sessionId,
			...options
		});
	}

	/**
	 * Tracking spécialisé pour la génération de résumé IA
	 */
	trackSummarizationStart(provider: string, textLength: number, options?: Record<string, any>) {
		this.captureMessage('AI Summarization started', 'info', {
			pipeline_stage: 'summarization_start',
			provider,
			input_text_length: textLength,
			session_id: this.sessionId,
			...options
		});
	}

	trackSummarizationSuccess(provider: string, result: any, processingTime?: number, options?: Record<string, any>) {
		this.captureMessage('AI Summarization completed', 'info', {
			pipeline_stage: 'summarization_success',
			provider,
			processing_time_ms: processingTime,
			summary_length: result?.summary?.length || 0,
			tokens_used: result?.tokens,
			session_id: this.sessionId,
			...options
		});
	}

	trackSummarizationError(provider: string, error: Error, options?: Record<string, any>) {
		this.captureError(error, {
			pipeline_stage: 'summarization_error',
			provider,
			session_id: this.sessionId,
			...options
		});
	}

	/**
	 * Tracking pour le pipeline complet
	 */
	trackPipelineComplete(recordingProvider: string, transcriptionProvider: string, summarizationProvider: string, totalTime?: number, options?: Record<string, any>) {
		this.captureMessage('Complete pipeline finished', 'info', {
			pipeline_stage: 'pipeline_complete',
			recording_provider: recordingProvider,
			transcription_provider: transcriptionProvider,
			summarization_provider: summarizationProvider,
			total_processing_time_ms: totalTime,
			session_id: this.sessionId,
			...options
		});
	}

	/**
	 * Tracking pour les erreurs de pipeline
	 */
	trackPipelineError(stage: string, error: Error, options?: Record<string, any>) {
		this.captureError(error, {
			pipeline_stage: `pipeline_error_${stage}`,
			session_id: this.sessionId,
			...options
		});
	}

	/**
	 * Ajouter des tags personnalisés
	 */
	setTag(key: string, value: string) {
		if (!this.isInitialized) return;
		Sentry.setTag(key, value);
	}

	/**
	 * Ajouter du contexte personnalisé
	 */
	setContext(key: string, context: Record<string, any>) {
		if (!this.isInitialized) return;
		Sentry.setContext(key, context);
	}

	/**
	 * Obtenir l'ID de session actuel
	 */
	getSessionId(): string {
		return this.sessionId;
	}
}
