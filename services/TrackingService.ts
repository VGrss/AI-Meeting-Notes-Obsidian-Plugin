import { ErrorTrackingService } from './ErrorTrackingService';

/**
 * Service de tracking centralisé pour tout le pipeline
 * Gère le tracking cross-provider pour recording, transcription et résumé IA
 */
export class TrackingService {
	private static instance: TrackingService;
	private errorTracking: ErrorTrackingService;
	private pipelineStartTime: number = 0;
	private currentSession: PipelineSession | null = null;

	private constructor() {
		this.errorTracking = new ErrorTrackingService();
	}

	static getInstance(): TrackingService {
		if (!TrackingService.instance) {
			TrackingService.instance = new TrackingService();
		}
		return TrackingService.instance;
	}

	/**
	 * Initialise le service de tracking avec Glitchtip
	 */
	init(dsn: string, enabled: boolean = true) {
		this.errorTracking.init(dsn, enabled);
	}

	/**
	 * Démarre une nouvelle session de pipeline
	 */
	startPipelineSession(recordingProvider: string, transcriptionProvider: string, summarizationProvider: string): string {
		this.pipelineStartTime = Date.now();
		this.currentSession = {
			id: this.errorTracking.getSessionId(),
			recordingProvider,
			transcriptionProvider,
			summarizationProvider,
			startTime: this.pipelineStartTime,
			stages: []
		};

		this.errorTracking.captureMessage('Pipeline session started', 'info', {
			pipeline_session_id: this.currentSession.id,
			recording_provider: recordingProvider,
			transcription_provider: transcriptionProvider,
			summarization_provider: summarizationProvider
		});

		return this.currentSession.id;
	}

	/**
	 * Tracking du démarrage d'enregistrement
	 */
	trackRecordingStart(options?: Record<string, any>) {
		if (!this.currentSession) return;

		const stage: PipelineStage = {
			type: 'recording_start',
			timestamp: Date.now(),
			provider: this.currentSession.recordingProvider,
			options
		};

		this.currentSession.stages.push(stage);
		this.errorTracking.trackRecordingStart(this.currentSession.recordingProvider, options);
	}

	/**
	 * Tracking de l'arrêt d'enregistrement
	 */
	trackRecordingStop(duration: number, options?: Record<string, any>) {
		if (!this.currentSession) return;

		const stage: PipelineStage = {
			type: 'recording_stop',
			timestamp: Date.now(),
			provider: this.currentSession.recordingProvider,
			options: { ...options, duration }
		};

		this.currentSession.stages.push(stage);
		this.errorTracking.trackRecordingStop(this.currentSession.recordingProvider, duration, options);
	}

	/**
	 * Tracking d'erreur d'enregistrement
	 */
	trackRecordingError(error: Error, options?: Record<string, any>) {
		if (!this.currentSession) return;

		const stage: PipelineStage = {
			type: 'recording_error',
			timestamp: Date.now(),
			provider: this.currentSession.recordingProvider,
			error: error.message,
			options
		};

		this.currentSession.stages.push(stage);
		this.errorTracking.trackRecordingError(this.currentSession.recordingProvider, error, options);
	}

	/**
	 * Tracking du démarrage de transcription
	 */
	trackTranscriptionStart(provider: string, audioSize?: number, options?: Record<string, any>) {
		if (!this.currentSession) return;

		const stage: PipelineStage = {
			type: 'transcription_start',
			timestamp: Date.now(),
			provider: this.currentSession.transcriptionProvider,
			options: { ...options, audioSize }
		};

		this.currentSession.stages.push(stage);
		this.errorTracking.trackTranscriptionStart(provider, audioSize, options);
	}

	/**
	 * Tracking de succès de transcription
	 */
	trackTranscriptionSuccess(provider: string, result: any, processingTime?: number, options?: Record<string, any>) {
		if (!this.currentSession) return;

		const stage: PipelineStage = {
			type: 'transcription_success',
			timestamp: Date.now(),
			provider: this.currentSession.transcriptionProvider,
			options: { ...options, processingTime, textLength: result?.text?.length, language: result?.lang }
		};

		this.currentSession.stages.push(stage);
		this.errorTracking.trackTranscriptionSuccess(provider, result, processingTime, options);
	}

	/**
	 * Tracking d'erreur de transcription
	 */
	trackTranscriptionError(provider: string, error: Error, options?: Record<string, any>) {
		if (!this.currentSession) return;

		const stage: PipelineStage = {
			type: 'transcription_error',
			timestamp: Date.now(),
			provider: this.currentSession.transcriptionProvider,
			error: error.message,
			options
		};

		this.currentSession.stages.push(stage);
		this.errorTracking.trackTranscriptionError(provider, error, options);
	}

	/**
	 * Tracking du démarrage de résumé IA
	 */
	trackSummarizationStart(provider: string, textLength: number, options?: Record<string, any>) {
		if (!this.currentSession) return;

		const stage: PipelineStage = {
			type: 'summarization_start',
			timestamp: Date.now(),
			provider: this.currentSession.summarizationProvider,
			options: { ...options, textLength }
		};

		this.currentSession.stages.push(stage);
		this.errorTracking.trackSummarizationStart(provider, textLength, options);
	}

