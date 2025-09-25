/**
 * Service de conversion audio pour la compatibilité avec les providers locaux
 * Convertit les Blob audio en formats supportés par Whisper.cpp et autres providers
 */

import { Notice } from 'obsidian';
import { TrackingService } from './TrackingService';

export interface AudioConversionOptions {
  /** Format de sortie souhaité */
  outputFormat?: 'wav' | 'mp3' | 'ogg' | 'flac';
  /** Qualité audio (1-10, 10 = meilleure qualité) */
  quality?: number;
  /** Taux d'échantillonnage de sortie */
  sampleRate?: number;
  /** Nombre de canaux (1 = mono, 2 = stéréo) */
  channels?: number;
}

export interface AudioConversionResult {
  /** Chemin vers le fichier audio converti */
  filePath: string;
  /** Format de sortie effectif */
  format: string;
  /** Taille du fichier en bytes */
  size: number;
  /** Durée en secondes */
  duration?: number;
  /** Métadonnées additionnelles */
  metadata?: {
    originalFormat: string;
    originalSize: number;
    conversionTime: number;
  };
}

export class AudioConversionService {
  private static instance: AudioConversionService;
  private trackingService: TrackingService;
  private tempDir: string;

  // Formats supportés par les providers locaux
  private readonly SUPPORTED_FORMATS = ['wav', 'mp3', 'ogg', 'flac'] as const;
  
  // Formats préférés par provider
  private readonly PROVIDER_FORMATS = {
    whispercpp: 'wav',
    fasterwhisper: 'wav',
    default: 'wav'
  } as const;

  constructor() {
    this.trackingService = TrackingService.getInstance();
    this.tempDir = this.getTempDirectory();
  }

  static getInstance(): AudioConversionService {
    if (!AudioConversionService.instance) {
      AudioConversionService.instance = new AudioConversionService();
    }
    return AudioConversionService.instance;
  }

  /**
   * Obtient le répertoire temporaire pour les conversions
   */
  private getTempDirectory(): string {
    // Dans Electron, utiliser le répertoire temporaire de l'OS
    if (typeof window !== 'undefined' && (window as any).require) {
      const { app } = (window as any).require('electron');
      return app.getPath('temp');
    }
    
    // Fallback pour les environnements de test
    return '/tmp';
  }

  /**
   * Convertit un Blob audio en fichier supporté par les providers locaux
   */
  async convertBlobToFile(
    audioBlob: Blob, 
    providerId: string,
    options: AudioConversionOptions = {}
  ): Promise<AudioConversionResult> {
    const startTime = Date.now();
    
    try {
      // Déterminer le format de sortie optimal
      const outputFormat = this.getOptimalFormat(providerId, audioBlob.type, options.outputFormat);
      
      console.log('🔄 Début de la conversion audio:', {
        function: 'AudioConversionService.convertBlobToFile',
        providerId,
        originalFormat: audioBlob.type,
        targetFormat: outputFormat,
        originalSize: audioBlob.size
      });

      // Tracking du début de conversion
      this.trackingService.trackAudioConversionStart(providerId, {
        originalFormat: audioBlob.type,
        targetFormat: outputFormat,
        originalSize: audioBlob.size
      });

      // Générer un nom de fichier unique
      const fileName = this.generateUniqueFileName(outputFormat);
      const filePath = `${this.tempDir}/${fileName}`;

      // Conversion selon le format source
      let convertedData: ArrayBuffer;
      
      if (audioBlob.type.includes('webm') || audioBlob.type.includes('opus')) {
        // Conversion WebM/Opus vers WAV
        convertedData = await this.convertWebmToWav(audioBlob, options);
      } else if (audioBlob.type.includes('mp4') || audioBlob.type.includes('aac')) {
        // Conversion MP4/AAC vers WAV
        convertedData = await this.convertMp4ToWav(audioBlob, options);
      } else {
        // Format non reconnu, essayer une conversion générique
        convertedData = await this.convertGenericToWav(audioBlob, options);
      }

      // Écrire le fichier sur disque
      await this.writeFileToDisk(filePath, convertedData);

      const conversionTime = Date.now() - startTime;
      const result: AudioConversionResult = {
        filePath,
        format: outputFormat,
        size: convertedData.byteLength,
        metadata: {
          originalFormat: audioBlob.type,
          originalSize: audioBlob.size,
          conversionTime
        }
      };

      console.log('✅ Conversion audio terminée:', {
        function: 'AudioConversionService.convertBlobToFile',
        result: {
          filePath: result.filePath,
          format: result.format,
          size: result.size,
          conversionTime
        }
      });

      // Tracking de la conversion réussie
      this.trackingService.trackAudioConversionSuccess(providerId, result);

      return result;

    } catch (error) {
      const conversionTime = Date.now() - startTime;
      
      console.error('❌ Erreur lors de la conversion audio:', {
        function: 'AudioConversionService.convertBlobToFile',
        providerId,
        originalFormat: audioBlob.type,
        error: error,
        conversionTime
      });

      // Tracking de l'erreur de conversion
      this.trackingService.trackAudioConversionError(error as Error, {
        providerId,
        originalFormat: audioBlob.type,
        conversionTime
      });

      throw new Error(`Échec de la conversion audio: ${error.message}`);
    }
  }

