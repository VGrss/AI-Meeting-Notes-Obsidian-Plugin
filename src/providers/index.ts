/**
 * Point d'entrée principal pour le système de providers
 * Exporte tous les types, interfaces et fonctions publiques
 */

// Types et interfaces
export type {
  ProviderHealth,
  TranscriberProvider,
  SummarizerProvider,
  Provider,
  ProviderType,
  ProviderConfig,
  TranscriptionOptions,
  TranscriptionResult,
  TranscriptionSegment,
  SummarizationOptions,
  SummarizationResult,
} from './types';

// Erreurs
export {
  ProviderError,
  ProviderErrorCode,
} from './errors';

// Registry et factory
export {
  registerProvider,
  getTranscriberProvider,
  getSummarizerProvider,
  getAllProviders,
  getAllProvidersList,
  isProviderRegistered,
  unregisterProvider,
  clearRegistry,
  getProviderCount,
  getProviderIds,
  ProviderFactory,
} from './registry';