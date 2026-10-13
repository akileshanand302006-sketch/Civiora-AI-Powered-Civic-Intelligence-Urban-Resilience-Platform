// ============================================================
// Civiora Accurate Device Geolocation & GPS Signal Engine
// W3C Geolocation API + Multi-Tier Signal Recovery + Noise Filtering
// Accuracy-Aware Classification + Explicit Status & Error Pipeline
// ============================================================

export type LocationAcquisitionStatus =
  | 'idle'
  | 'requesting'
  | 'acquired'
  | 'resolving_address'
  | 'confirmed'
  | 'permission_denied'
  | 'timeout'
  | 'unavailable'
  | 'error';

export type AccuracyConfidence = 'high' | 'approximate' | 'low' | 'unavailable';

export interface ValidatedCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  accuracyConfidence: AccuracyConfidence;
  timestamp: string;
  heading?: number | null;
  speed?: number | null;
  source: 'CURRENT_GPS' | 'NETWORK_TRIANGULATION';
}

export type GeolocationErrorType =
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'INSECURE_CONTEXT'
  | 'UNSUPPORTED'
  | 'INVALID_COORDINATES'
  | 'UNKNOWN';

export class GeolocationServiceError extends Error {
  public readonly type: GeolocationErrorType;
  public readonly userMessage: string;
  public readonly canRetry: boolean;

  constructor(type: GeolocationErrorType, userMessage: string, canRetry: boolean = true) {
    super(userMessage);
    this.name = 'GeolocationServiceError';
    this.type = type;
    this.userMessage = userMessage;
    this.canRetry = canRetry;
  }
}

/**
 * Classify reported horizontal accuracy into civic operational confidence
 * Guidelines:
 * - 0–20m: High Confidence (Hardware GNSS/GPS lock)
 * - 20–50m: Approximate (Wi-Fi beacon triangulation)
 * - >50m: Low Confidence (Cellular tower or network centroid)
 */
export function classifyAccuracy(accuracyMeters?: number): AccuracyConfidence {
  if (accuracyMeters === undefined || accuracyMeters === null || accuracyMeters <= 0) {
    return 'unavailable';
  }
  if (accuracyMeters <= 20) return 'high';
  if (accuracyMeters <= 50) return 'approximate';
  return 'low';
}

/**
 * Rigorously validate coordinate plausibility and range
 */
export function validateCoordinates(lat: number, lng: number, accuracy?: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  if (accuracy !== undefined && (!Number.isFinite(accuracy) || accuracy < 0)) return false;
  return true;
}

/**
 * Acquire fresh device geolocation position using high-accuracy W3C API
 * Supports multi-tier failover (Satellite GPS -> Standard Wi-Fi triangulation)
 * NEVER silently substitutes hardcoded fallback coordinates
 */
