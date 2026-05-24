import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  RefreshCw, Plus, X, Edit2, Trash2, CheckCircle2,
  Megaphone, MapPin, Calendar, Users, MonitorCheck,
  Search, Flag, Home, PhoneCall, UserCheck,
} from "lucide-react";
import WebBooths from "./WebBooths";

/* ─── Types ─────────────────────────────────────────────── */
interface CampaignEvent {
  id: number; title: string; type: string; location: string;
  district: string | null; area_id: number | null; area_name: string | null;
  election_id: string | null; event_date: string; event_time: string;
  coordinator: string | null; expected_attendance: number;
  status: string; notes: string | null;
}

type Tab = "events" | "booths";

const EVENT_TYPES = [
  { value: "rally",           label: "Rally",           icon: Megaphone  },
  { value: "meeting",         label: "Public Meeting",  icon: Users      },
  { value: "door_to_door",    label: "Door-to-Door",    icon: Home       },
  { value: "nukkad_sabha",    label: "Nukkad Sabha",    icon: Flag       },
  { value: "farmer_meeting",  label: "Farmer Meeting",  icon: Flag       },
  { value: "women_outreach",  label: "Women Outreach",  icon: UserCheck  },
  { value: "rally_call",      label: "Rally Call",      icon: PhoneCall  },
];

const STATUS_OPTIONS = ["upcoming", "live", "completed", "cancelled"];

const STATUS_COLORS: Record<string, string> = {
  upcoming:  "bg-blue-100 text-blue-700",
  live:      "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-600",
};


const EMPTY_EVENT = {
  title: "", type: "rally", location: "", district: "", area_id: "",
  election_id: "", event_date: "", event_time: "", coordinator: "",
  expected_attendance: "", status: "upcoming", notes: "",
};

