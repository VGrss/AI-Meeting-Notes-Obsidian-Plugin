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

export class WhisperCppTranscriber implements TranscriberProvider {
  id = 'whispercpp';
  name = 'Whisper.cpp (Local)';
  type = 'local' as const;

  private binaryPath: string;
  private modelPath: string;
  private extraArgs: string[];

  constructor(config: {
    binaryPath: string;
    modelPath: string;
    extraArgs?: string[];
  }) {
    this.binaryPath = config.binaryPath;
    this.modelPath = config.modelPath;
    this.extraArgs = config.extraArgs || [];
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
      // Pour l'instant, on ne supporte que les fichiers locaux
      if (typeof audioInput !== 'string') {
        throw ProviderError.unsupportedFormat(
          'Blob audio',
          this.id
        );
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
