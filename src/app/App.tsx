import { RouterProvider } from 'react-router';
import { router } from './routes.tsx';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocationProvider, useUserLocation } from './context/LocationContext';
import { ThemeProvider } from './context/ThemeContext';
import LocationPermissionModal from './components/LocationPermissionModal';

const WEB_ROLES = ["super_admin", "state_leader", "district_leader", "observer"];

function AppInner() {
  const { isLoggedIn, user } = useAuth();
  const { locationAsked }    = useUserLocation();

  // Show location modal for mobile users who haven't answered yet
  const showLocationModal = isLoggedIn && !locationAsked && !WEB_ROLES.includes(user?.role ?? "");

  return (
    <>
      <RouterProvider router={router} />
      {showLocationModal && <LocationPermissionModal />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LocationProvider>
          <AppInner />
        </LocationProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
