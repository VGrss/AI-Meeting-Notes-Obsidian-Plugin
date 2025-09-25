/**
 * Configuration globale pour l'architecture multi-providers
 * 
 * Ce fichier contient les flags de fonctionnalités et la configuration
 * pour l'architecture multi-providers (cloud + local).
 */

// Flag principal pour activer/désactiver l'architecture multi-providers
export const enableMultiProviders = true;

// Configuration des providers disponibles
export const PROVIDERS = {
  OPENAI: 'openai',
  LOCAL_WHISPER: 'local-whisper',
  LOCAL_WHISPER_CPP: 'local-whisper-cpp',
  LOCAL_FASTER_WHISPER: 'local-faster-whisper',
} as const;

// Provider par défaut (pour assurer la non-régression)
export const DEFAULT_PROVIDER = PROVIDERS.OPENAI;

// Configuration des chemins pour les providers locaux
export const LOCAL_PROVIDER_CONFIG = {
  // Chemin vers l'exécutable Whisper local
  whisperPath: '',
  // Chemin vers l'exécutable Whisper.cpp
  whisperCppPath: '',
  // Configuration du modèle local
  modelPath: '',
  // Configuration du GPU/CPU
  device: 'auto' as 'auto' | 'cpu' | 'cuda',
} as const;

// Logging configuration
export const LOGGING = {
  enableDebugLogs: true,
  enableProviderLogs: true,
} as const;

