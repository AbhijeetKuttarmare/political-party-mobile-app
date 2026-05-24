import { createBrowserRouter, Navigate } from "react-router";
import Layout               from "./components/Layout";
import LoginScreen          from "./components/LoginScreen";
import SignupScreen         from "./components/SignupScreen";
import HomeScreen           from "./components/HomeScreen";
import MinistersScreen      from "./components/MinistersScreen";
import MinisterProfile      from "./components/MinisterProfile";
import ChatListScreen       from "./components/ChatListScreen";
import ChatScreen           from "./components/ChatScreen";
import GroupChatScreen      from "./components/GroupChatScreen";
import InternalTeamDashboard from "./components/InternalTeamDashboard";
import InternalPlanning     from "./components/InternalPlanning";
import MemberManagementScreen from "./components/MemberManagementScreen";
import EventManagementScreen  from "./components/EventManagementScreen";
import InternalChat         from "./components/InternalChat";
import UserProfile          from "./components/UserProfile";
import EventsListScreen     from "./components/EventsListScreen";
import LiveCampaignMonitoring from "./components/LiveCampaignMonitoring";
import ProtectedRoute       from "./components/ProtectedRoute";

/* ── Web Dashboard ──────────────────────────────────────── */
import WebLayout       from "./web/WebLayout";
import WebProtectedRoute from "./web/WebProtectedRoute";
import WebDashboard    from "./web/pages/WebDashboard";
import WebUsers        from "./web/pages/WebUsers";
import WebAnalytics    from "./web/pages/WebAnalytics";
import WebDistricts    from "./web/pages/WebDistricts";
import WebVolunteers   from "./web/pages/WebVolunteers";
import WebBooths       from "./web/pages/WebBooths";
import WebSurveys      from "./web/pages/WebSurveys";
import WebCampaign     from "./web/pages/WebCampaign";
import WebSocialFeed   from "./web/pages/WebSocialFeed";

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

  /* ── Web Dashboard (super_admin, state_leader, district_leader, observer) ── */
  {
    path: "/web",
    element: (
      <WebProtectedRoute>
        <WebLayout />
      </WebProtectedRoute>
    ),
    children: [
      { index: true,           Component: WebDashboard  },
      { path: "feed",          Component: WebSocialFeed },
      { path: "users",         Component: WebUsers      },
      { path: "analytics",     Component: WebAnalytics  },
      { path: "districts",     Component: WebDistricts  },
      { path: "volunteers",    Component: WebVolunteers },
      { path: "booths",        Component: WebBooths     },
      { path: "surveys",       Component: WebSurveys    },
      { path: "campaign",      Component: WebCampaign   },
    ],
  },

  /* ── Mobile app (booth_worker, taluka_leader, + fallback for all) ── */
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
      { path: "community/group/:groupId", Component: GroupChatScreen      },
      { path: "community/:chatId",      Component: ChatScreen             },
      { path: "internal",               Component: InternalTeamDashboard  },
      { path: "internal/members",       Component: MemberManagementScreen },
      { path: "internal/events",        Component: EventManagementScreen  },
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
