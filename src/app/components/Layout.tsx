import { Outlet, Link, useLocation } from "react-router";
import { Home, Users, MessageCircle, Briefcase, User } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function Layout() {
  const location = useLocation();
  const { isDark } = useTheme();

  const navItems = [
    { path: "/",          icon: Home,           label: "Home"      },
    { path: "/ministers", icon: Users,          label: "Ministers" },
    { path: "/community", icon: MessageCircle,  label: "Chat"      },
    { path: "/internal",  icon: Briefcase,      label: "Internal"  },
    { path: "/profile",   icon: User,           label: "Profile"   },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`flex flex-col h-screen ${isDark ? "bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" : "bg-gray-50"}`}>
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>

      {/* Bottom Navigation */}
      <nav className={`w-full flex-shrink-0 ${isDark
        ? "bg-slate-900/80 backdrop-blur-xl border-t border-white/10 shadow-[0_-4px_24px_rgba(0,0,0,0.4)]"
        : "bg-white border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
      }`}>
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-all relative group ${
                  active
                    ? "text-white"
                    : isDark
                      ? "text-white/35 hover:text-white/60"
                      : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <div className={`relative transition-all ${
                  active ? "scale-110 -translate-y-0.5" : "group-hover:scale-105"
                }`}>
                  {active && (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-indigo-500/20 rounded-2xl blur-xl scale-150" />
                  )}
                  <div className={`relative p-2 rounded-2xl transition-all ${
                    active
                      ? "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30"
                      : isDark
                        ? "group-hover:bg-white/10"
                        : "group-hover:bg-gray-100"
                  }`}>
                    <Icon
                      size={22}
                      strokeWidth={active ? 2.5 : 2}
                      className={active ? "text-white" : isDark ? "" : "text-gray-500"}
                    />
                  </div>
                  {active && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      <div className="w-1 h-1 bg-blue-400 rounded-full shadow-sm" />
                      <div className="w-1 h-1 bg-indigo-400 rounded-full shadow-sm" />
                    </div>
                  )}
                </div>
                <span className={`text-[10px] mt-1.5 font-medium transition-all ${
                  active
                    ? "font-bold text-white"
                    : isDark
                      ? "group-hover:text-white/60"
                      : "text-gray-400 group-hover:text-gray-600"
                }`}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
