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
import { requestUrl } from 'obsidian';

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
      const response = await requestUrl({
        url: 'https://api.openai.com/v1/models',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.status || response.status < 200 || response.status >= 300) {
        if (response.status === 401) {
          return {
            ok: false,
            details: 'Clé API OpenAI invalide',
          };
        }
        return {
          ok: false,
          details: `Erreur de connexion: ${response.status}`,
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

  async transcribe(audioInput: string | Blob, opts?: TranscriptionOptions): Promise<TranscriptionResult> {
    try {
      if (!this.apiKey) {
        throw ProviderError.authInvalid(this.id, 'Clé API OpenAI requise');
      }

      // Gérer les deux types d'entrée : string (chemin fichier) ou Blob
      let audioBlob: Blob;
      
      if (typeof audioInput === 'string') {
        // TODO: Implémenter la lecture de fichier local
        throw ProviderError.fileNotFound(
          'Lecture de fichiers locaux non encore implémentée',
          this.id
        );
      } else {
        audioBlob = audioInput;
      }

      // Pre-flight size check
      const sizeCheck = this.checkFileSize(audioBlob);
      const sizeMB = (audioBlob.size / (1024 * 1024)).toFixed(1);
      
      if (!sizeCheck.canUpload) {
        throw ProviderError.fileNotFound(
          `Fichier audio trop volumineux (${sizeMB}MB)`,
          this.id
        );
      }

      // Validation du format audio
      if (!this.isValidAudioFormat(audioBlob)) {
        throw ProviderError.unsupportedFormat(
          audioBlob.type || 'unknown',
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
        
        throw new ProviderError(
          ProviderErrorCode.PROCESSING_FAILED,
          errorMessage,
          {
            providerId: this.id,
            metadata: {
              httpStatus: response.status,
              fileSizeMB: sizeMB,
            }
          }
        );
      }

      const result = response.json;
      
      // Log successful transcription
      console.log('Audio transcription completed successfully:', {
        function: 'OpenAITranscriber.transcribe',
        audioBlobSize: audioBlob.size,
        transcriptLength: result.text?.length || 0,
        mimeType: audioBlob.type
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
        audioInput,
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

  private isValidAudioFormat(audioBlob: Blob): boolean {
    // Formats supportés par OpenAI Whisper
    const supportedTypes = [
      'audio/mpeg',           // MP3
      'audio/mp4',            // MP4/AAC
      'audio/mp3',            // MP3
      'audio/wav',            // WAV
      'audio/x-wav',          // WAV
      'audio/webm',           // WebM
      'audio/ogg',            // OGG
      'audio/flac',           // FLAC
      'audio/m4a',            // M4A
      'audio/x-m4a',          // M4A
    ];

    // Vérifier le type MIME
    if (supportedTypes.includes(audioBlob.type)) {
      return true;
    }

    // Vérifier si c'est un type générique audio
    if (audioBlob.type.startsWith('audio/')) {
      console.warn('Audio format may not be optimal for OpenAI Whisper:', {
        function: 'OpenAITranscriber.isValidAudioFormat',
        mimeType: audioBlob.type,
        recommendation: 'Consider using MP3, WAV, or WebM format'
      });
      return true; // Permettre mais avertir
    }

    return false;
  }
}

