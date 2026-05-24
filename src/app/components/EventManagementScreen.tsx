import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Plus, Search, X, Loader, Calendar, MapPin,
  Users, Clock, ChevronRight, CheckCircle, AlertCircle, Megaphone,
} from "lucide-react";
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
  coordinator: string | null;
  like_count: number;
  going_count: number;
}

const EVENT_TYPES = [
  { value: "rally",    label: "Rally",    emoji: "📣" },
  { value: "meeting",  label: "Meeting",  emoji: "🤝" },
  { value: "training", label: "Training", emoji: "📚" },
  { value: "workshop", label: "Workshop", emoji: "🛠️" },
  { value: "drive",    label: "Drive",    emoji: "🚗" },
  { value: "summit",   label: "Summit",   emoji: "🏔️" },
];

const TYPE_COLORS: Record<string, string> = {
  rally:    "from-red-500 to-pink-600",
  meeting:  "from-blue-500 to-blue-700",
  training: "from-orange-500 to-amber-500",
  workshop: "from-cyan-500 to-teal-600",
  drive:    "from-emerald-500 to-green-600",
  summit:   "from-purple-500 to-indigo-600",
};

const TYPE_BG: Record<string, string> = {
  rally:    "bg-red-100 text-red-700",
  meeting:  "bg-blue-100 text-blue-700",
  training: "bg-orange-100 text-orange-700",
  workshop: "bg-cyan-100 text-cyan-700",
  drive:    "bg-emerald-100 text-emerald-700",
  summit:   "bg-purple-100 text-purple-700",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function EventManagementScreen() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { isDark } = useTheme();

  const [events, setEvents]   = useState<CampaignEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

  /* ── Create sheet ── */
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "", type: "rally", location: "", district: "",
    event_date: "", event_time: "", expected_attendance: "", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg,   setErrorMsg]   = useState("");

  const authHdr = { Authorization: `Bearer ${token}` };

  const loadEvents = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/campaign/events", { headers: authHdr });
      if (res.ok) setEvents(await res.json());
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  function openCreate() {
    setForm({ title: "", type: "rally", location: "", district: "", event_date: "", event_time: "", expected_attendance: "", notes: "" });
    setSuccessMsg("");
    setErrorMsg("");
    setShowCreate(true);
  }

  async function handleCreate() {
    setErrorMsg("");
    if (!form.title.trim())    return setErrorMsg("Event title is required");
    if (!form.location.trim()) return setErrorMsg("Location is required");
    if (!form.event_date)      return setErrorMsg("Event date is required");

    setSubmitting(true);
    try {
      const res = await fetch("/api/campaign/events", {
        method: "POST",
        headers: { ...authHdr, "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          expected_attendance: parseInt(form.expected_attendance) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to create event");
      } else {
        setSuccessMsg(`"${data.title}" created! It's now visible in the community feed.`);
        setForm({ title: "", type: "rally", location: "", district: "", event_date: "", event_time: "", expected_attendance: "", notes: "" });
        await loadEvents();
      }
    } finally { setSubmitting(false); }
  }

  const filtered = events.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.location.toLowerCase().includes(search.toLowerCase()) ||
    (e.district ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? "bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" : "bg-gray-50"}`}>

      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 text-white px-4 pt-5 pb-4 shadow-xl relative overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 active:bg-white/40 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1">
              <h1 className="font-bold text-xl tracking-tight">Events Management</h1>
              <p className="text-xs text-emerald-100 mt-0.5">Create rallies, meetings & drives</p>
            </div>
            <button
              onClick={openCreate}
              className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 active:bg-white/40 transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Search events..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-2xl bg-white/95 text-gray-700 text-sm placeholder:text-gray-400 outline-none shadow-lg"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader size={24} className="animate-spin text-emerald-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
              <Calendar size={28} className="text-emerald-300" />
            </div>
            <p className={`font-bold text-base mb-1 ${isDark ? "text-white" : "text-gray-700"}`}>
              {search ? "No events found" : "No events yet"}
            </p>
            <p className="text-xs text-gray-400 mb-4">
              {search ? "Try a different search" : "Tap the + button to create your first event."}
            </p>
            {!search && (
              <button
                onClick={openCreate}
                className="px-5 py-2 bg-emerald-600 text-white text-sm font-bold rounded-2xl shadow active:scale-95 transition-transform"
              >
                Create Event
              </button>
            )}
          </div>
        ) : (
          filtered.map(event => {
            const typeInfo = EVENT_TYPES.find(t => t.value === event.type) ?? { emoji: "📅", label: event.type };
            return (
              <div
                key={event.id}
                className={`rounded-2xl overflow-hidden ${isDark ? "bg-white/5 border border-white/10" : "bg-white border border-gray-100 shadow-sm"}`}
              >
                {/* Color header strip */}
                <div className={`bg-gradient-to-r ${TYPE_COLORS[event.type] ?? "from-gray-500 to-gray-600"} px-4 py-3 flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{typeInfo.emoji}</span>
                    <p className="font-bold text-white text-sm">{event.title}</p>
                  </div>
                  <span className="text-[11px] bg-white/20 text-white font-bold px-2.5 py-1 rounded-full capitalize">
                    {typeInfo.label}
                  </span>
                </div>

                {/* Details */}
                <div className="px-4 py-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <MapPin size={13} className="text-gray-400 shrink-0" />
                    <span className={`${isDark ? "text-gray-300" : "text-gray-700"} font-medium`}>
                      {event.location}{event.district ? `, ${event.district}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar size={13} className="text-gray-400 shrink-0" />
                    <span className={`${isDark ? "text-gray-300" : "text-gray-700"} font-medium`}>
                      {formatDate(event.event_date)}
                      {event.event_time && event.event_time !== "TBD" ? ` · ${event.event_time}` : ""}
                    </span>
                  </div>
                  {event.expected_attendance > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <Users size={13} className="text-gray-400 shrink-0" />
                      <span className={`${isDark ? "text-gray-300" : "text-gray-700"} font-medium`}>
                        {event.expected_attendance.toLocaleString()}+ expected
                      </span>
                    </div>
                  )}
                  {event.notes && (
                    <p className={`text-xs leading-relaxed pt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      {event.notes}
                    </p>
                  )}

                  {/* Stats row */}
                  <div className="flex items-center gap-3 pt-1 border-t border-gray-100 mt-2">
                    <span className="text-xs text-gray-400">❤️ {event.like_count ?? 0}</span>
                    <span className="text-xs text-gray-400">✅ {event.going_count ?? 0} going</span>
                    <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${event.status === "upcoming" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {event.status ?? "upcoming"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FAB */}
      <button
        onClick={openCreate}
        className="fixed bottom-24 right-5 w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-30"
      >
        <Plus size={24} />
      </button>

      {/* ── Create Event sheet ── */}
      {showCreate && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => !submitting && setShowCreate(false)} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh]">
            <div className="flex justify-center pt-3 shrink-0"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>

            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-base text-gray-900">Create Event</h3>
              <button onClick={() => setShowCreate(false)} disabled={submitting} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                <X size={15} className="text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

              {/* Success */}
              {successMsg && (
                <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
                  <CheckCircle size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-emerald-700 font-medium">{successMsg}</p>
                </div>
              )}

              {/* Error */}
              {errorMsg && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                  <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-600 font-medium">{errorMsg}</p>
                </div>
              )}

              {/* Event type */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-2 block">Event Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {EVENT_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setForm(f => ({ ...f, type: t.value }))}
                      className={`py-3 px-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 transition-all ${form.type === t.value ? "bg-emerald-600 text-white border-emerald-600 shadow-md" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-emerald-300"}`}
                    >
                      <span className="text-base">{t.emoji}</span>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block">Event Title <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Pune Mega Rally 2026"
                  value={form.title}
                  onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setErrorMsg(""); setSuccessMsg(""); }}
                  className="w-full h-11 px-4 rounded-xl bg-gray-100 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-emerald-300 placeholder:text-gray-400"
                />
              </div>

              {/* Location + District */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block">Location <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    placeholder="Venue / City"
                    value={form.location}
                    onChange={e => { setForm(f => ({ ...f, location: e.target.value })); setErrorMsg(""); setSuccessMsg(""); }}
                    className="w-full h-11 px-4 rounded-xl bg-gray-100 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-emerald-300 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block">District</label>
                  <input
                    type="text"
                    placeholder="e.g. Pune"
                    value={form.district}
                    onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl bg-gray-100 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-emerald-300 placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block">Date <span className="text-red-400">*</span></label>
                  <input
                    type="date"
                    value={form.event_date}
                    onChange={e => { setForm(f => ({ ...f, event_date: e.target.value })); setErrorMsg(""); setSuccessMsg(""); }}
                    className="w-full h-11 px-3 rounded-xl bg-gray-100 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block">Time</label>
                  <input
                    type="time"
                    value={form.event_time}
                    onChange={e => setForm(f => ({ ...f, event_time: e.target.value }))}
                    className="w-full h-11 px-3 rounded-xl bg-gray-100 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
              </div>

              {/* Expected Attendance */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block">Expected Attendance</label>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  min="0"
                  value={form.expected_attendance}
                  onChange={e => setForm(f => ({ ...f, expected_attendance: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl bg-gray-100 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-emerald-300 placeholder:text-gray-400"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block">Description / Notes</label>
                <textarea
                  placeholder="What's this event about? This will appear in the community feed."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-emerald-300 placeholder:text-gray-400 resize-none"
                />
                <p className="text-[11px] text-gray-400 mt-1 px-1 flex items-center gap-1">
                  <Megaphone size={11} />
                  Event will be auto-posted to the community feed.
                </p>
              </div>
            </div>

            {/* Submit */}
            <div className="px-4 py-4 border-t border-gray-100 shrink-0">
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="w-full h-12 bg-emerald-600 disabled:bg-gray-300 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
              >
                {submitting ? (
                  <Loader size={18} className="animate-spin" />
                ) : (
                  <>
                    <Calendar size={16} />
                    Create Event & Post to Feed
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