export default function WebCampaign() {
  const { token, user } = useAuth();
  const [tab, setTab] = useState<Tab>("events");

  /* events state */
  const [events, setEvents]     = useState<CampaignEvent[]>([]);
  const [evLoading, setEvLoading] = useState(true);
  const [evSearch, setEvSearch]   = useState("");
  const [evStatusFilter, setEvStatusFilter] = useState("");
  const [showForm, setShowForm]   = useState(false);
  const [editEvent, setEditEvent] = useState<CampaignEvent | null>(null);
  const [form, setForm]           = useState(EMPTY_EVENT);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState<number | null>(null);
  const [success, setSuccess]     = useState("");
  const [error, setError]         = useState("");


  const hdr = useCallback(() => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }), [token]);

  /* ── Fetch events ─────────────────────────────────── */
  const loadEvents = useCallback(async () => {
    setEvLoading(true);
    try {
      const params = new URLSearchParams();
      if (evStatusFilter) params.set("status", evStatusFilter);
      const res = await fetch(`/api/campaign/events?${params}&limit=200`, { headers: hdr() });
      if (res.ok) setEvents(await res.json());
    } finally { setEvLoading(false); }
  }, [hdr, evStatusFilter]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  /* ── Open Add / Edit form ─────────────────────────── */
  function openAdd() {
    setEditEvent(null);
    setForm(EMPTY_EVENT);
    setError("");
    setShowForm(true);
  }

  function openEdit(ev: CampaignEvent) {
    setEditEvent(ev);
    setForm({
      title:                ev.title,
      type:                 ev.type,
      location:             ev.location,
      district:             ev.district ?? "",
      area_id:              ev.area_id ? String(ev.area_id) : "",
      election_id:          ev.election_id ?? "",
      event_date:           ev.event_date.slice(0, 10),
      event_time:           ev.event_time ?? "",
      coordinator:          ev.coordinator ?? "",
      expected_attendance:  String(ev.expected_attendance),
      status:               ev.status,
      notes:                ev.notes ?? "",
    });
    setError("");
    setShowForm(true);
  }

  /* ── Save event ───────────────────────────────────── */
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const body = {
      ...form,
      area_id:             form.area_id ? Number(form.area_id) : undefined,
      expected_attendance: form.expected_attendance ? Number(form.expected_attendance) : 0,
    };
    try {
      const url    = editEvent ? `/api/campaign/events/${editEvent.id}` : "/api/campaign/events";
      const method = editEvent ? "PUT" : "POST";
      const res    = await fetch(url, { method, headers: hdr(), body: JSON.stringify(body) });
      const data   = await res.json();
      if (!res.ok) { setError(data.error ?? "Save failed"); return; }
      setSuccess(editEvent ? "Event updated" : "Event created");
      setShowForm(false);
      loadEvents();
      setTimeout(() => setSuccess(""), 3000);
    } finally { setSaving(false); }
  }

  /* ── Delete event ─────────────────────────────────── */
  async function handleDelete(id: number) {
    if (!confirm("Delete this event?")) return;
    setDeleting(id);
    const res = await fetch(`/api/campaign/events/${id}`, { method: "DELETE", headers: hdr() });
    if (res.ok) { setEvents(e => e.filter(ev => ev.id !== id)); setSuccess("Event deleted"); setTimeout(() => setSuccess(""), 3000); }
    setDeleting(null);
  }

  /* ── Filtered lists ───────────────────────────────── */
  const filteredEvents = events.filter(ev => {
    const q = evSearch.toLowerCase();
    return !q || ev.title.toLowerCase().includes(q) || ev.location.toLowerCase().includes(q)
      || (ev.coordinator ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Campaign Management</h1>
          <p className="text-gray-400 text-sm mt-0.5">Configure live campaign data for mobile users</p>
        </div>
        <div className="flex gap-3">
          {tab === "events" && (
            <button onClick={loadEvents}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50">
              <RefreshCw size={14} /> Refresh
            </button>
          )}
          {tab === "events" && (
            <button onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors">
              <Plus size={14} /> Add Event
            </button>
          )}
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm text-green-700 font-medium">
          <CheckCircle2 size={15} /> {success}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-2 mb-6">
        {([
          { id: "events", label: "Campaign Events", icon: Megaphone },
          { id: "booths", label: "Booth Management", icon: MonitorCheck },
        ] as const).map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${tab === t.id ? "bg-blue-600 text-white shadow" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ═══════════════ EVENTS TAB ═══════════════ */}
      {tab === "events" && (
        <>
          {/* Filters */}
          <div className="flex gap-3 mb-5">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1 max-w-sm">
              <Search size={14} className="text-gray-400 shrink-0" />
              <input type="text" placeholder="Search events…" value={evSearch}
                onChange={e => setEvSearch(e.target.value)}
                className="flex-1 text-sm text-gray-800 outline-none bg-transparent placeholder:text-gray-400" />
              {evSearch && <button onClick={() => setEvSearch("")}><X size={13} className="text-gray-400" /></button>}
            </div>
            <select value={evStatusFilter} onChange={e => setEvStatusFilter(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none">
              <option value="">All Status</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>

          {/* Events table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Event</th>
                  <th className="text-left px-5 py-3">Type</th>
                  <th className="text-left px-5 py-3">Location</th>
                  <th className="text-left px-5 py-3">Date & Time</th>
                  <th className="text-left px-5 py-3">Coordinator</th>
                  <th className="text-left px-5 py-3">Attendance</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {evLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>{[...Array(8)].map((_, j) => (
                      <td key={j} className="px-5 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse w-24" /></td>
                    ))}</tr>
                  ))
                ) : filteredEvents.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">
                    No events found. Add your first campaign event.
                  </td></tr>
                ) : filteredEvents.map(ev => {
                  const typeInfo = EVENT_TYPES.find(t => t.value === ev.type);
                  const Icon = typeInfo?.icon ?? Megaphone;
                  return (
                    <tr key={ev.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shrink-0">
                            <Icon size={14} className="text-white" />
                          </div>
                          <span className="font-semibold text-gray-900 max-w-[180px] truncate">{ev.title}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs capitalize">{typeInfo?.label ?? ev.type}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin size={11} className="shrink-0" />
                          <span className="max-w-[160px] truncate">{ev.location}</span>
                        </div>
                        {ev.district && <p className="text-[10px] text-gray-400 ml-4">{ev.district}</p>}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1"><Calendar size={11} />{new Date(ev.event_date).toLocaleDateString("en-IN")}</div>
                        <p className="text-[10px] text-gray-400 mt-0.5">{ev.event_time}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">{ev.coordinator ?? "—"}</td>
                      <td className="px-5 py-3 text-gray-700 text-xs font-semibold">
                        {ev.expected_attendance > 0 ? ev.expected_attendance.toLocaleString() : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[ev.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {ev.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(ev)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(ev.id)} disabled={deleting === ev.id}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors disabled:opacity-40">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ═══════════════ BOOTHS TAB ═══════════════ */}
      {tab === "booths" && (
        <div className="-mx-8 -mb-8">
          <WebBooths />
        </div>
      )}

      {/* ═══ Add/Edit Event Drawer ═══ */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowForm(false)} />
          <div className="fixed right-0 top-0 h-full w-[460px] bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="font-black text-gray-900">{editEvent ? "Edit Event" : "Add Campaign Event"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Event Title <span className="text-red-400">*</span></label>
                <input required type="text" placeholder="e.g. Hinganghat Grand Rally" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 transition" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-white focus:border-blue-400 transition">
                    {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-white focus:border-blue-400 transition capitalize">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Location <span className="text-red-400">*</span></label>
                <input required type="text" placeholder="e.g. Town Hall, Baramati" value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 transition" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">District</label>
                  <input type="text" placeholder="e.g. Wardha" value={form.district}
                    onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 transition" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Election Type</label>
                  <select value={form.election_id} onChange={e => setForm(f => ({ ...f, election_id: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-white focus:border-blue-400 transition">
                    <option value="">— Select —</option>
                    {[["ls","Lok Sabha"],["vs","Vidhan Sabha"],["vp","Vidhan Parishad"],["mc","Mun. Corp"],["zp","Zilla Parishad"],["ps","Panchayat Samiti"],["gp","Gram Panchayat"],["np","Nagar Panchayat"]].map(([v,l]) =>
                      <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Date <span className="text-red-400">*</span></label>
                  <input required type="date" value={form.event_date}
                    onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 transition" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Time</label>
                  <input type="text" placeholder="e.g. 5:00 PM" value={form.event_time}
                    onChange={e => setForm(f => ({ ...f, event_time: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 transition" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Coordinator</label>
                  <input type="text" placeholder="Coordinator name" value={form.coordinator}
                    onChange={e => setForm(f => ({ ...f, coordinator: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 transition" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Expected Attendance</label>
                  <input type="number" placeholder="0" value={form.expected_attendance}
                    onChange={e => setForm(f => ({ ...f, expected_attendance: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 transition" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea value={form.notes} rows={3} placeholder="Additional details…"
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 transition resize-none" />
              </div>

              <button type="submit" disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl py-3 text-sm transition-colors">
                {saving ? "Saving…" : editEvent ? "Update Event" : "Add Event"}
              </button>
            </form>
          </div>
        </>
      )}

    </div>
  );
}
