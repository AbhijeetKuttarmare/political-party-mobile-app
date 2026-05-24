import { Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";

const WEB_ROLES = ["super_admin", "state_leader", "district_leader", "observer"];

export default function WebProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, user } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (!WEB_ROLES.includes(user?.role ?? "")) return <Navigate to="/" replace />;
  return <>{children}</>;
}
