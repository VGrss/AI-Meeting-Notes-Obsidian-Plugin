/**
 * Provider de transcription FasterWhisper local
 * Implémentation pour l'exécution locale de FasterWhisper via Python
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

export class FasterWhisperTranscriber implements TranscriberProvider {
  id = 'fasterwhisper';
  name = 'FasterWhisper (Local)';
  type = 'local' as const;

  private pythonPath: string;
  private modelName: string;
  private audioConversionService: AudioConversionService;

  constructor(config: {
    pythonPath: string;
    modelName: string;
  }) {
    this.pythonPath = config.pythonPath;
    this.modelName = config.modelName;
    this.audioConversionService = AudioConversionService.getInstance();
  }

  async check(): Promise<ProviderHealth> {
    if (!this.pythonPath || !this.modelName) {
      return {
        ok: false,
        details: 'Configuration FasterWhisper manquante (pythonPath ou modelName)',
      };
    }

    // TODO: Implémenter la vérification de Python et des dépendances
    // 1. Vérifier que Python est accessible
    // 2. Vérifier que faster-whisper est installé
    // 3. Tester le chargement du modèle
    
    return {
      ok: true,
      details: 'FasterWhisper configuré (vérification complète non implémentée)',
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
        console.log('🔄 Conversion du Blob audio pour FasterWhisper...', {
          function: 'FasterWhisperTranscriber.transcribe',
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
          function: 'FasterWhisperTranscriber.transcribe',
          filePath: audioFilePath,
          format: conversionResult.format,
          size: conversionResult.size
        });
      }

      // TODO: Implémenter l'appel à FasterWhisper via Python
      // 1. Valider que le fichier audio existe
      // 2. Créer un script Python temporaire
      // 3. Exécuter le script avec subprocess
      // 4. Parser le résultat JSON
      // 5. Retourner le format standardisé

      throw ProviderError.processingFailed(
        'FasterWhisper transcription',
        this.id,
        new Error('Implémentation FasterWhisper non encore terminée')
      );

    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }
      
      console.error('Unexpected error in FasterWhisper transcription:', {
        function: 'FasterWhisperTranscriber.transcribe',
        audioInput,
        errorType: 'unexpected',
        error: error
      });
      
      throw ProviderError.processingFailed(
        'FasterWhisper transcription',
        this.id,
        error as Error
      );
    }
  }
}
