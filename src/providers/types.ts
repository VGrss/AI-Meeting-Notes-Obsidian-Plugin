/**
 * Types et interfaces pour le système de providers
 * Architecture modulaire pour gérer différents providers de transcription et résumé
 */

/**
 * État de santé d'un provider
 */
export interface ProviderHealth {
  /** Indique si le provider fonctionne correctement */
  ok: boolean;
  /** Détails optionnels sur l'état (message d'erreur, version, etc.) */
  details?: string;
  /** Version du provider si disponible */
  version?: string;
  /** Capacités du provider */
  capabilities?: string[];
}

/**
 * Options pour la transcription
 */
export interface TranscriptionOptions {
  /** Langue du contenu audio (code ISO 639-1) */
  language?: string;
  /** Modèle à utiliser pour la transcription */
  model?: string;
  /** Format de sortie souhaité */
  format?: 'json' | 'text' | 'vtt' | 'srt';
  /** Indicateur de température pour l'IA */
  temperature?: number;
  /** Autres options spécifiques au provider */
  [key: string]: any;
}

/**
 * Résultat de la transcription
 */
export interface TranscriptionResult {
  /** Texte transcrit */
  text: string;
  /** Langue détectée (code ISO 639-1) */
  lang?: string;
  /** Segments temporels avec timestamps */
  segments?: TranscriptionSegment[];
  /** Métadonnées additionnelles */
  metadata?: {
    duration?: number;
    confidence?: number;
    model?: string;
    processingTime?: number;
    [key: string]: any;
  };
}

/**
 * Segment de transcription avec timing
 */
export interface TranscriptionSegment {
  /** Texte du segment */
  text: string;
  /** Timestamp de début (en secondes) */
  start: number;
  /** Timestamp de fin (en secondes) */
  end: number;
  /** Niveau de confiance (0-1) */
  confidence?: number;
}

/**
 * Options pour la génération de résumé
 */
export interface SummarizationOptions {
  /** Longueur maximale du résumé (en tokens ou caractères) */
  maxLength?: number;
  /** Style de résumé souhaité */
  style?: 'brief' | 'detailed' | 'bullet_points' | 'narrative';
  /** Langue du résumé (si différente du texte source) */
  language?: string;
  /** Points clés spécifiques à extraire */
  focusPoints?: string[];
  /** Prompt personnalisé */
  customPrompt?: string;
  /** Autres options spécifiques au provider */
  [key: string]: any;
}

/**
 * Résultat de la génération de résumé
 */
export interface SummarizationResult {
  /** Texte du résumé */
  summary: string;
  /** Nombre de tokens utilisés */
  tokens?: number;
  /** Métadonnées additionnelles */
  metadata?: {
    originalLength?: number;
    compressionRatio?: number;
    model?: string;
    processingTime?: number;
    [key: string]: any;
  };
}

/**
 * Interface pour un provider de transcription audio
 */
export interface TranscriberProvider {
  /** Identifiant unique du provider */
  id: string;
  /** Nom affiché du provider */
  name: string;
  /** Type de provider (cloud ou local) */
  type: 'cloud' | 'local';
  
  /**
   * Vérifie la santé du provider
   * @returns Promise avec l'état de santé
   */
  check(): Promise<ProviderHealth>;
  
  /**
   * Transcrit un fichier audio en texte
   * @param audioPath Chemin vers le fichier audio
   * @param opts Options optionnelles (langue, modèle, etc.)
   * @returns Promise avec le texte transcrit et métadonnées
   */
  transcribe(
    audioPath: string, 
    opts?: TranscriptionOptions
  ): Promise<TranscriptionResult>;
}

/**
 * Interface pour un provider de résumé de texte
 */
export interface SummarizerProvider {
  /** Identifiant unique du provider */
  id: string;
  /** Nom affiché du provider */
  name: string;
  /** Type de provider (cloud ou local) */
  type: 'cloud' | 'local';
  
  /**
   * Vérifie la santé du provider
   * @returns Promise avec l'état de santé
   */
  check(): Promise<ProviderHealth>;
  
  /**
   * Génère un résumé d'un texte
   * @param text Texte à résumer
   * @param opts Options optionnelles (longueur, style, etc.)
   * @returns Promise avec le résumé et métadonnées
   */
  summarize(
    text: string, 
    opts?: SummarizationOptions
  ): Promise<SummarizationResult>;
}

/**
 * Type union pour tous les providers
 */
export type Provider = TranscriberProvider | SummarizerProvider;

/**
 * Type pour identifier le type de provider
 */
export type ProviderType = 'transcriber' | 'summarizer';

/**
 * Configuration d'un provider
 */
export interface ProviderConfig {
  /** Type de provider */
  type: ProviderType;
  /** Identifiant du provider */
  id: string;
  /** Configuration spécifique au provider */
  config: Record<string, any>;
  /** Indique si le provider est activé */
  enabled?: boolean;
}