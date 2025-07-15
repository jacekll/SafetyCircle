import { useState, useCallback } from 'react';
import { type LocationData } from '@shared/schema';

interface LocationState {
  location: LocationData | null;
  isLoading: boolean;
  error: string | null;
}

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    location: null,
    isLoading: false,
    error: null,
  });

  const getCurrentLocation = useCallback((): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // 1 minute
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          
          setState({
            location: locationData,
            isLoading: false,
            error: null,
          });
          
          resolve(locationData);
        },
        (error) => {
          let errorMessage = 'Failed to get location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          
          setState({
            location: null,
            isLoading: false,
            error: errorMessage,
          });
          
          reject(new Error(errorMessage));
        },
        options
      );
    });
  }, []);

  const checkLocationPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator.permissions) {
      return false;
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state === 'granted';
    } catch {
      return false;
    }
  }, []);

  return {
    location: state.location,
    isLoading: state.isLoading,
    error: state.error,
    getCurrentLocation,
    checkLocationPermission,
  };
}