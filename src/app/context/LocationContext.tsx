import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface UserLocation {
  lat:          number;
  lng:          number;
  districtName: string;  // e.g. "Nagpur"
  stateName:    string;  // e.g. "Maharashtra"
  detected:     boolean; // true = GPS, false = manual
}

interface LocationContextType {
  userLocation:    UserLocation | null;
  locationAsked:   boolean;
  setUserLocation: (loc: UserLocation | null) => void;
  markAsked:       () => void;
  clearLocation:   () => void;
}

const LocationContext = createContext<LocationContextType | null>(null);
const STORAGE_KEY = "ncp_location";

function load(): { userLocation: UserLocation | null; locationAsked: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { userLocation: null, locationAsked: false };
    return JSON.parse(raw);
  } catch {
    return { userLocation: null, locationAsked: false };
  }
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const stored = load();
  const [userLocation, setLoc]    = useState<UserLocation | null>(stored.userLocation);
  const [locationAsked, setAsked] = useState(stored.locationAsked);

  const setUserLocation = useCallback((loc: UserLocation | null) => {
    setLoc(loc);
    setAsked(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ userLocation: loc, locationAsked: true }));
  }, []);

  const markAsked = useCallback(() => {
    setAsked(true);
    const s = load();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...s, locationAsked: true }));
  }, []);

  const clearLocation = useCallback(() => {
    setLoc(null);
    setAsked(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <LocationContext.Provider value={{ userLocation, locationAsked, setUserLocation, markAsked, clearLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useUserLocation(): LocationContextType {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useUserLocation must be used inside <LocationProvider>");
  return ctx;
}
