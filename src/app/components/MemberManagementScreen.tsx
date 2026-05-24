import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Plus, Search, X, Loader, Users, Phone,
  Eye, EyeOff, CheckCircle, AlertCircle, ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

interface Member {
  id: number;
  name: string;
  mobile: string;
  role: string;
  is_active: boolean;
  district_name?: string;
  area_name?: string;
}

const ROLE_LABELS: Record<string, string> = {
  karyakarta:      "Karyakarta",
  booth_worker:    "Booth Worker",
  booth_leader:    "Booth Leader",
  village_leader:  "Village Leader",
  taluka_leader:   "Taluka Leader",
};

const ROLE_COLORS: Record<string, string> = {
  karyakarta:      "bg-orange-100 text-orange-700",
  booth_worker:    "bg-indigo-100 text-indigo-700",
  booth_leader:    "bg-rose-100 text-rose-700",
  village_leader:  "bg-cyan-100 text-cyan-700",
  taluka_leader:   "bg-purple-100 text-purple-700",
};

const GRAD: Record<string, string> = {
  karyakarta:      "from-orange-500 to-amber-400",
  booth_worker:    "from-indigo-600 to-violet-500",
  booth_leader:    "from-rose-500 to-pink-500",
  village_leader:  "from-cyan-600 to-blue-500",
  taluka_leader:   "from-purple-600 to-pink-500",
};

