import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Calendar, MapPin, Users, Loader, Clock } from "lucide-react";
import { useNavigate } from "react-router";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

interface CampaignEvent {
  id: number;
  title: string;
  type: string;
  location: string;
  district: string | null;
  event_date: string;
  event_time: string;
  expected_attendance: number;
  notes: string | null;
  status: string;
  like_count: number;
  going_count: number;
  interested_count: number;
  liked_by_me: boolean;
  my_rsvp: string | null;
}

const TYPE_COLORS: Record<string, string> = {
  rally:    "from-red-500 to-pink-600",
  meeting:  "from-blue-500 to-blue-700",
  training: "from-orange-500 to-amber-500",
  workshop: "from-cyan-500 to-teal-600",
  drive:    "from-emerald-500 to-green-600",
  summit:   "from-purple-500 to-indigo-600",
};

const TYPE_EMOJI: Record<string, string> = {
  rally: "📣", meeting: "🤝", training: "📚",
  workshop: "🛠️", drive: "🚗", summit: "🏔️",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function EventsListScreen() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { token } = useAuth();

  const [events, setEvents]   = useState<CampaignEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [rsvping, setRsvping] = useState<Set<number>>(new Set());

  const authHdr = { Authorization: `Bearer ${token}` };

  const loadEvents = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/campaign/events", { headers: authHdr });
      if (res.ok) setEvents(await res.json());
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  async function handleRsvp(eventId: number, status: "going" | "interested") {
    setRsvping(prev => new Set(prev).add(eventId));
    try {
      const res = await fetch(`/api/campaign/events/${eventId}/rsvp`, {
        method: "POST",
        headers: { ...authHdr, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(prev => prev.map(e => {
          if (e.id !== eventId) return e;
          const prev_rsvp = e.my_rsvp;
          const new_rsvp  = data.rsvp ?? null;
          return {
            ...e,
            my_rsvp: new_rsvp,
            going_count: new_rsvp === "going" ? e.going_count + 1
              : prev_rsvp === "going" ? e.going_count - 1 : e.going_count,
            interested_count: new_rsvp === "interested" ? e.interested_count + 1
              : prev_rsvp === "interested" ? e.interested_count - 1 : e.interested_count,
          };
        }));
      }
    } finally {
      setRsvping(prev => { const s = new Set(prev); s.delete(eventId); return s; });
    }
  }

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
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader size={24} className="animate-spin text-orange-400" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-3">
              <Calendar size={28} className="text-orange-300" />
            </div>
            <p className={`font-bold text-base mb-1 ${isDark ? "text-white" : "text-gray-700"}`}>No events scheduled</p>
            <p className="text-xs text-gray-400">Check back later for upcoming events.</p>
          </div>
        ) : (
          events.map(event => (
            <div
              key={event.id}
              className={`rounded-2xl overflow-hidden transition-all ${isDark ? "bg-white/5 border border-white/10" : "bg-white border border-gray-200 shadow-sm hover:shadow-md"}`}
            >
              {/* Event Header */}
              <div className={`bg-gradient-to-r ${TYPE_COLORS[event.type] ?? "from-gray-500 to-gray-600"} p-4 text-white`}>
                <div className="flex items-start justify-between mb-1.5">
                  <h3 className="font-bold text-base flex-1 pr-2">
                    {TYPE_EMOJI[event.type] ?? "📅"} {event.title}
                  </h3>
                  <span className="text-xs bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full font-semibold capitalize shrink-0">
                    {event.type}
                  </span>
                </div>
                {event.notes && (
                  <p className="text-xs text-white/90 line-clamp-2">{event.notes}</p>
                )}
              </div>

              {/* Event Details */}
              <div className="p-4 space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                    <MapPin size={15} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">Location</p>
                    <p className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                      {event.location}{event.district ? `, ${event.district}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                    <Calendar size={15} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">Date & Time</p>
                    <p className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                      {formatDate(event.event_date)}
                      {event.event_time && event.event_time !== "TBD" ? ` · ${event.event_time}` : ""}
                    </p>
                  </div>
                </div>

                {event.expected_attendance > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                      <Users size={15} className="text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-medium">Expected Attendees</p>
                      <p className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                        {event.expected_attendance.toLocaleString()}+ Members
                      </p>
                    </div>
                  </div>
                )}

                {/* RSVP stats */}
                {(event.going_count > 0 || event.interested_count > 0) && (
                  <div className="flex gap-3 pt-1">
                    <span className="text-xs text-gray-400">✅ {event.going_count} going</span>
                    <span className="text-xs text-gray-400">⭐ {event.interested_count} interested</span>
                  </div>
                )}

                {/* RSVP buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleRsvp(event.id, "going")}
                    disabled={rsvping.has(event.id)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                      event.my_rsvp === "going"
                        ? "bg-emerald-600 text-white shadow-md"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                    }`}
                  >
                    {rsvping.has(event.id) ? "..." : event.my_rsvp === "going" ? "✅ Going" : "Going"}
                  </button>
                  <button
                    onClick={() => handleRsvp(event.id, "interested")}
                    disabled={rsvping.has(event.id)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                      event.my_rsvp === "interested"
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                    }`}
                  >
                    {rsvping.has(event.id) ? "..." : event.my_rsvp === "interested" ? "⭐ Interested" : "Interested"}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
