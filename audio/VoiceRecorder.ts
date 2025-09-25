import { TrackingService } from '../services/TrackingService';

/**
 * Gestionnaire d'enregistrement audio avec compression et optimisations
 */
export class VoiceRecorder {
	mediaRecorder: MediaRecorder | null = null;
	stream: MediaStream | null = null;
	chunks: Blob[] = [];
	private trackingService: TrackingService;
	private recordingStartTime: number = 0;
	
	// Audio compression settings for smaller file sizes
	private readonly AUDIO_SETTINGS = {
		mimeType: 'audio/webm;codecs=opus', // Opus codec for better compression
		audioBitsPerSecond: 32000, // 32 kbps for good quality/size balance
	};
	
	// Chunking settings for long recordings
	private readonly CHUNK_DURATION_MS = 120000; // 2 minutes per chunk
	private isChunking = false;
	private chunkStartTime = 0;

	// Fallback settings if primary format not supported
	private readonly FALLBACK_SETTINGS = [
		{ mimeType: 'audio/mp4;codecs=mp4a.40.2', audioBitsPerSecond: 32000 }, // AAC
		{ mimeType: 'audio/webm', audioBitsPerSecond: 32000 }, // WebM default
		{ mimeType: 'audio/mp4', audioBitsPerSecond: 32000 }, // MP4 default
	];

	constructor() {
		this.trackingService = TrackingService.getInstance();
	}

	private getBestAudioSettings(): MediaRecorderOptions {
		// Try preferred settings first
		if (MediaRecorder.isTypeSupported(this.AUDIO_SETTINGS.mimeType)) {
			return this.AUDIO_SETTINGS;
		}
		
		// Try fallback options
		for (const settings of this.FALLBACK_SETTINGS) {
			if (MediaRecorder.isTypeSupported(settings.mimeType)) {
				console.warn('Using fallback audio settings:', {
					function: 'VoiceRecorder.getBestAudioSettings',
					selectedSettings: settings
				});
				return settings;
			}
		}
		
		// Use browser default if nothing else works
		console.warn('Using default audio settings (no compression):', {
			function: 'VoiceRecorder.getBestAudioSettings',
			reason: 'no_supported_formats'
		});
		
		return {}; // Browser default
	}

	async start(): Promise<void> {
		this.recordingStartTime = Date.now();
		
		try {
			// Tracking du démarrage d'enregistrement
			this.trackingService.trackRecordingStart({
				userAgent: navigator.userAgent,
				chunkDurationMs: this.CHUNK_DURATION_MS
			});

			if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
				const error = new Error('getUserMedia not supported in this browser');
				console.error('getUserMedia not supported:', {
					function: 'VoiceRecorder.start',
					reason: 'getUserMedia_not_supported',
					userAgent: navigator.userAgent
				});
				
				// Tracking de l'erreur
				this.trackingService.trackRecordingError(error, {
					reason: 'getUserMedia_not_supported',
					userAgent: navigator.userAgent
				});
				
				throw error;
			}
			
			// Request mono audio at lower sample rate for smaller files
			this.stream = await navigator.mediaDevices.getUserMedia({ 
				audio: {
					channelCount: 1, // Mono audio
					sampleRate: 16000, // 16kHz sample rate (adequate for speech)
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true
				}
			});
			
			// Find the best supported audio format
			const audioSettings = this.getBestAudioSettings();
			this.mediaRecorder = new MediaRecorder(this.stream, audioSettings);
			this.chunks = [];
			
			console.log('Recording started with optimized settings:', {
				function: 'VoiceRecorder.start',
				audioSettings: audioSettings
			});

			this.mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					this.chunks.push(event.data);
				}
			};

			this.mediaRecorder.onerror = (event) => {
				const error = new Error(`MediaRecorder error: ${event.type}`);
				console.error('MediaRecorder error:', {
					function: 'VoiceRecorder.mediaRecorder.onerror',
					eventType: event.type,
					error: error
				});
				
				// Tracking de l'erreur MediaRecorder
				this.trackingService.trackRecordingError(error, {
					eventType: event.type,
					recorderState: this.mediaRecorder?.state
				});
			};

			// Start recording with chunking for better file size management
			this.mediaRecorder.start(this.CHUNK_DURATION_MS);
			this.chunkStartTime = Date.now();
			
			// Log successful start
			console.log('Voice recording started successfully:', {
				function: 'VoiceRecorder.start',
				chunkDurationMs: this.CHUNK_DURATION_MS
			});
			
		} catch (error) {
			let enhancedError: Error;
			let errorContext: Record<string, any> = {
				function: 'VoiceRecorder.start',
				userAgent: navigator.userAgent
			};

			if (error.name === 'NotAllowedError') {
				enhancedError = new Error('Microphone access denied. Please allow microphone permissions.');
				errorContext.reason = 'microphone_access_denied';
			} else if (error.name === 'NotFoundError') {
				enhancedError = new Error('No microphone found. Please connect a microphone.');
				errorContext.reason = 'no_microphone_found';
			} else {
				enhancedError = new Error(`Failed to access microphone: ${error.message}`);
				errorContext.reason = 'microphone_access_failed';
				errorContext.originalError = error.message;
				errorContext.errorName = error.name;
			}

			console.error('Voice recording start error:', {
				error: enhancedError,
				context: errorContext
			});
			
			// Tracking de l'erreur d'enregistrement
			this.trackingService.trackRecordingError(enhancedError, errorContext);
			
			throw enhancedError;
		}
	}

	pause(): void {
		if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
			this.mediaRecorder.pause();
		}
	}

	resume(): void {
		if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
			this.mediaRecorder.resume();
		}
	}

	async stop(): Promise<Blob> {
		return new Promise((resolve) => {
			if (this.mediaRecorder) {
				this.mediaRecorder.onstop = () => {
					// Utiliser le type MIME correct basé sur les paramètres d'enregistrement
					const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
					const audioBlob = new Blob(this.chunks, { type: mimeType });
					
					// Tracking de l'arrêt d'enregistrement
					const duration = Date.now() - this.recordingStartTime;
					this.trackingService.trackRecordingStop(duration / 1000, {
						audioSizeBytes: audioBlob.size,
						mimeType: mimeType,
						chunksCount: this.chunks.length
					});
					
					this.cleanup();
					resolve(audioBlob);
				};
				this.mediaRecorder.stop();
			}
		});
	}

	cleanup(): void {
		if (this.stream) {
			this.stream.getTracks().forEach(track => track.stop());
			this.stream = null;
		}
		this.mediaRecorder = null;
		this.chunks = [];
	}
}