	/**
	 * Tracking de succès de résumé IA
	 */
	trackSummarizationSuccess(provider: string, result: any, processingTime?: number, options?: Record<string, any>) {
		if (!this.currentSession) return;

		const stage: PipelineStage = {
			type: 'summarization_success',
			timestamp: Date.now(),
			provider: this.currentSession.summarizationProvider,
			options: { ...options, processingTime, summaryLength: result?.summary?.length, tokens: result?.tokens }
		};

		this.currentSession.stages.push(stage);
		this.errorTracking.trackSummarizationSuccess(provider, result, processingTime, options);
	}

	/**
	 * Tracking d'erreur de résumé IA
	 */
	trackSummarizationError(provider: string, error: Error, options?: Record<string, any>) {
		if (!this.currentSession) return;

		const stage: PipelineStage = {
			type: 'summarization_error',
			timestamp: Date.now(),
			provider: this.currentSession.summarizationProvider,
			error: error.message,
			options
		};

		this.currentSession.stages.push(stage);
		this.errorTracking.trackSummarizationError(provider, error, options);
	}

	/**
	 * Finalise la session de pipeline
	 */
	completePipelineSession(options?: Record<string, any>) {
		if (!this.currentSession) return;

		const totalTime = Date.now() - this.pipelineStartTime;
		
		this.errorTracking.trackPipelineComplete(
			this.currentSession.recordingProvider,
			this.currentSession.transcriptionProvider,
			this.currentSession.summarizationProvider,
			totalTime,
			{
				...options,
				pipeline_session_id: this.currentSession.id,
				total_stages: this.currentSession.stages.length,
				stages_summary: this.currentSession.stages.map(s => ({ type: s.type, provider: s.provider, timestamp: s.timestamp }))
			}
		);

		// Reset pour la prochaine session
		this.currentSession = null;
		this.pipelineStartTime = 0;
	}

	/**
	 * Tracking d'erreur générale de pipeline
	 */
	trackPipelineError(stage: string, error: Error, options?: Record<string, any>) {
		this.errorTracking.trackPipelineError(stage, error, options);
	}

	/**
	 * Ajoute des tags personnalisés
	 */
	setTag(key: string, value: string) {
		this.errorTracking.setTag(key, value);
	}

	/**
	 * Ajoute du contexte personnalisé
	 */
	setContext(key: string, context: Record<string, any>) {
		this.errorTracking.setContext(key, context);
	}

	/**
	 * Obtient l'ID de session actuel
	 */
	getSessionId(): string {
		return this.errorTracking.getSessionId();
	}

	/**
	 * Obtient la session actuelle (pour debug)
	 */
	getCurrentSession(): PipelineSession | null {
		return this.currentSession;
	}

	/**
	 * Track le début d'une conversion audio
	 */
	trackAudioConversionStart(providerId: string, options: Record<string, any>): void {
		const event = {
			function: 'TrackingService.trackAudioConversionStart',
			providerId,
			originalFormat: options.originalFormat,
			targetFormat: options.targetFormat,
			originalSize: options.originalSize,
			timestamp: Date.now()
		};

		console.log('Audio conversion started:', event);
		// Log l'événement de conversion audio
		this.errorTracking.captureMessage('Audio conversion started', 'info', event);
	}

	/**
	 * Track le succès d'une conversion audio
	 */
	trackAudioConversionSuccess(providerId: string, result: any): void {
		const event = {
			function: 'TrackingService.trackAudioConversionSuccess',
			providerId,
			filePath: result.filePath,
			format: result.format,
			size: result.size,
			conversionTime: result.metadata?.conversionTime,
			timestamp: Date.now()
		};

		console.log('Audio conversion successful:', event);
		// Log l'événement de conversion audio réussie
		this.errorTracking.captureMessage('Audio conversion successful', 'info', event);
	}

	/**
	 * Track l'erreur d'une conversion audio
	 */
	trackAudioConversionError(error: Error, context: Record<string, any>): void {
		const event = {
			function: 'TrackingService.trackAudioConversionError',
			error: error.message,
			providerId: context.providerId,
			originalFormat: context.originalFormat,
			conversionTime: context.conversionTime,
			timestamp: Date.now()
		};

		console.error('Audio conversion error:', event);
		// Log l'erreur de conversion audio
		this.errorTracking.captureError(error, event);
	}
}

/**
 * Interface pour une session de pipeline
 */
interface PipelineSession {
	id: string;
	recordingProvider: string;
	transcriptionProvider: string;
	summarizationProvider: string;
	startTime: number;
	stages: PipelineStage[];
}

/**
 * Interface pour une étape du pipeline
 */
interface PipelineStage {
	type: 'recording_start' | 'recording_stop' | 'recording_error' | 
		  'transcription_start' | 'transcription_success' | 'transcription_error' |
		  'summarization_start' | 'summarization_success' | 'summarization_error' |
		  'audio_conversion_start' | 'audio_conversion_success' | 'audio_conversion_error';
	timestamp: number;
	provider: string;
	error?: string;
	options?: Record<string, any>;
}
