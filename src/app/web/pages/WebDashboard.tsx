import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  Users, MapPin, MonitorCheck, ClipboardList,
  TrendingUp, Activity, AlertTriangle, CheckCircle2,
  Plus, Pencil, Trash2, X, Crown, GripVertical,
} from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

/* ─── Types ──────────────────────────────────────────────── */
interface Stats {
  districts: number; talukas: number; villages: number;
  volunteers: number; booths: number; surveys: number;
  active_volunteers: number; critical_booths: number;
}

interface Leader {
  id: number; name: string; designation: string;
  category: string; photo_url: string | null;
  sort_order: number; is_active: boolean;
}

/* ─── Constants ──────────────────────────────────────────── */
const ROLE_WELCOME: Record<string, string> = {
  super_admin:     "Full system access. Manage users, data and analytics.",
  state_leader:    "Maharashtra overview. All 36 districts at a glance.",
  district_leader: "Your district at a glance. Booths, volunteers, surveys.",
  observer:        "Read-only analytics view across the platform.",
};

const CATEGORIES = [
  { key: "",         label: "All"       },
  { key: "national", label: "National"  },
  { key: "mp",       label: "MPs"       },
  { key: "mla",      label: "MLAs"      },
  { key: "youth",    label: "Youth"     },
  { key: "district", label: "District"  },
];

const CAT_COLORS: Record<string, string> = {
  national: "bg-blue-100 text-blue-700",
  mp:       "bg-purple-100 text-purple-700",
  mla:      "bg-green-100 text-green-700",
  youth:    "bg-orange-100 text-orange-700",
  district: "bg-teal-100 text-teal-700",
};

const AVATAR_GRADIENTS = [
  "from-blue-600 to-cyan-500",
  "from-purple-600 to-pink-500",
  "from-emerald-600 to-teal-500",
  "from-orange-500 to-amber-400",
  "from-rose-500 to-pink-600",
  "from-indigo-600 to-violet-500",
  "from-cyan-600 to-blue-500",
  "from-green-600 to-emerald-500",
];

function avatarGradient(name: string) {
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx];
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

const EMPTY_FORM = { name: "", designation: "", category: "national", photo_url: "", sort_order: "0" };

/* ─── GaugeBar helper ────────────────────────────────────── */
function StatCard({ value, label, icon: Icon, color }: { value: string | number; label: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
        <Icon size={18} className="text-white" />
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 font-semibold mt-0.5">{label}</p>
    </div>
  );
}

/* ─── Draggable Leader Card ──────────────────────────────── */
const DRAG_TYPE = "LEADER_CARD";

interface DragCardProps {
  leader: Leader; index: number;
  moveCard: (from: number, to: number) => void;
  onDragEnd: () => void;
  onEdit: (l: Leader) => void;
  onDelete: (l: Leader) => void;
  isSuperAdmin: boolean;
  canDrag: boolean;
}