export async function acquireDevicePosition(
  options?: Partial<PositionOptions>
): Promise<ValidatedCoordinates> {
  // 1. Verify Browser Support
  if (typeof window === 'undefined' || !navigator?.geolocation) {
    throw new GeolocationServiceError(
      'UNSUPPORTED',
      'Geolocation is not supported by your current browser. Please pick your location on Google Maps.',
      false
    );
  }

  // 2. Verify Secure Context (Required by browser security policies for Geolocation)
  if (window.isSecureContext === false && window.location.hostname !== 'localhost') {
    throw new GeolocationServiceError(
      'INSECURE_CONTEXT',
      'Geolocation requires a secure HTTPS connection. Please use HTTPS or select your location on Google Maps.',
      false
    );
  }

  // ── Tier 1: Fresh High-Accuracy Positioning (GNSS / Satellite) ─────────
  const highAccuracyOptions: PositionOptions = {
    enableHighAccuracy: true,
    maximumAge: 0, // Demand fresh position, no stale cache
    timeout: options?.timeout ?? 14000, // 14 seconds for realistic satellite lock
  };

  try {
    const pos = await requestPositionPromise(highAccuracyOptions);
    return processRawPosition(pos, 'CURRENT_GPS');
  } catch (err: any) {
    // If permission was explicitly denied, fail immediately with clear instructions
    if (err.code === 1 || err.type === 'PERMISSION_DENIED') {
      throw new GeolocationServiceError(
        'PERMISSION_DENIED',
        'Location access was denied. Please allow location permissions in your browser address bar and try again.',
        true
      );
    }

    console.warn('[Civiora GPS Engine] High-accuracy satellite acquisition note:', err.message || err);

    // ── Tier 2: Resilient Standard Accuracy (Wi-Fi Triangulation) ─────────
    try {
      const fallbackOptions: PositionOptions = {
        enableHighAccuracy: false,
        maximumAge: 5000, // Up to 5s recent cache
        timeout: 7000,
      };

      const pos = await requestPositionPromise(fallbackOptions);
      return processRawPosition(pos, 'NETWORK_TRIANGULATION');
    } catch (fallbackErr: any) {
      if (fallbackErr.code === 1) {
        throw new GeolocationServiceError(
          'PERMISSION_DENIED',
          'Location access was denied. Please allow location permissions in your browser address bar and try again.',
          true
        );
      }

      if (fallbackErr.code === 3 || err.code === 3) {
        throw new GeolocationServiceError(
          'TIMEOUT',
          'GPS acquisition timed out while waiting for a satellite fix. Please retry or select your location on Google Maps.',
          true
        );
      }

      if (fallbackErr.code === 2 || err.code === 2) {
        throw new GeolocationServiceError(
          'POSITION_UNAVAILABLE',
          'Device location is currently unavailable. Please check that device location services are enabled.',
          true
        );
      }

      throw new GeolocationServiceError(
        'UNKNOWN',
        fallbackErr.message || err.message || 'Unable to retrieve your current location. Please select on Google Maps.',
        true
      );
    }
  }
}

/**
 * Promisified wrapper for navigator.geolocation.getCurrentPosition
 */
function requestPositionPromise(opts: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      (err) => reject(err),
      opts
    );
  });
}

/**
 * Process raw GeolocationPosition and validate coordinates
 */
function processRawPosition(
  pos: GeolocationPosition,
  source: 'CURRENT_GPS' | 'NETWORK_TRIANGULATION'
): ValidatedCoordinates {
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  const rawAccuracy = pos.coords.accuracy;

  if (!validateCoordinates(lat, lng, rawAccuracy)) {
    throw new GeolocationServiceError(
      'INVALID_COORDINATES',
      'Device returned invalid or out-of-range coordinates.',
      true
    );
  }

  const accuracy = Math.round(rawAccuracy);
  const accuracyConfidence = classifyAccuracy(accuracy);

  return {
    latitude: lat,
    longitude: lng,
    accuracy,
    accuracyConfidence,
    timestamp: new Date(pos.timestamp || Date.now()).toISOString(),
    heading: pos.coords.heading ?? null,
    speed: pos.coords.speed ?? null,
    source,
  };
}

/**
 * Safe watchPosition for continuous tracking when required
 * Returns an unwatch cleanup callback
 */
export function watchDevicePosition(
  onUpdate: (coords: ValidatedCoordinates) => void,
  onError: (err: GeolocationServiceError) => void,
  options?: PositionOptions
): () => void {
  if (typeof window === 'undefined' || !navigator?.geolocation) {
    onError(
      new GeolocationServiceError(
        'UNSUPPORTED',
        'Geolocation is not supported by your current browser.',
        false
      )
    );
    return () => {};
  }

  const watchOptions: PositionOptions = {
    enableHighAccuracy: true,
    maximumAge: 2000,
    timeout: 15000,
    ...options,
  };

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      try {
        const validated = processRawPosition(pos, 'CURRENT_GPS');
        onUpdate(validated);
      } catch (err: any) {
        if (err instanceof GeolocationServiceError) {
          onError(err);
        }
      }
    },
    (err) => {
      const errType: GeolocationErrorType =
        err.code === 1 ? 'PERMISSION_DENIED' : err.code === 2 ? 'POSITION_UNAVAILABLE' : 'TIMEOUT';
      onError(
        new GeolocationServiceError(
          errType,
          err.message || 'Error occurred while tracking device location.',
          true
        )
      );
    },
    watchOptions
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}
