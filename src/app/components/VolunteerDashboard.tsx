import { ArrowLeft, Award, Target, TrendingUp, Calendar, MapPin, Users, CheckCircle, Clock, Trophy } from "lucide-react";
import { Link } from "react-router";
import { useTheme } from "../context/ThemeContext";

export default function VolunteerDashboard() {
  const volunteerStats = {
    rank: "Gold Volunteer",
    points: 1250,
    nextRank: "Platinum",
    pointsToNext: 250,
    totalEvents: 24,
    hoursContributed: 156,
    campaignsJoined: 8,
  };

  const achievements = [
    { id: 1, title: "Early Adopter", icon: Award, color: "from-yellow-500 to-amber-600", unlocked: true },
    { id: 2, title: "10 Events", icon: Target, color: "from-blue-900 to-cyan-600", unlocked: true },
    { id: 3, title: "Community Builder", icon: Users, color: "from-emerald-600 to-emerald-500", unlocked: true },
    { id: 4, title: "100 Hours", icon: Clock, color: "from-purple-600 to-purple-700", unlocked: false },
    { id: 5, title: "Top Volunteer", icon: Trophy, color: "from-orange-500 to-orange-600", unlocked: false },
  ];

  const recentActivities = [
    {
      id: 1,
      type: "event",
      title: "Town Hall Meeting Volunteer",
      location: "Delhi",
      date: "Mar 2, 2026",
      points: 50,
      status: "completed",
    },
    {
      id: 2,
      type: "campaign",
      title: "Door-to-door Campaign",
      location: "East Delhi",
      date: "Feb 28, 2026",
      points: 75,
      status: "completed",
    },
    {
      id: 3,
      type: "event",
      title: "Health Camp Setup",
      location: "Rohini",
      date: "Feb 25, 2026",
      points: 60,
      status: "completed",
    },
    {
      id: 4,
      type: "campaign",
      title: "Youth Workers Meeting",
      location: "Central Delhi",
      date: "Mar 10, 2026",
      points: 40,
      status: "upcoming",
    },
  ];

  const upcomingOpportunities = [
    {
      id: 1,
      title: "Street Corner Meeting",
      location: "West Delhi",
      date: "Mar 8, 2026",
      time: "5:00 PM",
      volunteers: 12,
      maxVolunteers: 20,
      points: 45,
    },
    {
      id: 2,
      title: "Voter Registration Drive",
      location: "South Delhi",
      date: "Mar 12, 2026",
      time: "10:00 AM",
      volunteers: 8,
      maxVolunteers: 15,
      points: 60,
    },
  ];

  const progressPercentage = (volunteerStats.points / (volunteerStats.points + volunteerStats.pointsToNext)) * 100;
  const { isDark } = useTheme();

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" : "bg-gray-50"}`}>
      {/* Header with Gradient */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-700 to-cyan-600 text-white p-4 pb-6 rounded-b-3xl shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <Link to="/profile" className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="font-bold text-2xl mb-1">Volunteer Dashboard</h1>
              <p className="text-sm text-blue-100">Track your contributions</p>
            </div>
          </div>

          {/* Rank Card */}
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Trophy size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{volunteerStats.rank}</h3>
                  <p className="text-sm text-blue-100">{volunteerStats.points} points</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-200 mb-1">Next: {volunteerStats.nextRank}</p>
                <p className="font-semibold text-sm">{volunteerStats.pointsToNext} pts to go</p>
              </div>
            </div>
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-4 -mt-3 pb-4">
        <div className="grid grid-cols-3 gap-3">
          <div className={`rounded-2xl p-3 text-center border ${isDark ? "bg-white/5 backdrop-blur-sm border-white/10" : "bg-white border-gray-200 shadow-sm"}`}>
            <p className="font-bold text-2xl text-blue-400 mb-1">{volunteerStats.totalEvents}</p>
            <p className={`text-[10px] leading-tight ${isDark ? "text-gray-400" : "text-gray-500"}`}>Events Joined</p>
          </div>
          <div className={`rounded-2xl p-3 text-center border ${isDark ? "bg-white/5 backdrop-blur-sm border-white/10" : "bg-white border-gray-200 shadow-sm"}`}>
            <p className="font-bold text-2xl text-orange-400 mb-1">{volunteerStats.hoursContributed}</p>
            <p className={`text-[10px] leading-tight ${isDark ? "text-gray-400" : "text-gray-500"}`}>Hours</p>
          </div>
          <div className={`rounded-2xl p-3 text-center border ${isDark ? "bg-white/5 backdrop-blur-sm border-white/10" : "bg-white border-gray-200 shadow-sm"}`}>
            <p className="font-bold text-2xl text-emerald-400 mb-1">{volunteerStats.campaignsJoined}</p>
            <p className={`text-[10px] leading-tight ${isDark ? "text-gray-400" : "text-gray-500"}`}>Campaigns</p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-6 pb-6">
        {/* Achievements */}
        <section>
          <h2 className={`font-bold mb-3 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            <span className="text-xl">🏆</span>
            Achievements
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {achievements.map((achievement) => {
              const Icon = achievement.icon;
              return (
                <div
                  key={achievement.id}
                  className={`flex-shrink-0 w-24 rounded-2xl p-3 text-center border transition-all ${isDark ? "bg-white/5 backdrop-blur-sm border-white/10" : "bg-white border-gray-200 shadow-sm"} ${achievement.unlocked ? isDark ? "hover:bg-white/10" : "hover:bg-gray-50" : "opacity-40"}`}
                >
                  <div
                    className={`w-14 h-14 bg-gradient-to-br ${achievement.color} rounded-xl flex items-center justify-center mx-auto mb-2 shadow-sm ${
                      !achievement.unlocked && "grayscale"
                    }`}
                  >
                    <Icon size={24} className="text-white" />
                  </div>
                  <p className={`text-[10px] font-medium leading-tight ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                    {achievement.title}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Upcoming Opportunities */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className={`font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              <span className="text-xl">🎯</span>
              Opportunities
            </h2>
            <button className="text-sm text-blue-400 font-semibold hover:text-blue-300 transition-colors">
              View All
            </button>
          </div>
          <div className="space-y-3">
            {upcomingOpportunities.map((opportunity) => (
              <div
                key={opportunity.id}
                className={`rounded-2xl p-4 border transition-all ${isDark ? "bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10" : "bg-white border-gray-200 shadow-sm hover:shadow-md"}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className={`font-semibold text-sm flex-1 ${isDark ? "text-white" : "text-gray-900"}`}>{opportunity.title}</h3>
                  <span className="text-xs bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1 rounded-full font-semibold shadow-sm">
                    +{opportunity.points} pts
                  </span>
                </div>
                <div className="space-y-2 mb-3">
                  <div className={`flex items-center gap-2 text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    <MapPin size={14} className="text-blue-400" />
                    <span>{opportunity.location}</span>
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    <Calendar size={14} className="text-orange-400" />
                    <span>{opportunity.date} at {opportunity.time}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-1 text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    <Users size={14} />
                    <span>{opportunity.volunteers}/{opportunity.maxVolunteers} volunteers</span>
                  </div>
                  <button className="text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 rounded-xl hover:shadow-md transition-all">
                    Join
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Activities */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className={`font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              <span className="text-xl">📋</span>
              Recent Activities
            </h2>
          </div>
          <div className="space-y-2">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className={`rounded-2xl p-4 border ${isDark ? "bg-white/5 backdrop-blur-sm border-white/10" : "bg-white border-gray-200 shadow-sm"}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                      activity.status === "completed"
                        ? "bg-gradient-to-br from-emerald-600 to-emerald-500"
                        : "bg-gradient-to-br from-orange-500 to-orange-600"
                    }`}
                  >
                    {activity.status === "completed" ? (
                      <CheckCircle size={18} className="text-white" />
                    ) : (
                      <Clock size={18} className="text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold text-sm mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>{activity.title}</h3>
                    <div className={`flex items-center gap-3 text-xs mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      <span>{activity.location}</span>
                      <span>•</span>
                      <span>{activity.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          activity.status === "completed"
                            ? "bg-emerald-500/20 text-emerald-600"
                            : "bg-orange-500/20 text-orange-500"
                        }`}
                      >
                        {activity.status === "completed" ? "Completed" : "Upcoming"}
                      </span>
                      {activity.status === "completed" && (
                        <span className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>+{activity.points} pts earned</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Leaderboard Teaser */}
        <section>
          <Link
            to="/leaderboard"
            className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-6 flex items-center justify-between shadow-lg hover:shadow-xl transition-all active:scale-98 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.2),transparent)]"></div>
            <div className="relative z-10">
              <h3 className="font-bold text-white mb-1">View Leaderboard</h3>
              <p className="text-sm text-purple-100">See top volunteers</p>
            </div>
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center relative z-10">
              <TrendingUp size={24} className="text-white" />
            </div>
          </Link>
        </section>
      </div>
    </div>
  );
}
