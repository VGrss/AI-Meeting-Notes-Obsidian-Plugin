import { ErrorTrackingService } from './ErrorTrackingService';
import { requestUrl } from 'obsidian';

/**
 * Service pour l'intégration avec les API OpenAI (Whisper et GPT-4o)
 */
export class OpenAIService {
	private apiKey: string;
	private errorTracker?: ErrorTrackingService;
	private customSummaryPrompt: string;
	
	// OpenAI Whisper limits: 25MB max file size
	private readonly MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes
	private readonly RECOMMENDED_MAX_SIZE = 20 * 1024 * 1024; // 20MB recommended limit

	constructor(apiKey: string, customSummaryPrompt: string, errorTracker?: ErrorTrackingService) {
		this.apiKey = apiKey;
		this.customSummaryPrompt = customSummaryPrompt;
		this.errorTracker = errorTracker;
	}

	private checkFileSize(audioBlob: Blob): { canUpload: boolean; message?: string; recommendation?: string } {
		const sizeMB = (audioBlob.size / (1024 * 1024)).toFixed(1);
		
		if (audioBlob.size > this.MAX_FILE_SIZE) {
			return {
				canUpload: false,
				message: `Audio file is too large (${sizeMB}MB). OpenAI Whisper has a 25MB limit.`,
				recommendation: "Try recording shorter segments (under 10 minutes) or use lower quality settings."
			};
		}
		
		if (audioBlob.size > this.RECOMMENDED_MAX_SIZE) {
			return {
				canUpload: true,
				message: `Audio file is large (${sizeMB}MB). This may take longer to process.`,
				recommendation: "For faster processing, consider shorter recordings."
			};
		}
		
		return { canUpload: true };
	}

	async transcribeWithChunking(audioBlob: Blob, maxChunkSize = 15 * 1024 * 1024): Promise<string> {
		const sizeMB = (audioBlob.size / (1024 * 1024)).toFixed(1);
		
		// If file is small enough, use regular transcription
		if (audioBlob.size <= maxChunkSize) {
			return this.transcribeAudio(audioBlob);
		}

		this.errorTracker?.captureMessage('Large file detected, chunking not yet implemented', 'warning', {
			function: 'transcribeWithChunking',
			fileSizeMB: sizeMB,
			maxChunkSizeMB: (maxChunkSize / (1024 * 1024)).toFixed(1)
		});

		// For now, try regular upload and let it fail with helpful message
		// TODO: Implement actual chunking by splitting audio file
		return this.transcribeAudio(audioBlob);
	}

