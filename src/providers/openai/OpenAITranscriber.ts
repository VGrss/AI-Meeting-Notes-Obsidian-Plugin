/**
 * Provider de transcription OpenAI Whisper
 * Adapté du code existant dans OpenAIService
 */

import {
  TranscriberProvider,
  ProviderHealth,
  TranscriptionOptions,
  TranscriptionResult,
  TranscriptionSegment,
} from '../types';
import { ProviderError, ProviderErrorCode } from '../errors';

export class OpenAITranscriber implements TranscriberProvider {
  id = 'openai-whisper';
  name = 'OpenAI Whisper';
  type = 'cloud' as const;

  private apiKey: string;

  // OpenAI Whisper limits: 25MB max file size
  private readonly MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes
  private readonly RECOMMENDED_MAX_SIZE = 20 * 1024 * 1024; // 20MB recommended limit

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async check(): Promise<ProviderHealth> {
    if (!this.apiKey) {
      return {
        ok: false,
        details: 'Clé API OpenAI manquante',
      };
    }

    try {
      // Test de connexion simple en listant les modèles
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          return {
            ok: false,
            details: 'Clé API OpenAI invalide',
          };
        }
        return {
          ok: false,
          details: `Erreur de connexion: ${response.status} ${response.statusText}`,
        };
      }

      return {
        ok: true,
        details: 'OpenAI Whisper disponible',
        capabilities: ['transcription', 'multi-language', 'segments'],
      };
    } catch (error) {
      return {
        ok: false,
        details: `Erreur de connexion: ${error.message}`,
      };
    }
  }

  async transcribe(audioPath: string, opts?: TranscriptionOptions): Promise<TranscriptionResult> {
    try {
      if (!this.apiKey) {
        throw ProviderError.authInvalid(this.id, 'Clé API OpenAI requise');
      }

      // Pour l'instant, on assume que audioPath est un Blob ou File
      // Dans un vrai cas d'usage, il faudrait gérer les fichiers locaux
      const audioBlob = audioPath as any; // TODO: Adapter selon le type réel

      // Pre-flight size check
      const sizeCheck = this.checkFileSize(audioBlob);
      const sizeMB = (audioBlob.size / (1024 * 1024)).toFixed(1);
      
      if (!sizeCheck.canUpload) {
        throw ProviderError.fileNotFound(
          `Fichier audio trop volumineux (${sizeMB}MB)`,
          this.id
        );
      }
      
      // Log warning for large files
      if (sizeCheck.message) {
        console.warn('Large file upload attempt:', {
          function: 'OpenAITranscriber.transcribe',
          fileSizeMB: sizeMB,
          message: sizeCheck.message,
          recommendation: sizeCheck.recommendation
        });
      }

      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.wav');
      formData.append('model', 'whisper-1');

      // Ajouter les options si spécifiées
      if (opts?.language) {
        formData.append('language', opts.language);
      }

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData
      });

      if (!response.ok) {
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
          errorMessage = `Transcription failed (${response.status}): ${response.statusText}`;
        }
        
        throw new ProviderError(
          ProviderErrorCode.PROCESSING_FAILED,
          errorMessage,
          {
            providerId: this.id,
            metadata: {
              httpStatus: response.status,
              responseText: response.statusText,
              fileSizeMB: sizeMB,
            }
          }
        );
      }

      const result = await response.json();
      
      // Log successful transcription
      console.log('Audio transcription completed successfully:', {
        function: 'OpenAITranscriber.transcribe',
        audioBlobSize: audioBlob.size,
        transcriptLength: result.text?.length || 0
      });
      
      return {
        text: result.text,
        lang: result.language,
        segments: result.segments?.map((seg: any) => ({
          text: seg.text,
          start: seg.start,
          end: seg.end,
          confidence: seg.avg_logprob,
        })) || [],
        metadata: {
          duration: result.duration,
          model: 'whisper-1',
          processingTime: Date.now(), // Approximation
        }
      };
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }
      
      console.error('Unexpected error in transcription:', {
        function: 'OpenAITranscriber.transcribe',
        audioPath,
        errorType: 'unexpected',
        error: error
      });
      
      throw ProviderError.processingFailed(
        'Transcription OpenAI',
        this.id,
        error as Error
      );
    }
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
}

