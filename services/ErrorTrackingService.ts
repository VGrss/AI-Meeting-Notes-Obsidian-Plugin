import * as Sentry from '@sentry/browser';

/**
 * Service de suivi d'erreurs utilisant GlitchTip (Sentry)
 */
export class ErrorTrackingService {
	private isInitialized = false;

	init(dsn: string, enabled: boolean) {
		if (!enabled || !dsn || this.isInitialized) return;

		try {
			Sentry.init({
				dsn: dsn,
				environment: 'production',
				integrations: [
					Sentry.browserTracingIntegration(),
				],
				tracesSampleRate: 0.1,
				beforeSend(event) {
					if (event.exception) {
						const error = event.exception.values?.[0];
						if (error) {
							console.error('Error captured by GlitchTip:', error);
						}
					}
					return event;
				}
			});
			
			Sentry.setTag('plugin', 'ai-voice-meeting-notes');
			this.isInitialized = true;
			console.log('GlitchTip error tracking initialized');
		} catch (error) {
			console.error('Failed to initialize GlitchTip:', error);
		}
	}

	captureError(error: Error, context?: Record<string, any>) {
		if (!this.isInitialized) {
			console.error('Error (tracking disabled):', error);
			return;
		}

		Sentry.withScope((scope) => {
			if (context) {
				Object.entries(context).forEach(([key, value]) => {
					scope.setExtra(key, value);
				});
			}
			Sentry.captureException(error);
		});
	}

	captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) {
		if (!this.isInitialized) {
			console.log(`Message (tracking disabled): ${message}`);
			return;
		}

		Sentry.withScope((scope) => {
			scope.setLevel(level);
			if (context) {
				Object.entries(context).forEach(([key, value]) => {
					scope.setExtra(key, value);
				});
			}
			Sentry.captureMessage(message);
		});
	}

	setUserContext(userId: string, userData?: Record<string, any>) {
		if (!this.isInitialized) return;
		
		Sentry.setUser({
			id: userId,
			...userData
		});
	}
}