function DraggableLeaderCard({ leader, index, moveCard, onDragEnd, onEdit, onDelete, isSuperAdmin, canDrag }: DragCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: DRAG_TYPE,
    item: { index },
    canDrag: () => canDrag,
    end: (_item, monitor) => { if (monitor.didDrop()) onDragEnd(); },
    collect: m => ({ isDragging: m.isDragging() }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: DRAG_TYPE,
    hover(item: { index: number }) {
      if (item.index === index) return;
      moveCard(item.index, index);
      item.index = index;
    },
    collect: m => ({ isOver: m.isOver() }),
  });

  drag(drop(ref));

  return (
    <div ref={ref}
      className={`relative bg-white rounded-2xl p-5 flex flex-col items-center text-center border transition-all
        ${isDragging ? "opacity-30 scale-95" : "opacity-100"}
        ${isOver ? "border-blue-400 shadow-lg shadow-blue-100" : "border-gray-100 hover:border-blue-200 hover:shadow-lg"}
        ${canDrag ? "cursor-grab active:cursor-grabbing" : ""}
      `}>

      {/* Drag handle — top-left, super_admin only */}
      {canDrag && (
        <div className="absolute top-2 left-2 text-gray-300 hover:text-blue-400 transition-colors">
          <GripVertical size={14} />
        </div>
      )}

      {/* Edit/Delete — top-right */}
      {isSuperAdmin && (
        <div className="absolute top-2.5 right-2.5 flex gap-1">
          <button onClick={() => onEdit(leader)}
            className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-blue-50 hover:border-blue-300 shadow-sm transition-colors">
            <Pencil size={11} className="text-blue-600" />
          </button>
          <button onClick={() => onDelete(leader)}
            className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:border-red-300 shadow-sm transition-colors">
            <Trash2 size={11} className="text-red-500" />
          </button>
        </div>
      )}

      {/* Circular photo / avatar */}
      <div className="mb-4 mt-1">
        {leader.photo_url ? (
          <img src={leader.photo_url} alt={leader.name}
            className="w-20 h-20 rounded-full object-cover ring-4 ring-gray-100 shadow-md"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${avatarGradient(leader.name)} flex items-center justify-center text-white font-black text-xl shadow-md ring-4 ring-gray-100`}>
            {initials(leader.name)}
          </div>
        )}
      </div>

      <p className="font-bold text-sm text-gray-900 leading-tight mb-1">{leader.name}</p>
      <p className="text-[11px] text-gray-500 leading-snug mb-3 line-clamp-2">{leader.designation}</p>
      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize ${CAT_COLORS[leader.category] ?? "bg-gray-100 text-gray-500"}`}>
        {leader.category}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function WebDashboard() {
  const { user, token } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  /* Leaders state */
  const [leaders,    setLeaders]    = useState<Leader[]>([]);
  const [lLoading,   setLLoading]   = useState(true);
  const [lError,     setLError]     = useState("");
  const [activeTab,  setActiveTab]  = useState("");
  const [showAllLeaders, setShowAllLeaders] = useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [editLeader, setEditLeader] = useState<Leader | null>(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState("");
  const [dragList,   setDragList]   = useState<Leader[]>([]);
  const [orderSaving, setOrderSaving] = useState(false);

  const hdr = useCallback(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  /* ── Load stats ─────────────────────────────────────────── */
  useEffect(() => {
    const ctrl = new AbortController();
    async function load() {
      try {
        const [dRes, bRes] = await Promise.all([
          fetch("/api/hierarchy/districts", { headers: hdr(), signal: ctrl.signal }),
          fetch("/api/booths?limit=1",       { headers: hdr(), signal: ctrl.signal }),
        ]);
        const districts: { taluka_count: number; village_count: number }[] = dRes.ok ? await dRes.json() : [];
        const boothData = bRes.ok ? await bRes.json() : { total: 0 };
        setStats({
          districts: districts.length,
          talukas:   districts.reduce((s, d) => s + d.taluka_count, 0),
          villages:  districts.reduce((s, d) => s + d.village_count, 0),
          volunteers: 0, surveys: 0, active_volunteers: 0, critical_booths: 0,
          booths: boothData.total ?? 0,
        });
      } catch { /* abort */ } finally { setLoading(false); }
    }
    load();
    return () => ctrl.abort();
  }, [hdr]);

  /* ── Load leaders ───────────────────────────────────────── */
  const loadLeaders = useCallback(async () => {
    setLLoading(true);
    setLError("");
    try {
      const res = await fetch("/api/leaders", { headers: hdr() });
      if (res.ok) {
        setLeaders(await res.json());
      } else {
        const d = await res.json().catch(() => ({}));
        setLError(d.error ?? `Error ${res.status} — restart the backend server`);
      }
    } catch {
      setLError("Cannot reach backend — restart the server and refresh");
    } finally { setLLoading(false); }
  }, [hdr]);

  useEffect(() => { loadLeaders(); }, [loadLeaders]);

  /* ── Open add form ──────────────────────────────────────── */
  function openAdd() {
    setEditLeader(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  }

  /* ── Open edit form ─────────────────────────────────────── */
  function openEdit(l: Leader) {
    setEditLeader(l);
    setForm({
      name:        l.name,
      designation: l.designation,
      category:    l.category,
      photo_url:   l.photo_url ?? "",
      sort_order:  String(l.sort_order),
    });
    setFormError("");
    setShowForm(true);
  }

  /* ── Save (create or update) ────────────────────────────── */
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setFormError("");
    try {
      const body = {
        name:        form.name.trim(),
        designation: form.designation.trim(),
        category:    form.category,
        photo_url:   form.photo_url.trim() || null,
        sort_order:  parseInt(form.sort_order) || 0,
      };
      const url    = editLeader ? `/api/leaders/${editLeader.id}` : "/api/leaders";
      const method = editLeader ? "PUT" : "POST";
      const res    = await fetch(url, { method, headers: hdr(), body: JSON.stringify(body) });
      const data   = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Save failed"); return; }
      setShowForm(false);
      loadLeaders();
    } finally { setSaving(false); }
  }

  /* ── Delete ─────────────────────────────────────────────── */
  async function handleDelete(l: Leader) {
    if (!confirm(`Remove ${l.name}?`)) return;
    await fetch(`/api/leaders/${l.id}`, { method: "DELETE", headers: hdr() });
    loadLeaders();
  }

  /* ── Filtered + deduplicated leaders (handles seed-ran-twice duplicates) */
  const filtered = (() => {
    const base = activeTab ? leaders.filter(l => l.category === activeTab) : leaders;
    const seen = new Set<string>();
    return base.filter(l => {
      const key = activeTab ? `${l.name}|${l.category}` : l.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  /* ── Sync drag list whenever leaders or activeTab changes ── */
  useEffect(() => { setDragList(filtered); }, [leaders, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Drag reorder (local) ────────────────────────────────── */
  const moveCard = useCallback((from: number, to: number) => {
    setDragList(prev => {
      const copy = [...prev];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  }, []);

  /* ── Persist new order to backend ───────────────────────── */
  const saveDragOrder = useCallback(async () => {
    setOrderSaving(true);
    try {
      await Promise.all(
        dragList.map((l, i) =>
          fetch(`/api/leaders/${l.id}`, {
            method: "PUT",
            headers: hdr(),
            body: JSON.stringify({ sort_order: i + 1 }),
          })
        )
      );
      await loadLeaders();
    } finally { setOrderSaving(false); }
  }, [dragList, hdr, loadLeaders]);

  /* ── Stat cards config ───────────────────────────────────── */
  const role = user?.role ?? "";
  const STAT_CARDS = [
    { label: "Districts",  value: stats?.districts ?? "—",                    icon: MapPin,        color: "from-blue-600 to-cyan-500",    roles: ["super_admin","state_leader","observer"] },
    { label: "Talukas",    value: stats?.talukas ?? "—",                      icon: MapPin,        color: "from-purple-600 to-pink-500",  roles: ["super_admin","state_leader","observer"] },
    { label: "Villages",   value: stats?.villages?.toLocaleString() ?? "—",   icon: MapPin,        color: "from-emerald-600 to-teal-500", roles: ["super_admin","state_leader","observer"] },
    { label: "Total Booths",value: stats?.booths ?? "—",                      icon: MonitorCheck,  color: "from-orange-500 to-amber-400", roles: ["super_admin","state_leader","district_leader"] },
    { label: "Volunteers", value: stats?.volunteers ?? "—",                   icon: Users,         color: "from-rose-500 to-pink-500",    roles: ["super_admin","state_leader","district_leader"] },
    { label: "Surveys Filed",value: stats?.surveys ?? "—",                    icon: ClipboardList, color: "from-indigo-600 to-violet-500",roles: ["super_admin","state_leader","district_leader","observer"] },
    { label: "Active Workers",value: stats?.active_volunteers ?? "—",         icon: Activity,      color: "from-green-600 to-emerald-500",roles: ["super_admin","state_leader","district_leader"] },
    { label: "Critical Booths",value: stats?.critical_booths ?? "—",          icon: AlertTriangle, color: "from-red-500 to-rose-600",     roles: ["super_admin","state_leader","district_leader"] },
  ].filter(c => c.roles.includes(role));

  /* ─────────────────────────────────────────────────────────── */
  return (
    <div className="p-8">

      {/* ── Page header ───────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Welcome, {user?.name?.split(" ")[0]} 👋</h1>
        <p className="text-gray-500 mt-1 text-sm">{ROLE_WELCOME[role]}</p>
      </div>

      {/* ══ PARTY LEADERS — right below welcome ══════════════ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">

        {/* Section header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-700 to-cyan-500 flex items-center justify-center">
              <Crown size={16} className="text-white" />
            </div>
            <div>
              <h2 className="font-black text-gray-900 text-base">Party Leaders</h2>
              <p className="text-xs text-gray-400">{leaders.length} leaders · master data</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {filtered.length > 6 && (
              <button onClick={() => setShowAllLeaders(v => !v)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold transition-colors">
                {showAllLeaders ? "Show Less" : `View All ${filtered.length} Leaders`}
              </button>
            )}
            {isSuperAdmin && (
              <button onClick={openAdd}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors">
                <Plus size={14} /> Add Leader
              </button>
            )}
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 px-6 py-3 border-b border-gray-100 overflow-x-auto">
          {CATEGORIES.map(c => (
            <button key={c.key} onClick={() => { setActiveTab(c.key); setShowAllLeaders(false); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === c.key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}>
              {c.label}
              <span className="ml-1.5 opacity-70">
                {c.key === "" ? leaders.length : leaders.filter(l => l.category === c.key).length}
              </span>
            </button>
          ))}
        </div>

        {/* Leaders grid — collapsed (6) or expanded (all) with drag-to-reorder */}
        {lLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 p-6">
            {[...Array(6)].map((_, i) => <div key={i} className="bg-gray-50 rounded-2xl h-52 animate-pulse" />)}
          </div>
        ) : lError ? (
          <div className="text-center py-12 px-6">
            <p className="text-red-500 text-sm font-semibold mb-1">{lError}</p>
            <button onClick={loadLeaders} className="text-blue-600 text-xs underline mt-1">Retry</button>
          </div>
        ) : dragList.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No leaders in this category</div>
        ) : (
          <>
            <DndProvider backend={HTML5Backend}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5 p-6">
                {(showAllLeaders ? dragList : dragList.slice(0, 6)).map((leader, index) => (
                  <DraggableLeaderCard
                    key={leader.id}
                    leader={leader}
                    index={index}
                    moveCard={moveCard}
                    onDragEnd={saveDragOrder}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    isSuperAdmin={isSuperAdmin}
                    canDrag={isSuperAdmin && showAllLeaders}
                  />
                ))}
              </div>
            </DndProvider>

            {/* Footer bar */}
            <div className="border-t border-gray-100 px-6 py-3 flex items-center justify-between bg-gray-50">
              <p className="text-xs text-gray-400">
                {showAllLeaders
                  ? isSuperAdmin
                    ? orderSaving
                      ? "Saving order…"
                      : `Drag cards to reorder · ${dragList.length} leaders`
                    : `${dragList.length} leaders`
                  : `Showing 6 of ${dragList.length} leaders`
                }
              </p>
              {dragList.length > 6 && (
                <button onClick={() => setShowAllLeaders(v => !v)}
                  className="text-blue-600 text-xs font-bold hover:underline">
                  {showAllLeaders ? "Show Less ↑" : `View All ${dragList.length} Leaders →`}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Analytics Stats ───────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-28 border border-gray-100 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {STAT_CARDS.map(c => <StatCard key={c.label} value={c.value} label={c.label} icon={c.icon} color={c.color} />)}
        </div>
      )}

      {/* ── Access rights (non-superadmin) ────────────────── */}
      {!isSuperAdmin && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={16} className="text-green-500" />
            <h2 className="font-bold text-sm text-gray-800">Your Access Rights</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {[
              { label: "View Analytics",            ok: true },
              { label: "View Districts / Hierarchy", ok: ["super_admin","state_leader","observer"].includes(role) },
              { label: "View Volunteers",            ok: ["super_admin","state_leader","district_leader"].includes(role) },
              { label: "View Booths",                ok: ["super_admin","state_leader","district_leader"].includes(role) },
              { label: "View Surveys",               ok: true },
              { label: "Register Users",             ok: ["super_admin","state_leader","district_leader"].includes(role) },
              { label: "Manage All Users",           ok: role === "super_admin" },
              { label: "Write / Edit Data",          ok: role !== "observer" },
            ].map(({ label, ok }) => (
              <div key={label} className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${ok ? "bg-green-100" : "bg-gray-100"}`}>
                  {ok ? <CheckCircle2 size={10} className="text-green-600" /> : <TrendingUp size={10} className="text-gray-400" />}
                </span>
                <span className={ok ? "text-gray-700 font-medium" : "text-gray-400 line-through"}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ Add / Edit Drawer ════════════════════════════════ */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowForm(false)} />
          <div className="fixed right-0 top-0 h-full w-[400px] bg-white shadow-2xl z-50 flex flex-col">

            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="font-black text-gray-900">{editLeader ? "Edit Leader" : "Add Leader"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {formError && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-xl">{formError}</p>}

              {/* Photo preview */}
              <div className="flex justify-center mb-2">
                {form.photo_url ? (
                  <img src={form.photo_url} alt="preview"
                    className="w-20 h-20 rounded-2xl object-cover ring-2 ring-blue-200 shadow"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${avatarGradient(form.name || "?")} flex items-center justify-center text-white font-black text-2xl shadow ring-2 ring-blue-100`}>
                    {form.name ? initials(form.name) : "?"}
                  </div>
                )}
              </div>

              {[
                { id: "name",        label: "Full Name",         type: "text",   ph: "e.g. Sharad Pawar"           },
                { id: "designation", label: "Designation",       type: "text",   ph: "e.g. National President"     },
                { id: "photo_url",   label: "Photo URL",         type: "url",    ph: "https://… (paste image link)" },
                { id: "sort_order",  label: "Sort Order",        type: "number", ph: "0"                           },
              ].map(({ id, label, type, ph }) => (
                <div key={id}>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">{label}</label>
                  <input type={type} placeholder={ph}
                    required={id === "name" || id === "designation"}
                    value={(form as Record<string, string>)[id]}
                    onChange={e => setForm(f => ({ ...f, [id]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition" />
                </div>
              ))}

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400">
                  <option value="national">National</option>
                  <option value="mp">MP</option>
                  <option value="mla">MLA</option>
                  <option value="youth">Youth</option>
                  <option value="district">District</option>
                </select>
              </div>

              <button type="submit" disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl py-3 text-sm transition-colors mt-2">
                {saving ? "Saving…" : editLeader ? "Save Changes" : "Add Leader"}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
