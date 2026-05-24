import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { Search, X, RefreshCw, Activity, UserPlus } from "lucide-react";

interface Volunteer {
  id: number; name: string; mobile: string; role: string;
  is_active: boolean; last_seen_at: string | null;
  district_name: string | null; area_name: string | null;
  booth_number: string | null; village: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  super_admin:     "bg-red-100 text-red-700",
  state_leader:    "bg-blue-100 text-blue-700",
  district_leader: "bg-purple-100 text-purple-700",
  taluka_leader:   "bg-orange-100 text-orange-700",
  village_leader:  "bg-cyan-100 text-cyan-700",
  booth_leader:    "bg-yellow-100 text-yellow-700",
  booth_worker:    "bg-green-100 text-green-700",
  karyakarta:      "bg-emerald-100 text-emerald-700",
  observer:        "bg-gray-100 text-gray-600",
};

const ROLE_FILTER_OPTIONS = [
  { value: "",               label: "All Roles"       },
  { value: "taluka_leader",  label: "Taluka Leaders"  },
  { value: "village_leader", label: "Village Leaders" },
  { value: "booth_leader",   label: "Booth Leaders"   },
  { value: "booth_worker",   label: "Booth Workers"   },
  { value: "karyakarta",     label: "Karyakarta"      },
  { value: "observer",       label: "Observers"       },
];

// Roles a registrar can add
const ADDABLE_ROLES: Record<string, { value: string; label: string }[]> = {
  super_admin: [
    { value: "state_leader",    label: "State Leader"    },
    { value: "district_leader", label: "District Leader" },
    { value: "taluka_leader",   label: "Taluka Leader"   },
    { value: "booth_leader",    label: "Booth Leader"    },
    { value: "booth_worker",    label: "Booth Worker"    },
    { value: "karyakarta",      label: "Karyakarta"      },
    { value: "observer",        label: "Observer"        },
  ],
  state_leader: [
    { value: "district_leader", label: "District Leader" },
    { value: "taluka_leader",   label: "Taluka Leader"   },
    { value: "village_leader",  label: "Village Leader"  },
    { value: "booth_leader",    label: "Booth Leader"    },
    { value: "booth_worker",    label: "Booth Worker"    },
    { value: "karyakarta",      label: "Karyakarta"      },
    { value: "observer",        label: "Observer"        },
  ],
  district_leader: [
    { value: "taluka_leader",   label: "Taluka Leader"   },
    { value: "village_leader",  label: "Village Leader"  },
    { value: "booth_leader",    label: "Booth Leader"    },
    { value: "booth_worker",    label: "Booth Worker"    },
    { value: "karyakarta",      label: "Karyakarta"      },
  ],
};

const EMPTY_FORM = { name: "", mobile: "", password: "", role: "karyakarta", customRole: "", area_id: "" };

