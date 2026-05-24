import { createBrowserRouter, Navigate } from "react-router";
import Layout               from "./components/Layout";
import LoginScreen          from "./components/LoginScreen";
import SignupScreen         from "./components/SignupScreen";
import HomeScreen           from "./components/HomeScreen";
import MinistersScreen      from "./components/MinistersScreen";
import MinisterProfile      from "./components/MinisterProfile";
import ChatListScreen       from "./components/ChatListScreen";
import ChatScreen           from "./components/ChatScreen";
import InternalTeamDashboard from "./components/InternalTeamDashboard";
import InternalPlanning     from "./components/InternalPlanning";
import InternalChat         from "./components/InternalChat";
import UserProfile          from "./components/UserProfile";
import EventsListScreen     from "./components/EventsListScreen";
import LiveCampaignMonitoring from "./components/LiveCampaignMonitoring";
import ProtectedRoute       from "./components/ProtectedRoute";

function Protected({ component: Component }: { component: React.ComponentType }) {
  return (
    <ProtectedRoute>
      <Component />
    </ProtectedRoute>
  );
}

export const router = createBrowserRouter([
  /* ── Public routes ─────────────────────────────────────── */
  {
    path: "/login",
    Component: LoginScreen,
  },
  {
    path: "/signup",
    Component: SignupScreen,
  },

  /* ── Protected routes (require login) ──────────────────── */
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true,                    Component: HomeScreen             },
      { path: "ministers",              Component: MinistersScreen        },
      { path: "ministers/:id",          Component: MinisterProfile        },
      { path: "community",              Component: ChatListScreen         },
      { path: "community/:chatId",      Component: ChatScreen             },
      { path: "internal",               Component: InternalTeamDashboard  },
      { path: "internal/planning",      Component: InternalPlanning       },
      { path: "internal/chat/:chatId",  Component: InternalChat           },
      { path: "profile",                Component: UserProfile            },
      { path: "events",                 Component: EventsListScreen       },
      { path: "campaign",               Component: LiveCampaignMonitoring },
    ],
  },

  /* ── Catch-all ──────────────────────────────────────────── */
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
