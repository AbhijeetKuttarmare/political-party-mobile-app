import { Lock, Users, Calendar, BarChart } from "lucide-react";
import { Link } from "react-router";
import { useTheme } from "../context/ThemeContext";

export default function InternalTeamDashboard() {
  const isAdmin = true; // Mock - would check real user role
  const { isDark } = useTheme();

  const quickStats = [
    { label: "Active Workers", value: "1,247", icon: Users, color: "from-blue-900 to-cyan-600" },
    { label: "Ongoing Campaigns", value: "12", icon: BarChart, color: "from-orange-500 to-orange-600" },
    { label: "This Week Events", value: "8", icon: Calendar, color: "from-emerald-600 to-emerald-500" },
  ];

  if (!isAdmin) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
          <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Lock size={40} className="text-gray-500" />
          </div>
          <h2 className="font-bold text-2xl mb-3">Access Restricted</h2>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            This section is only accessible to admin-approved team members.
            Please contact your team leader for access.
          </p>
          <button className="text-sm text-white font-semibold bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-3 rounded-xl hover:from-blue-950 hover:to-blue-900 transition-colors shadow-md">
            Request Access
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" : "bg-gray-50"}`}>
      {/* Header with Vibrant Gradient */}
      <div className="bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-600 text-white p-6 pb-6 rounded-b-[2rem] shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(20,184,166,0.2),transparent)]"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
              <Lock size={22} />
            </div>
            <div>
              <h1 className="font-bold text-2xl tracking-tight">Internal Team</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Quick Stats */}
      <div className="px-4 mt-4 pb-5">
        <div className="grid grid-cols-3 gap-3">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className={`rounded-2xl p-4 text-center border hover:scale-105 active:scale-95 transition-all cursor-pointer ${isDark ? "bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10" : "bg-white border-gray-200 shadow-sm hover:shadow-md"}`}
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${stat.color} rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-md`}>
                  <Icon size={22} className="text-white" />
                </div>
                <p className={`font-bold text-xl mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>{stat.value}</p>
                <p className={`text-[10px] font-semibold leading-tight ${isDark ? "text-gray-400" : "text-gray-500"}`}>{stat.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 space-y-4 pb-6">
        {/* Quick Actions */}
        <section>
          <h2 className={`font-bold mb-3 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            <span className="text-xl">⚡</span>
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Link
              to="/internal/members"
              className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl p-5 flex flex-col items-center gap-3 shadow-lg hover:shadow-xl transition-all active:scale-95 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.2),transparent)]"></div>
              <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center relative z-10">
                <Users size={24} className="text-white" />
              </div>
              <span className="text-sm font-semibold text-white relative z-10">Member Mgmt</span>
            </Link>
            <Link
              to="/internal/planning"
              className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-5 flex flex-col items-center gap-3 shadow-lg hover:shadow-xl transition-all active:scale-95 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.2),transparent)]"></div>
              <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center relative z-10">
                <Calendar size={24} className="text-white" />
              </div>
              <span className="text-sm font-semibold text-white relative z-10">Events Mgmt</span>
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}