  /**
   * Détermine le format optimal pour un provider donné
   */
  private getOptimalFormat(
    providerId: string, 
    originalFormat: string, 
    requestedFormat?: string
  ): string {
    // Si un format est explicitement demandé et supporté
    if (requestedFormat && this.SUPPORTED_FORMATS.includes(requestedFormat as any)) {
      return requestedFormat;
    }

    // Format préféré par le provider
    const providerFormat = this.PROVIDER_FORMATS[providerId as keyof typeof this.PROVIDER_FORMATS] || 
                          this.PROVIDER_FORMATS.default;

    return providerFormat;
  }

  /**
   * Convertit WebM/Opus vers WAV
   */
  private async convertWebmToWav(audioBlob: Blob, options: AudioConversionOptions): Promise<ArrayBuffer> {
    try {
      // Dans un environnement Electron, nous devons utiliser des outils de conversion
      // Pour l'instant, nous allons implémenter une conversion basique
      
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // TODO: Implémenter la conversion WebM vers WAV
      // Pour l'instant, retourner les données brutes
      // Dans une implémentation complète, on utiliserait FFmpeg ou une librairie de conversion
      
      console.warn('Conversion WebM vers WAV non encore implémentée, utilisation des données brutes');
      
      return arrayBuffer;
      
    } catch (error) {
      throw new Error(`Erreur lors de la conversion WebM vers WAV: ${error.message}`);
    }
  }

  /**
   * Convertit MP4/AAC vers WAV
   */
  private async convertMp4ToWav(audioBlob: Blob, options: AudioConversionOptions): Promise<ArrayBuffer> {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // TODO: Implémenter la conversion MP4 vers WAV
      console.warn('Conversion MP4 vers WAV non encore implémentée, utilisation des données brutes');
      
      return arrayBuffer;
      
    } catch (error) {
      throw new Error(`Erreur lors de la conversion MP4 vers WAV: ${error.message}`);
    }
  }

  /**
   * Conversion générique vers WAV
   */
  private async convertGenericToWav(audioBlob: Blob, options: AudioConversionOptions): Promise<ArrayBuffer> {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // TODO: Implémenter une conversion générique
      console.warn('Conversion générique vers WAV non encore implémentée, utilisation des données brutes');
      
      return arrayBuffer;
      
    } catch (error) {
      throw new Error(`Erreur lors de la conversion générique vers WAV: ${error.message}`);
    }
  }

  /**
   * Écrit les données audio sur disque
   */
  private async writeFileToDisk(filePath: string, data: ArrayBuffer): Promise<void> {
    try {
      // Dans Electron, utiliser l'API Node.js
      if (typeof window !== 'undefined' && (window as any).require) {
        const fs = (window as any).require('fs').promises;
        const buffer = Buffer.from(data);
        await fs.writeFile(filePath, buffer);
      } else {
        throw new Error('Environnement non supporté pour l\'écriture de fichiers');
      }
    } catch (error) {
      throw new Error(`Erreur lors de l'écriture du fichier: ${error.message}`);
    }
  }

  /**
   * Génère un nom de fichier unique
   */
  private generateUniqueFileName(format: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `audio_${timestamp}_${random}.${format}`;
  }

  /**
   * Nettoie les fichiers temporaires
   */
  async cleanupTempFiles(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && (window as any).require) {
        const fs = (window as any).require('fs').promises;
        const path = (window as any).require('path');
        
        const files = await fs.readdir(this.tempDir);
        const audioFiles = files.filter((file: string) => 
          file.startsWith('audio_') && 
          (file.endsWith('.wav') || file.endsWith('.mp3') || file.endsWith('.ogg') || file.endsWith('.flac'))
        );

        for (const file of audioFiles) {
          const filePath = path.join(this.tempDir, file);
          try {
            await fs.unlink(filePath);
          } catch (error) {
            console.warn(`Impossible de supprimer le fichier temporaire ${file}:`, error);
          }
        }

        console.log(`🧹 Nettoyage terminé: ${audioFiles.length} fichiers temporaires supprimés`);
      }
    } catch (error) {
      console.warn('Erreur lors du nettoyage des fichiers temporaires:', error);
    }
  }

  /**
   * Vérifie si un format audio est supporté
   */
  isFormatSupported(format: string): boolean {
    return this.SUPPORTED_FORMATS.includes(format as any);
  }

  /**
   * Obtient les formats supportés
   */
  getSupportedFormats(): readonly string[] {
    return this.SUPPORTED_FORMATS;
  }
}