export default function WebVolunteers() {
  const { token, user } = useAuth();
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState("");
  const [success,    setSuccess]    = useState("");

  const role = user?.role ?? "";
  const canAdd = ["super_admin", "state_leader", "district_leader"].includes(role);
  const showMobile = !["district_leader"].includes(role);
  const addableRoles = ADDABLE_ROLES[role] ?? [];

  const hdr = useCallback(() => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }), [token]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterRole) params.set("role", filterRole);
      const res = await fetch(`/api/volunteers?${params}`, { headers: hdr() });
      if (res.ok) setVolunteers(await res.json());
    } finally { setLoading(false); }
  }, [hdr, filterRole]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const finalRole = form.role === "__custom__" ? form.customRole.trim() : form.role;
    if (!finalRole) { setFormError("Please enter a custom role name"); return; }
    setSaving(true); setFormError(""); setSuccess("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST", headers: hdr(),
        body: JSON.stringify({
          name:     form.name,
          mobile:   form.mobile,
          password: form.password,
          role:     finalRole,
          area_id:  form.area_id || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Registration failed"); return; }
      setSuccess(`${form.name} added as ${finalRole.replace(/_/g, " ")}`);
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } finally { setSaving(false); }
  }

  const filtered = volunteers.filter(v => {
    const q = search.toLowerCase();
    return !q
      || v.name.toLowerCase().includes(q)
      || v.mobile.includes(q)
      || (v.district_name ?? "").toLowerCase().includes(q)
      || (v.area_name ?? "").toLowerCase().includes(q);
  });

  const activeCount = volunteers.filter(v => v.is_active).length;

  function lastSeen(ts: string | null) {
    if (!ts) return "Never";
    const diff = Date.now() - new Date(ts).getTime();
    const hrs  = Math.floor(diff / 3600000);
    if (hrs < 1) return "< 1 hr ago";
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(ts).toLocaleDateString("en-IN");
  }

  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Volunteers</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-gray-400 text-sm">{volunteers.length} total</p>
            <span className="flex items-center gap-1 text-green-600 text-xs font-bold">
              <Activity size={11} /> {activeCount} active
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
          {canAdd && (
            <button onClick={() => { setShowForm(true); setFormError(""); setSuccess(""); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors">
              <UserPlus size={14} /> Add Volunteer
            </button>
          )}
        </div>
      </div>

      {/* Success toast */}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm font-semibold px-4 py-3 rounded-xl flex items-center justify-between">
          {success}
          <button onClick={() => setSuccess("")}><X size={14} /></button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1 max-w-sm">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input type="text" placeholder="Search name, mobile, area…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 text-sm text-gray-800 outline-none bg-transparent placeholder:text-gray-400" />
          {search && <button onClick={() => setSearch("")}><X size={13} className="text-gray-400" /></button>}
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none">
          {ROLE_FILTER_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wide">
              <th className="text-left px-5 py-3">Name</th>
              {showMobile && <th className="text-left px-5 py-3">Mobile</th>}
              <th className="text-left px-5 py-3">Role</th>
              <th className="text-left px-5 py-3">District</th>
              <th className="text-left px-5 py-3">Area</th>
              <th className="text-left px-5 py-3">Booth</th>
              <th className="text-left px-5 py-3">Last Seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}>{[...Array(7)].map((_, j) => (
                  <td key={j} className="px-5 py-3">
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-20" />
                  </td>
                ))}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={showMobile ? 7 : 6} className="text-center py-16 text-gray-400 text-sm">
                  No volunteers found
                  {canAdd && (
                    <div className="mt-3">
                      <button onClick={() => setShowForm(true)}
                        className="text-blue-600 text-xs font-bold hover:underline">
                        + Add first volunteer
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ) : filtered.map(v => (
              <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0 ${v.is_active ? "bg-gradient-to-br from-green-500 to-emerald-600" : "bg-gray-300"}`}>
                      {v.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-semibold text-gray-900">{v.name}</span>
                  </div>
                </td>
                {showMobile && (
                  <td className="px-5 py-3 text-gray-500 font-mono text-xs">{v.mobile}</td>
                )}
                <td className="px-5 py-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[v.role] ?? "bg-gray-100 text-gray-600"}`}>
                    {v.role.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs">{v.district_name ?? "—"}</td>
                <td className="px-5 py-3 text-gray-500 text-xs">{v.area_name ?? "—"}</td>
                <td className="px-5 py-3 text-gray-500 text-xs">
                  {v.booth_number ? `${v.booth_number} · ${v.village}` : "—"}
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-semibold ${(Date.now() - new Date(v.last_seen_at ?? 0).getTime()) < 7200000 && v.last_seen_at ? "text-green-600" : "text-gray-400"}`}>
                    {lastSeen(v.last_seen_at)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Add Volunteer Drawer ─────────────────────────────── */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowForm(false)} />
          <div className="fixed right-0 top-0 h-full w-[400px] bg-white shadow-2xl z-50 flex flex-col">

            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="font-black text-gray-900">Add Volunteer</h2>
                <p className="text-xs text-gray-400 mt-0.5">Register a new party worker</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdd} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {formError && (
                <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-xl">{formError}</p>
              )}

              {[
                { id: "name",     label: "Full Name",  type: "text",     ph: "e.g. Ramesh Pawar"    },
                { id: "mobile",   label: "Mobile",     type: "tel",      ph: "10-digit mobile"      },
                { id: "password", label: "Password",   type: "password", ph: "Min 6 characters"     },
              ].map(({ id, label, type, ph }) => (
                <div key={id}>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">{label}</label>
                  <input type={type} placeholder={ph} required
                    value={(form as Record<string, string>)[id]}
                    onChange={e => setForm(f => ({ ...f, [id]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition" />
                </div>
              ))}

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Role</label>
                <select
                  value={addableRoles.find(r => r.value === form.role) ? form.role : "__custom__"}
                  onChange={e => {
                    if (e.target.value === "__custom__") {
                      setForm(f => ({ ...f, role: "__custom__", customRole: "" }));
                    } else {
                      setForm(f => ({ ...f, role: e.target.value, customRole: "" }));
                    }
                  }}
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition bg-white"
                >
                  {addableRoles.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                  <option value="__custom__">Other (type custom…)</option>
                </select>

                {/* Custom role text input */}
                {form.role === "__custom__" && (
                  <input
                    type="text"
                    placeholder="Type custom role e.g. panna_pramukh"
                    value={form.customRole}
                    onChange={e => setForm(f => ({ ...f, customRole: e.target.value.toLowerCase().replace(/\s+/g, "_") }))}
                    required
                    autoFocus
                    className="w-full mt-2 border border-blue-300 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">
                  Area ID <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input type="text" placeholder="e.g. wardha-zp"
                  value={form.area_id}
                  onChange={e => setForm(f => ({ ...f, area_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 transition" />
              </div>

              <button type="submit" disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl py-3 text-sm transition-colors">
                {saving ? "Adding…" : "Add Volunteer"}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