const ADDABLE_ROLES = [
  { value: "karyakarta",   label: "Karyakarta"   },
  { value: "booth_worker", label: "Booth Worker"  },
  { value: "booth_leader", label: "Booth Leader"  },
  { value: "village_leader", label: "Village Leader" },
  { value: "taluka_leader",  label: "Taluka Leader"  },
];

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function MemberManagementScreen() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { isDark } = useTheme();

  const [tab, setTab] = useState<"karyakarta" | "volunteer">("karyakarta");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  /* ── Add member sheet ── */
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", mobile: "", password: "", role: "karyakarta" });
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const authHdr = { Authorization: `Bearer ${token}` };

  const loadMembers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const roleFilter = tab === "karyakarta" ? "karyakarta" : "booth_worker,booth_leader,village_leader,taluka_leader";
      const res = await fetch(`/api/volunteers?role=${tab === "karyakarta" ? "karyakarta" : ""}`, { headers: authHdr });
      if (res.ok) {
        const all: Member[] = await res.json();
        if (tab === "karyakarta") {
          setMembers(all.filter(m => m.role === "karyakarta"));
        } else {
          setMembers(all.filter(m => m.role !== "karyakarta"));
        }
      }
    } finally { setLoading(false); }
  }, [token, tab]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  function openAdd() {
    setForm({ name: "", mobile: "", password: "", role: tab === "karyakarta" ? "karyakarta" : "booth_worker" });
    setShowPass(false);
    setSuccessMsg("");
    setErrorMsg("");
    setShowAdd(true);
  }

  async function handleAdd() {
    setErrorMsg("");
    if (!form.name.trim())   return setErrorMsg("Name is required");
    if (!form.mobile.trim()) return setErrorMsg("Mobile number is required");
    if (form.password.length < 6) return setErrorMsg("Password must be at least 6 characters");

    setSubmitting(true);
    try {
      const res = await fetch("/api/volunteers", {
        method: "POST",
        headers: { ...authHdr, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to add member");
      } else {
        setSuccessMsg(`${ROLE_LABELS[form.role] || form.role} "${data.name}" added successfully!`);
        setForm({ name: "", mobile: "", password: "", role: form.role });
        await loadMembers();
      }
    } finally { setSubmitting(false); }
  }

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.mobile.includes(search)
  );

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? "bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" : "bg-gray-50"}`}>

      {/* Header */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 text-white px-4 pt-5 pb-4 shadow-xl relative overflow-hidden flex-shrink-0">
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
              <h1 className="font-bold text-xl tracking-tight">Member Management</h1>
              <p className="text-xs text-blue-100 mt-0.5">Add & manage party members</p>
            </div>
            <button
              onClick={openAdd}
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
              placeholder="Search by name or mobile..."
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

      {/* Tabs */}
      <div className={`flex border-b flex-shrink-0 ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-gray-100"}`}>
        <button
          onClick={() => setTab("karyakarta")}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${tab === "karyakarta" ? "text-blue-600 border-b-2 border-blue-600" : isDark ? "text-gray-400" : "text-gray-400"}`}
        >
          Karyakarta
        </button>
        <button
          onClick={() => setTab("volunteer")}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${tab === "volunteer" ? "text-blue-600 border-b-2 border-blue-600" : isDark ? "text-gray-400" : "text-gray-400"}`}
        >
          Volunteers
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader size={24} className="animate-spin text-blue-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-3">
              <Users size={28} className="text-blue-300" />
            </div>
            <p className={`font-bold text-base mb-1 ${isDark ? "text-white" : "text-gray-700"}`}>
              {search ? "No match found" : `No ${tab === "karyakarta" ? "karyakartas" : "volunteers"} yet`}
            </p>
            <p className="text-xs text-gray-400 mb-4">
              {search ? "Try a different search" : "Tap the + button to add members."}
            </p>
            {!search && (
              <button
                onClick={openAdd}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-2xl shadow active:scale-95 transition-transform"
              >
                Add Member
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(m => (
              <div
                key={m.id}
                className={`flex items-center gap-3 px-4 py-3 ${isDark ? "border-white/5 hover:bg-white/5" : "hover:bg-gray-50"}`}
              >
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${GRAD[m.role] ?? "from-gray-400 to-gray-500"} flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0`}>
                  {initials(m.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className={`font-bold text-sm truncate ${isDark ? "text-white" : "text-gray-900"}`}>{m.name}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${ROLE_COLORS[m.role] ?? "bg-gray-100 text-gray-500"}`}>
                      {ROLE_LABELS[m.role] ?? m.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Phone size={11} />
                    <span>{m.mobile}</span>
                    {m.area_name && <><span className="text-gray-300">·</span><span className="truncate">{m.area_name}</span></>}
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full shrink-0 ${m.is_active ? "bg-emerald-500" : "bg-gray-300"}`} />
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <p className="text-center text-xs text-gray-400 py-5">
            {filtered.length} member{filtered.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={openAdd}
        className="fixed bottom-24 right-5 w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-30"
      >
        <Plus size={24} />
      </button>

      {/* ── Add Member sheet ── */}
      {showAdd && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => !submitting && setShowAdd(false)} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-center pt-3 shrink-0"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>

            {/* Sheet header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-base text-gray-900">Add Member</h3>
              <button onClick={() => setShowAdd(false)} disabled={submitting} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                <X size={15} className="text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

              {/* Success banner */}
              {successMsg && (
                <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
                  <CheckCircle size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-emerald-700 font-medium">{successMsg}</p>
                </div>
              )}

              {/* Error banner */}
              {errorMsg && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                  <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-600 font-medium">{errorMsg}</p>
                </div>
              )}

              {/* Role selector */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {ADDABLE_ROLES.map(r => (
                    <button
                      key={r.value}
                      onClick={() => setForm(f => ({ ...f, role: r.value }))}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${form.role === r.value ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300"}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block">Full Name</label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={form.name}
                  onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrorMsg(""); setSuccessMsg(""); }}
                  className="w-full h-11 px-4 rounded-xl bg-gray-100 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-gray-400"
                />
              </div>

              {/* Mobile */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block">Mobile Number</label>
                <div className="flex gap-2">
                  <div className="w-14 h-11 bg-gray-100 rounded-xl flex items-center justify-center text-sm font-bold text-gray-500 shrink-0">+91</div>
                  <input
                    type="tel"
                    placeholder="10-digit mobile"
                    value={form.mobile}
                    onChange={e => { setForm(f => ({ ...f, mobile: e.target.value })); setErrorMsg(""); setSuccessMsg(""); }}
                    maxLength={10}
                    className="flex-1 h-11 px-4 rounded-xl bg-gray-100 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block">Login Password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setErrorMsg(""); setSuccessMsg(""); }}
                    className="w-full h-11 px-4 pr-11 rounded-xl bg-gray-100 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1 px-1">Member will use this password to log in to the app.</p>
              </div>
            </div>

            {/* Submit */}
            <div className="px-4 py-4 border-t border-gray-100 shrink-0">
              <button
                onClick={handleAdd}
                disabled={submitting}
                className="w-full h-12 bg-blue-600 disabled:bg-gray-300 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
              >
                {submitting ? (
                  <Loader size={18} className="animate-spin" />
                ) : (
                  <>
                    <Plus size={16} />
                    Add {ROLE_LABELS[form.role] || "Member"}
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
