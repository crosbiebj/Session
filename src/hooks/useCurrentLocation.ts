import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

type LocationState = {
  coords: { latitude: number; longitude: number } | null;
  loading: boolean;
  // Distinguishes "permission denied" from "no location yet" so callers
  // can show the right empty state instead of a spinner forever.
  denied: boolean;
};

export function useCurrentLocation() {
  const [state, setState] = useState<LocationState>({
    coords: null,
    loading: true,
    denied: false,
  });

  const fetchLocation = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setState({ coords: null, loading: false, denied: true });
      return;
    }
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setState({
        coords: { latitude: position.coords.latitude, longitude: position.coords.longitude },
        loading: false,
        denied: false,
      });
    } catch {
      setState({ coords: null, loading: false, denied: false });
    }
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  return { ...state, refetch: fetchLocation };
}
