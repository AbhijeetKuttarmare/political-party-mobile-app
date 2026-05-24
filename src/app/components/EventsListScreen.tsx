import { ArrowLeft, Calendar, MapPin, Users } from "lucide-react";
import { useNavigate } from "react-router";
import { useTheme } from "../context/ThemeContext";

export default function EventsListScreen() {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const allEvents = [
    { id: 1, title: "Rally & Event Management Training", location: "Mumbai - State Level", date: "Mar 10, 2026", time: "6:00 PM", attendees: 250, category: "Training", description: "Comprehensive training for state-level coordinators on rally organization and crowd management" },
    { id: 2, title: "Karyakarta System Onboarding", location: "All 36 Districts (Hybrid)", date: "Mar 15, 2026", time: "10:00 AM", attendees: 500, category: "Onboarding", description: "Introduction to new digital platform features including GPS tracking and task management" },
    { id: 3, title: "District Coordinators Meeting", location: "Pune, Maharashtra", date: "Mar 18, 2026", time: "4:00 PM", attendees: 36, category: "Meeting", description: "Strategic planning session with all district coordinators for upcoming campaigns" },
    { id: 4, title: "WhatsApp Integration Workshop", location: "Online (Virtual)", date: "Mar 20, 2026", time: "11:00 AM", attendees: 150, category: "Workshop", description: "Learn to use WhatsApp features for better communication with booth workers" },
    { id: 5, title: "Analytics Dashboard Demo", location: "Mumbai - Party Office", date: "Mar 22, 2026", time: "3:00 PM", attendees: 80, category: "Demo", description: "Live demonstration of AI-powered analytics and real-time insights dashboard" },
    { id: 6, title: "Booth Workers Summit", location: "Nashik, Maharashtra", date: "Mar 25, 2026", time: "9:00 AM", attendees: 400, category: "Summit", description: "Annual gathering of booth-level workers across all 288 blocks" },
    { id: 7, title: "Social Media Strategy Session", location: "Mumbai - Party Office", date: "Mar 28, 2026", time: "5:00 PM", attendees: 60, category: "Strategy", description: "Planning social media campaigns and content calendar for Q2 2026" },
    { id: 8, title: "Member Verification Drive", location: "All Districts", date: "Apr 1, 2026", time: "10:00 AM", attendees: 1000, category: "Campaign", description: "Statewide drive to verify and update member profiles on digital platform" },
  ];

  const categoryColors: Record<string, string> = {
    Training: "from-blue-500 to-blue-600",
    Onboarding: "from-emerald-500 to-green-600",
    Meeting: "from-purple-500 to-purple-600",
    Workshop: "from-orange-500 to-orange-600",
    Demo: "from-cyan-500 to-cyan-600",
    Summit: "from-pink-500 to-pink-600",
    Strategy: "from-indigo-500 to-indigo-600",
    Campaign: "from-red-500 to-red-600",
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" : "bg-gray-50"}`}>
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 text-white p-4 pb-6 rounded-b-[2rem] shadow-2xl relative overflow-hidden sticky top-0 z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.2),transparent_50%)]" />
        <div className="relative z-10 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/20 rounded-xl transition-all active:scale-95">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-bold text-xl mb-0.5">All Events</h1>
            <p className="text-xs text-orange-100">Upcoming NCP-SP Events & Activities</p>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="px-4 pt-5 pb-6 space-y-4">
        {allEvents.map((event) => (
          <div
            key={event.id}
            className={`rounded-2xl overflow-hidden transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${isDark ? "bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20" : "bg-white border border-gray-200 shadow-sm hover:shadow-md"}`}
          >
            {/* Event Header */}
            <div className={`bg-gradient-to-r ${categoryColors[event.category] || 'from-gray-500 to-gray-600'} p-4 text-white`}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-base flex-1">{event.title}</h3>
                <span className="text-xs bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full font-semibold">{event.category}</span>
              </div>
              <p className="text-xs text-white/90 line-clamp-2">{event.description}</p>
            </div>

            {/* Event Details */}
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                  <MapPin size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Location</p>
                  <p className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{event.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center shadow-sm">
                  <Calendar size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Date & Time</p>
                  <p className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{event.date} at {event.time}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shadow-sm">
                  <Users size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Expected Attendees</p>
                  <p className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{event.attendees}+ Members</p>
                </div>
              </div>
              <button className="w-full mt-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all active:scale-95">
                Register for Event
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
