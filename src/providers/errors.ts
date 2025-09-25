/**
 * Erreurs standardisées pour le système de providers
 */

/**
 * Codes d'erreur standardisés pour les providers
 */
export enum ProviderErrorCode {
  // Erreurs de configuration
  CONFIG_INVALID = 'CONFIG_INVALID',
  CONFIG_MISSING = 'CONFIG_MISSING',
  
  // Erreurs de connexion
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  
  // Erreurs d'authentification
  AUTH_INVALID = 'AUTH_INVALID',
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  AUTH_MISSING = 'AUTH_MISSING',
  
  // Erreurs de quota/limites
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // Erreurs de fichiers
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_INVALID = 'FILE_INVALID',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  
  // Erreurs de traitement
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  UNSUPPORTED_LANGUAGE = 'UNSUPPORTED_LANGUAGE',
  
  // Erreurs internes
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  
  // Erreurs de registry
  PROVIDER_NOT_FOUND = 'PROVIDER_NOT_FOUND',
  PROVIDER_ALREADY_REGISTERED = 'PROVIDER_ALREADY_REGISTERED',
  INVALID_PROVIDER_TYPE = 'INVALID_PROVIDER_TYPE',
}

/**
 * Erreur standardisée pour les providers
 */
export class ProviderError extends Error {
  /** Code d'erreur standardisé */
  public readonly code: ProviderErrorCode;
  
  /** Indice ou suggestion pour résoudre l'erreur */
  public readonly hint?: string;
  
  /** Métadonnées additionnelles sur l'erreur */
  public readonly metadata?: Record<string, any>;
  
  /** Provider qui a généré l'erreur */
  public readonly providerId?: string;

  constructor(
    code: ProviderErrorCode,
    message: string,
    options: {
      hint?: string;
      metadata?: Record<string, any>;
      providerId?: string;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.hint = options.hint;
    this.metadata = options.metadata;
    this.providerId = options.providerId;
    
    // Préserve la stack trace originale si une cause est fournie
    if (options.cause && options.cause.stack) {
      this.stack = options.cause.stack;
    }
  }

  /**
   * Convertit l'erreur en objet JSON pour le logging
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      hint: this.hint,
      providerId: this.providerId,
      metadata: this.metadata,
      stack: this.stack,
    };
  }

  /**
   * Crée une erreur de configuration invalide
   */
  static configInvalid(message: string, hint?: string, metadata?: Record<string, any>): ProviderError {
    return new ProviderError(ProviderErrorCode.CONFIG_INVALID, message, { hint, metadata });
  }

  /**
   * Crée une erreur de configuration manquante
   */
  static configMissing(key: string, providerId?: string): ProviderError {
    return new ProviderError(
      ProviderErrorCode.CONFIG_MISSING,
      `Configuration manquante: ${key}`,
      {
        hint: `Vérifiez que la configuration pour '${key}' est définie`,
        metadata: { missingKey: key },
        providerId,
      }
    );
  }

  /**
   * Crée une erreur de connexion
   */
  static connectionFailed(providerId: string, cause?: Error): ProviderError {
    return new ProviderError(
      ProviderErrorCode.CONNECTION_FAILED,
      `Impossible de se connecter au provider ${providerId}`,
      {
        hint: 'Vérifiez votre connexion internet et la configuration du provider',
        providerId,
        cause,
      }
    );
  }

  /**
   * Crée une erreur d'authentification
   */
  static authInvalid(providerId: string, hint?: string): ProviderError {
    return new ProviderError(
      ProviderErrorCode.AUTH_INVALID,
      `Authentification invalide pour le provider ${providerId}`,
      {
        hint: hint || 'Vérifiez votre clé API ou vos identifiants',
        providerId,
      }
    );
  }

  /**
   * Crée une erreur de quota dépassé
   */
  static quotaExceeded(providerId: string, limit?: string): ProviderError {
    return new ProviderError(
      ProviderErrorCode.QUOTA_EXCEEDED,
      `Quota dépassé pour le provider ${providerId}`,
      {
        hint: limit ? `Limite: ${limit}. Attendez ou mettez à niveau votre plan.` : 'Votre quota mensuel est dépassé',
        providerId,
        metadata: { limit },
      }
    );
  }

  /**
   * Crée une erreur de fichier non trouvé
   */
  static fileNotFound(filePath: string, providerId?: string): ProviderError {
    return new ProviderError(
      ProviderErrorCode.FILE_NOT_FOUND,
      `Fichier non trouvé: ${filePath}`,
      {
        hint: 'Vérifiez que le fichier existe et que le chemin est correct',
        metadata: { filePath },
        providerId,
      }
    );
  }

  /**
   * Crée une erreur de format non supporté
   */
  static unsupportedFormat(format: string, providerId?: string): ProviderError {
    const supportedFormats = this.getSupportedFormatsForProvider(providerId);
    
    return new ProviderError(
      ProviderErrorCode.UNSUPPORTED_FORMAT,
      `Format non supporté: ${format}`,
      {
        hint: `Formats supportés par ${providerId || 'ce provider'}: ${supportedFormats.join(', ')}. Le service de conversion audio tentera de convertir automatiquement votre fichier.`,
        metadata: { 
          format,
          supportedFormats,
          conversionAvailable: true
        },
        providerId,
      }
    );
  }

  /**
   * Obtient les formats supportés pour un provider donné
   */
  private static getSupportedFormatsForProvider(providerId?: string): string[] {
    const formatMap: Record<string, string[]> = {
      'whispercpp': ['WAV', 'MP3', 'OGG', 'FLAC'],
      'fasterwhisper': ['WAV', 'MP3', 'OGG', 'FLAC'],
      'openai': ['MP3', 'MP4', 'M4A', 'WAV', 'WEBM', 'OGG'],
      'default': ['WAV', 'MP3', 'OGG', 'FLAC']
    };

    return formatMap[providerId || 'default'] || formatMap.default;
  }

  /**
   * Crée une erreur de provider non trouvé
   */
  static providerNotFound(providerId: string, type?: string): ProviderError {
    return new ProviderError(
      ProviderErrorCode.PROVIDER_NOT_FOUND,
      `Provider non trouvé: ${providerId}${type ? ` (type: ${type})` : ''}`,
      {
        hint: 'Vérifiez que le provider est bien enregistré et que l\'ID est correct',
        metadata: { providerId, type },
      }
    );
  }

  /**
   * Crée une erreur de traitement
   */
  static processingFailed(operation: string, providerId?: string, cause?: Error): ProviderError {
    return new ProviderError(
      ProviderErrorCode.PROCESSING_FAILED,
      `Échec du traitement: ${operation}`,
      {
        hint: 'Vérifiez les logs pour plus de détails sur l\'erreur',
        metadata: { operation },
        providerId,
        cause,
      }
    );
  }
}