	async transcribeAudio(audioBlob: Blob): Promise<string> {
		try {
			if (!this.apiKey) {
				const error = new Error('OpenAI API key not configured');
				this.errorTracker?.captureError(error, { 
					function: 'transcribeAudio',
					reason: 'missing_api_key' 
				});
				throw error;
			}

			// Pre-flight size check
			const sizeCheck = this.checkFileSize(audioBlob);
			const sizeMB = (audioBlob.size / (1024 * 1024)).toFixed(1);
			
			if (!sizeCheck.canUpload) {
				const error = new Error(`${sizeCheck.message}\n\n${sizeCheck.recommendation}`);
				this.errorTracker?.captureError(error, {
					function: 'transcribeAudio',
					reason: 'file_too_large',
					fileSizeMB: sizeMB,
					fileSizeBytes: audioBlob.size
				});
				throw error;
			}
			
			// Log warning for large files
			if (sizeCheck.message) {
				this.errorTracker?.captureMessage('Large file upload attempt', 'warning', {
					function: 'transcribeAudio',
					fileSizeMB: sizeMB,
					message: sizeCheck.message,
					recommendation: sizeCheck.recommendation
				});
			}

			const formData = new FormData();
			formData.append('file', audioBlob, 'recording.wav');
			formData.append('model', 'whisper-1');

			const response = await requestUrl({
				url: 'https://api.openai.com/v1/audio/transcriptions',
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.apiKey}`,
				},
				body: formData as any
			});

			if (!response.status || response.status < 200 || response.status >= 300) {
				const sizeMB = (audioBlob.size / (1024 * 1024)).toFixed(1);
				let errorMessage: string;
				
				// Handle specific HTTP status codes with helpful messages
				if (response.status === 413) {
					errorMessage = `Audio file is too large to transcribe (${sizeMB}MB).\n\nSolutions:\n• Record shorter segments (under 10 minutes)\n• Use lower quality settings in your browser\n• Break long recordings into smaller parts`;
				} else if (response.status === 400) {
					errorMessage = `Audio format not supported or file corrupted.\n\nTry:\n• Re-recording with different settings\n• Ensuring your microphone works properly`;
				} else if (response.status === 429) {
					errorMessage = `Rate limit exceeded. Please wait a moment before trying again.`;
				} else if (response.status >= 500) {
					errorMessage = `OpenAI service is temporarily unavailable (${response.status}).\n\nPlease try again in a few minutes.`;
				} else {
					errorMessage = `Transcription failed (${response.status})`;
				}
				
				const error = new Error(errorMessage);
				this.errorTracker?.captureError(error, {
					function: 'transcribeAudio',
					httpStatus: response.status,
					responseText: response.status?.toString() || 'Unknown',
					fileSizeMB: sizeMB,
					audioBlobSize: audioBlob.size,
					helpfulErrorHandling: true
				});
				throw error;
			}

			const result = response.json;
			
			// Log successful transcription
			this.errorTracker?.captureMessage('Audio transcription completed successfully', 'info', {
				function: 'transcribeAudio',
				audioBlobSize: audioBlob.size,
				transcriptLength: result.text?.length || 0
			});
			
			return result.text;
		} catch (error) {
			if (error instanceof Error) {
				// Only capture if not already captured above
				if (!error.message.includes('OpenAI API key') && !error.message.includes('Transcription failed')) {
					this.errorTracker?.captureError(error, {
						function: 'transcribeAudio',
						audioBlobSize: audioBlob.size,
						errorType: 'unexpected'
					});
				}
			}
			throw error;
		}
	}

	async generateSummary(transcript: string): Promise<string> {
		try {
			if (!this.apiKey) {
				const error = new Error('OpenAI API key not configured');
				this.errorTracker?.captureError(error, { 
					function: 'generateSummary',
					reason: 'missing_api_key' 
				});
				throw error;
			}

			// Handle very long transcripts by intelligent truncation
			let processedTranscript = transcript;
			const maxTokensForContext = 12000; // GPT-4o has ~128k context, be conservative
			const avgCharsPerToken = 4; // Rough estimate
			const maxCharsForContext = maxTokensForContext * avgCharsPerToken;
			
			if (transcript.length > maxCharsForContext) {
				// For very long transcripts, take a balanced sample
				const firstPart = transcript.substring(0, maxCharsForContext * 0.4);
				const lastPart = transcript.substring(transcript.length - maxCharsForContext * 0.4);
				const middlePart = transcript.substring(
					Math.floor(transcript.length * 0.4), 
					Math.floor(transcript.length * 0.6)
				).substring(0, maxCharsForContext * 0.2);
				
				processedTranscript = `${firstPart}\n\n[...MIDDLE SECTION SUMMARY...]\n${middlePart}\n\n[...CONTINUED...]\n${lastPart}`;
				
				this.errorTracker?.captureMessage('Long transcript truncated for summary', 'warning', {
					function: 'generateSummary',
					originalLength: transcript.length,
					processedLength: processedTranscript.length,
					truncationRatio: (processedTranscript.length / transcript.length).toFixed(2)
				});
			}

			const response = await requestUrl({
				url: 'https://api.openai.com/v1/chat/completions',
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					model: 'gpt-4o',
					messages: [{
						role: 'user',
						content: `${this.customSummaryPrompt}

**Transcript:**
${processedTranscript}`
					}],
					max_tokens: 2000, // Increased from 800 to allow for comprehensive summaries
					temperature: 0.3
				})
			});

			if (!response.status || response.status < 200 || response.status >= 300) {
				const error = new Error(`Summary generation failed: ${response.status}`);
				this.errorTracker?.captureError(error, {
					function: 'generateSummary',
					httpStatus: response.status,
					responseText: response.status?.toString() || 'Unknown',
					transcriptLength: transcript.length
				});
				throw error;
			}

			const result = response.json;
			
			// Log successful summary generation
			this.errorTracker?.captureMessage('AI summary generated successfully', 'info', {
				function: 'generateSummary',
				originalTranscriptLength: transcript.length,
				processedTranscriptLength: processedTranscript.length,
				summaryLength: result.choices[0].message.content?.length || 0,
				wasTruncated: transcript.length !== processedTranscript.length
			});
			
			return result.choices[0].message.content;
		} catch (error) {
			if (error instanceof Error) {
				// Only capture if not already captured above
				if (!error.message.includes('OpenAI API key') && !error.message.includes('Summary generation failed')) {
					this.errorTracker?.captureError(error, {
						function: 'generateSummary',
						transcriptLength: transcript.length,
						errorType: 'unexpected'
					});
				}
			}
			throw error;
		}
	}

	async generateTopic(transcript: string): Promise<string> {
		try {
			if (!this.apiKey) {
				const error = new Error('OpenAI API key not configured');
				this.errorTracker?.captureError(error, { 
					function: 'generateTopic',
					reason: 'missing_api_key' 
				});
				throw error;
			}

			const response = await requestUrl({
				url: 'https://api.openai.com/v1/chat/completions',
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					model: 'gpt-4o',
					messages: [{
						role: 'user',
						content: `Based on this voice recording transcript, provide a very short 2-word topic summary that captures the main subject discussed. Use the same language as the transcript.

Examples: "Project Planning", "Team Meeting", "Client Call", "Budget Review"

**Transcript:**
${transcript}`
					}],
					max_tokens: 10,
					temperature: 0.1
				})
			});

			if (!response.status || response.status < 200 || response.status >= 300) {
				const error = new Error(`Topic generation failed: ${response.status}`);
				this.errorTracker?.captureError(error, {
					function: 'generateTopic',
					httpStatus: response.status,
					responseText: response.status?.toString() || 'Unknown',
					transcriptLength: transcript.length
				});
				throw error;
			}

			const result = response.json;
			const topic = result.choices[0].message.content.trim();
			const cleanTopic = topic.replace(/^["']|["']$/g, '');
			
			// Log successful topic generation
			this.errorTracker?.captureMessage('Topic generated successfully', 'info', {
				function: 'generateTopic',
				transcriptLength: transcript.length,
				generatedTopic: cleanTopic
			});
			
			return cleanTopic;
		} catch (error) {
			if (error instanceof Error) {
				// Only capture if not already captured above
				if (!error.message.includes('OpenAI API key') && !error.message.includes('Topic generation failed')) {
					this.errorTracker?.captureError(error, {
						function: 'generateTopic',
						transcriptLength: transcript.length,
						errorType: 'unexpected'
					});
				}
			}
			throw error;
		}
	}
}
