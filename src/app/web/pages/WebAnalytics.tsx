import { useEffect, useState, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { TrendingUp, Target, Users, BarChart2, Upload, Crown, Loader, CheckCircle, AlertCircle, X, Pencil, Trash2 } from "lucide-react";

const ELECTIONS = [
  { id: "zp", label: "Zilla Parishad" },
  { id: "vs", label: "Vidhan Sabha"   },
  { id: "ls", label: "Lok Sabha"      },
  { id: "mc", label: "Municipal Corp" },
  { id: "vp", label: "Village Panch"  },
];

interface Issue  { label: string; score: number; icon: string }
interface Area   { id: string; name: string; vote_share: number; prev_vote_share: number; coverage_pct: number }
interface Summary {
  win_probability: number; avg_vote_share: number; avg_coverage: number;
  total_volunteers: number; total_voters: number;
  confirmed_ncp: number; undecided: number; opposition: number;
  areas: Area[]; issues: Issue[];
}

interface CabinetMember { id: number; name: string; designation: string; department: string | null; party: string | null; sr_no: number | null; photo_url: string | null; }

const AVATAR_GRADIENTS = [
  "from-blue-600 to-cyan-500",   "from-purple-600 to-pink-500",
  "from-emerald-600 to-teal-500","from-orange-500 to-amber-400",
  "from-rose-500 to-pink-600",   "from-indigo-600 to-violet-500",
  "from-cyan-600 to-blue-500",   "from-green-600 to-emerald-500",
];
function avatarGradient(name: string) {
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx];
}
function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function GaugeBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div className={`h-2 rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

export default function WebAnalytics() {
  const { token, user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const [election,  setElection]  = useState("zp");
  const [summary,   setSummary]   = useState<Summary | null>(null);
  const [loading,   setLoading]   = useState(true);

  /* ── Cabinet state ── */
  const [cabinet,        setCabinet]        = useState<CabinetMember[]>([]);
  const [cabLoading,     setCabLoading]     = useState(true);
  const [showAllCabinet, setShowAllCabinet] = useState(false);
  const [importing,      setImporting]      = useState(false);
  const [importMsg,      setImportMsg]      = useState<{ type: "success" | "error"; text: string } | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  /* ── Edit / Delete state ── */
  const [editingMember,    setEditingMember]    = useState<CabinetMember | null>(null);
  const [editForm,         setEditForm]         = useState({ name: "", designation: "", department: "", party: "" });
  const [saving,           setSaving]           = useState(false);
  const [deletingMember,   setDeletingMember]   = useState<CabinetMember | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deleting,         setDeleting]         = useState(false);

  const authHdr = { Authorization: `Bearer ${token}` };

  async function loadCabinet() {
    setCabLoading(true);
    try {
      const res = await fetch("/api/leaders?category=cabinet", { headers: authHdr });
      if (res.ok) setCabinet(await res.json());
    } finally { setCabLoading(false); }
  }

  useEffect(() => { loadCabinet(); }, [token]);

  async function handleExcelImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    setImportMsg(null);
    try {
      const fd = new FormData();
      fd.append("excel", file);
      const res = await fetch("/api/leaders/import-cabinet", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (res.ok) {
        setImportMsg({ type: "success", text: `Successfully imported ${data.count} cabinet members from Excel.` });
        await loadCabinet();
      } else {
        setImportMsg({ type: "error", text: data.error || "Import failed" });
      }
    } catch (err: any) {
      setImportMsg({ type: "error", text: err?.message || "Failed to read Excel file" });
    } finally { setImporting(false); }
  }

  function openEdit(member: CabinetMember) {
    setEditingMember(member);
    setEditForm({
      name:        member.name,
      designation: member.designation ?? "",
      department:  member.department  ?? "",
      party:       member.party       ?? "",
    });
  }

  async function handleSaveEdit() {
    if (!editingMember) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leaders/${editingMember.id}`, {
        method: "PUT",
        headers: { ...authHdr, "Content-Type": "application/json" },
        body: JSON.stringify({
          name:        editForm.name.trim()        || undefined,
          designation: editForm.designation.trim() || undefined,
          department:  editForm.department.trim()  || undefined,
          party:       editForm.party.trim()       || undefined,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCabinet(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
        setEditingMember(null);
      }
    } finally { setSaving(false); }
  }

  async function handleDeleteOne() {
    if (!deletingMember) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/leaders/${deletingMember.id}`, { method: "DELETE", headers: authHdr });
      if (res.ok) {
        setCabinet(prev => prev.filter(m => m.id !== deletingMember.id));
        setDeletingMember(null);
      }
    } finally { setDeleting(false); }
  }

  async function handleDeleteAll() {
    setDeleting(true);
    try {
      const res = await fetch("/api/leaders/cabinet/all", { method: "DELETE", headers: authHdr });
      if (res.ok) {
        setCabinet([]);
        setConfirmDeleteAll(false);
      }
    } finally { setDeleting(false); }
  }

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    fetch(`/api/analytics/summary?election_id=${election}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setSummary(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [token, election]);

  const winColor = (p: number) => p >= 65 ? "bg-green-500" : p >= 45 ? "bg-amber-400" : "bg-red-500";

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Analytics</h1>
          <p className="text-gray-400 text-sm mt-0.5">Election performance & voter insights</p>
        </div>
        <select value={election} onChange={e => setElection(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 outline-none shadow-sm">
          {ELECTIONS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
      </div>

      {/* ══ STATE CABINET SECTION ══════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Crown size={16} className="text-white" />
            </div>
            <div>
              <h2 className="font-black text-gray-900 text-base">List of State Cabinet</h2>
              <p className="text-xs text-gray-400">As per Government Gazette · {cabinet.length} members</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {cabinet.length > 6 && (
              <button onClick={() => setShowAllCabinet(v => !v)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold transition-colors">
                {showAllCabinet ? "Show Less" : `View All ${cabinet.length}`}
              </button>
            )}
            {isSuperAdmin && (
              <>
                <input ref={pdfInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelImport} />
                {cabinet.length > 0 && (
                  <button
                    onClick={() => setConfirmDeleteAll(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-sm font-bold transition-colors"
                  >
                    <Trash2 size={14} />
                    Delete All
                  </button>
                )}
                <button
                  onClick={() => pdfInputRef.current?.click()}
                  disabled={importing}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-bold transition-colors"
                >
                  {importing ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />}
                  {importing ? "Importing…" : "Import Excel"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Import result banner */}
        {importMsg && (
          <div className={`flex items-center gap-3 px-6 py-3 border-b ${importMsg.type === "success" ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
            {importMsg.type === "success"
              ? <CheckCircle size={16} className="text-emerald-600 shrink-0" />
              : <AlertCircle size={16} className="text-red-500 shrink-0" />}
            <p className={`text-sm font-medium flex-1 ${importMsg.type === "success" ? "text-emerald-700" : "text-red-600"}`}>{importMsg.text}</p>
            <button onClick={() => setImportMsg(null)}><X size={14} className="text-gray-400 hover:text-gray-600" /></button>
          </div>
        )}

        {/* Cards grid */}
        {cabLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 p-6">
            {[...Array(8)].map((_, i) => <div key={i} className="bg-gray-50 rounded-2xl h-36 animate-pulse" />)}
          </div>
        ) : cabinet.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-6">
            {/* Placeholder silhouette cards */}
            <div className="flex gap-3 mb-5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-full bg-gray-100 border-2 border-dashed border-gray-200 flex items-center justify-center">
                    <Users size={20} className="text-gray-300" />
                  </div>
                  <div className="w-12 h-2 bg-gray-100 rounded-full" />
                  <div className="w-8 h-2 bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
            <p className="text-sm font-bold text-gray-500 mb-1">No cabinet list imported yet</p>
            <p className="text-xs text-gray-400 mb-4">Upload an Excel file (.xlsx) with columns: Sr No, Minister Name, Position, Department, Party</p>
            {isSuperAdmin && (
              <button
                onClick={() => pdfInputRef.current?.click()}
                disabled={importing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-colors shadow-sm"
              >
                <Upload size={14} />
                Import List of State Cabinet
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 p-6">
              {(showAllCabinet ? cabinet : cabinet.slice(0, 6)).map((member) => (
                <div key={member.id} className="relative flex flex-col items-center text-center bg-gray-50 rounded-2xl p-4 border border-gray-100 hover:border-amber-200 hover:shadow-md transition-all group">
                  {/* Edit / Delete buttons */}
                  {isSuperAdmin && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(member)}
                        className="w-6 h-6 rounded-lg bg-white shadow border border-gray-200 flex items-center justify-center hover:bg-blue-50 hover:border-blue-300 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={11} className="text-blue-500" />
                      </button>
                      <button
                        onClick={() => setDeletingMember(member)}
                        className="w-6 h-6 rounded-lg bg-white shadow border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:border-red-300 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={11} className="text-red-500" />
                      </button>
                    </div>
                  )}
                  {member.sr_no && (
                    <span className="self-start text-[10px] font-bold text-gray-400 mb-1">#{member.sr_no}</span>
                  )}
                  {member.photo_url ? (
                    <img src={member.photo_url} alt={member.name}
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-white shadow mb-2"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${avatarGradient(member.name)} flex items-center justify-center text-white font-black text-lg shadow ring-2 ring-white mb-2`}>
                      {initials(member.name)}
                    </div>
                  )}
                  <p className="text-xs font-bold text-gray-900 leading-tight line-clamp-2 mb-1">{member.name}</p>
                  {member.designation && (
                    <p className="text-[10px] font-semibold text-amber-600 mb-0.5">{member.designation}</p>
                  )}
                  {member.department && (
                    <p className="text-[10px] text-gray-400 line-clamp-2 leading-tight mb-1">{member.department}</p>
                  )}
                  {member.party && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 mt-auto">{member.party}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 px-6 py-3 flex items-center justify-between bg-gray-50">
              <p className="text-xs text-gray-400">
                {showAllCabinet ? `All ${cabinet.length} members` : `Showing ${Math.min(6, cabinet.length)} of ${cabinet.length} members`}
              </p>
              {cabinet.length > 8 && (
                <button onClick={() => setShowAllCabinet(v => !v)} className="text-amber-600 text-xs font-bold hover:underline">
                  {showAllCabinet ? "Show Less ↑" : `View All ${cabinet.length} →`}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-28 border border-gray-100 animate-pulse" />)}
        </div>
      ) : summary ? (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
            {[
              { label: "Win Probability",   value: `${summary.win_probability}%`,          icon: Target,    color: "from-blue-600 to-cyan-500"   },
              { label: "Avg Vote Share",     value: `${summary.avg_vote_share}%`,            icon: TrendingUp, color: "from-green-600 to-emerald-500" },
              { label: "Avg Coverage",       value: `${summary.avg_coverage}%`,              icon: BarChart2, color: "from-purple-600 to-pink-500" },
              { label: "Total Volunteers",   value: summary.total_volunteers.toLocaleString(),icon: Users,    color: "from-orange-500 to-amber-400" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
                  <Icon size={18} className="text-white" />
                </div>
                <p className="text-2xl font-black text-gray-900">{value}</p>
                <p className="text-xs text-gray-400 font-semibold mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
            {/* Win probability gauge */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Win Probability</p>
              <div className="flex items-end gap-3 mb-4">
                <p className="text-5xl font-black text-gray-900">{summary.win_probability}</p>
                <p className="text-2xl font-black text-gray-400 mb-1">%</p>
              </div>
              <GaugeBar pct={summary.win_probability} color={winColor(summary.win_probability)} />
              <p className="text-xs text-gray-400 mt-2">
                {summary.win_probability >= 65 ? "Strong lead" : summary.win_probability >= 45 ? "Competitive race" : "Needs attention"}
              </p>
            </div>

            {/* Voter breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Voter Breakdown</p>
              <div className="space-y-3">
                {[
                  { label: "Confirmed NCP",  value: summary.confirmed_ncp, color: "bg-green-500",  pct: summary.total_voters ? Math.round(summary.confirmed_ncp/summary.total_voters*100) : 0 },
                  { label: "Undecided",      value: summary.undecided,     color: "bg-amber-400",  pct: summary.total_voters ? Math.round(summary.undecided/summary.total_voters*100)     : 0 },
                  { label: "Opposition",     value: summary.opposition,    color: "bg-red-400",    pct: summary.total_voters ? Math.round(summary.opposition/summary.total_voters*100)    : 0 },
                ].map(({ label, value, color, pct }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
                      <span>{label}</span>
                      <span>{value.toLocaleString()} <span className="text-gray-400">({pct}%)</span></span>
                    </div>
                    <GaugeBar pct={pct} color={color} />
                  </div>
                ))}
              </div>
            </div>

            {/* Voter issues */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Top Voter Issues</p>
              <div className="space-y-3">
                {summary.issues.map((issue, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-lg w-7 text-center shrink-0">{issue.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                        <span className="truncate">{issue.label}</span>
                        <span className="shrink-0 ml-2 text-gray-400">{issue.score}%</span>
                      </div>
                      <GaugeBar pct={issue.score} color="bg-blue-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Areas table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-sm text-gray-800">Area Performance</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-6 py-3">Area</th>
                  <th className="text-left px-6 py-3">Vote Share</th>
                  <th className="text-left px-6 py-3">Prev Share</th>
                  <th className="text-left px-6 py-3">Coverage</th>
                  <th className="text-left px-6 py-3">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {summary.areas.map(a => {
                  const trend = a.vote_share - (a.prev_vote_share || 0);
                  return (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-semibold text-gray-900">{a.name}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${a.vote_share}%` }} />
                          </div>
                          <span className="text-gray-700 font-bold text-xs">{a.vote_share}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-gray-500 text-xs">{a.prev_vote_share || "—"}%</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${a.coverage_pct}%` }} />
                          </div>
                          <span className="text-gray-700 font-bold text-xs">{a.coverage_pct}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`text-xs font-bold ${trend > 0 ? "text-green-600" : trend < 0 ? "text-red-500" : "text-gray-400"}`}>
                          {trend > 0 ? `▲ +${trend.toFixed(1)}%` : trend < 0 ? `▼ ${trend.toFixed(1)}%` : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
          No analytics data for this election type.
        </div>
      )}

      {/* ── Edit Cabinet Member Modal ───────────────────────── */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setEditingMember(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-gray-900 text-base">Edit Cabinet Member</h3>
              <button onClick={() => setEditingMember(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={16} className="text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { label: "Minister Name", key: "name" as const, placeholder: "Full name" },
                { label: "Position",      key: "designation" as const, placeholder: "e.g. Cabinet Minister" },
                { label: "Department",    key: "department" as const, placeholder: "e.g. Home, Finance…" },
                { label: "Party",         key: "party" as const, placeholder: "e.g. NCP-SP" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="text-xs font-bold text-gray-600 mb-1 block">{label}</label>
                  <input
                    value={editForm[key]}
                    onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditingMember(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editForm.name.trim()}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <Loader size={14} className="animate-spin" /> : null}
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Single Member Confirmation ──────────────── */}
      {deletingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setDeletingMember(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="font-black text-gray-900 text-base text-center mb-1">Remove Cabinet Member</h3>
            <p className="text-sm text-gray-500 text-center mb-5">
              Are you sure you want to remove <span className="font-bold text-gray-800">{deletingMember.name}</span> from the cabinet list?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingMember(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleDeleteOne}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? <Loader size={14} className="animate-spin" /> : null}
                {deleting ? "Removing…" : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete All Confirmation ─────────────────────────── */}
      {confirmDeleteAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setConfirmDeleteAll(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="font-black text-gray-900 text-base text-center mb-1">Delete Entire Cabinet List</h3>
            <p className="text-sm text-gray-500 text-center mb-5">
              This will permanently remove all <span className="font-bold text-gray-800">{cabinet.length} members</span> from the cabinet list. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteAll(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? <Loader size={14} className="animate-spin" /> : null}
                {deleting ? "Deleting…" : "Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
