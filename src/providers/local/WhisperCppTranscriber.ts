/**
 * Provider de transcription Whisper.cpp local
 * Implémentation pour l'exécution locale de Whisper
 */

import {
  TranscriberProvider,
  ProviderHealth,
  TranscriptionOptions,
  TranscriptionResult,
  TranscriptionSegment,
} from '../types';
import { ProviderError, ProviderErrorCode } from '../errors';
import { AudioConversionService } from '../../../services/AudioConversionService';

export class WhisperCppTranscriber implements TranscriberProvider {
  id = 'whispercpp';
  name = 'Whisper.cpp (Local)';
  type = 'local' as const;

  private binaryPath: string;
  private modelPath: string;
  private extraArgs: string[];
  private audioConversionService: AudioConversionService;

  constructor(config: {
    binaryPath: string;
    modelPath: string;
    extraArgs?: string[];
  }) {
    this.binaryPath = config.binaryPath;
    this.modelPath = config.modelPath;
    this.extraArgs = config.extraArgs || [];
    this.audioConversionService = AudioConversionService.getInstance();
  }

  async check(): Promise<ProviderHealth> {
    if (!this.binaryPath || !this.modelPath) {
      return {
        ok: false,
        details: 'Configuration WhisperCpp manquante (binaryPath ou modelPath)',
      };
    }

    // TODO: Implémenter la vérification de l'existence des fichiers
    // et la validation de l'exécutable WhisperCpp
    
    return {
      ok: true,
      details: 'WhisperCpp configuré (vérification complète non implémentée)',
      capabilities: ['transcription', 'multi-language', 'segments'],
    };
  }

  async transcribe(audioInput: string | Blob, opts?: TranscriptionOptions): Promise<TranscriptionResult> {
    try {
      let audioFilePath: string;

      // Gérer les deux types d'entrée : string (chemin fichier) ou Blob
      if (typeof audioInput === 'string') {
        audioFilePath = audioInput;
      } else {
        // Convertir le Blob en fichier supporté
        console.log('🔄 Conversion du Blob audio pour WhisperCpp...', {
          function: 'WhisperCppTranscriber.transcribe',
          originalType: audioInput.type,
          originalSize: audioInput.size
        });

        const conversionResult = await this.audioConversionService.convertBlobToFile(
          audioInput,
          this.id,
          {
            outputFormat: 'wav',
            quality: 8,
            sampleRate: 16000,
            channels: 1
          }
        );

        audioFilePath = conversionResult.filePath;
        
        console.log('✅ Conversion audio terminée:', {
          function: 'WhisperCppTranscriber.transcribe',
          filePath: audioFilePath,
          format: conversionResult.format,
          size: conversionResult.size
        });
      }

      // TODO: Implémenter l'appel à WhisperCpp
      // 1. Valider que le fichier audio existe
      // 2. Construire la commande WhisperCpp
      // 3. Exécuter la commande
      // 4. Parser le résultat JSON
      // 5. Retourner le format standardisé

      throw ProviderError.processingFailed(
        'WhisperCpp transcription',
        this.id,
        new Error('Implémentation WhisperCpp non encore terminée')
      );

    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }
      
      console.error('Unexpected error in WhisperCpp transcription:', {
        function: 'WhisperCppTranscriber.transcribe',
        audioInput,
        errorType: 'unexpected',
        error: error
      });
      
      throw ProviderError.processingFailed(
        'WhisperCpp transcription',
        this.id,
        error as Error
      );
    }
  }
}
