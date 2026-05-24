import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { UserPlus, Search, X, CheckCircle2, XCircle, RefreshCw, Pencil, ChevronDown } from "lucide-react";

interface District { id: number; name: string; }
interface Area     { id: string; name: string; district_name: string; }

interface Volunteer {
  id: number; name: string; mobile: string; role: string;
  is_active: boolean; last_seen_at: string | null;
  district_name: string | null; area_name: string | null;
  district_id: number | null; area_id: string | null;
}

const ROLE_OPTIONS = [
  { value: "state_leader",    label: "State Leader"    },
  { value: "district_leader", label: "District Leader" },
  { value: "taluka_leader",   label: "Taluka Leader"   },
  { value: "village_leader",  label: "Village Leader"  },
  { value: "booth_leader",    label: "Booth Leader"    },
  { value: "booth_worker",    label: "Booth Worker"    },
  { value: "karyakarta",      label: "Karyakarta"      },
  { value: "observer",        label: "Observer"        },
];

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

const EMPTY_FORM = { name: "", mobile: "", password: "", role: "karyakarta", district_id: "", area_id: "" };
const EMPTY_EDIT = { name: "", mobile: "", password: "", role: "", district_id: "", area_id: "", is_active: true };

export default function WebUsers() {
  const { token, user } = useAuth();
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filterRole, setFilterRole] = useState("");

  // Add user
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState("");

  // Edit user
  const [editTarget, setEditTarget] = useState<Volunteer | null>(null);
  const [editForm,   setEditForm]   = useState(EMPTY_EDIT);
  const [editSaving, setEditSaving] = useState(false);
  const [editError,  setEditError]  = useState("");

  // Districts + areas for dropdowns
  const [districts,     setDistricts]     = useState<District[]>([]);
  const [areas,         setAreas]         = useState<Area[]>([]);
  const [areasLoading,  setAreasLoading]  = useState(false);

  const hdr = useCallback(() => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }), [token]);

  const loadVolunteers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterRole) params.set("role", filterRole);
      const res = await fetch(`/api/volunteers?${params}`, { headers: hdr() });
      if (res.ok) setVolunteers(await res.json());
    } finally { setLoading(false); }
  }, [hdr, filterRole]);

  useEffect(() => { loadVolunteers(); }, [loadVolunteers]);

  const loadDistricts = useCallback(async () => {
    if (districts.length > 0) return;
    try {
      const res = await fetch("/api/hierarchy/districts", { headers: hdr() });
      if (res.ok) setDistricts(await res.json());
    } catch { /* ignore */ }
  }, [districts.length, hdr]);

  const loadAreas = useCallback(async (districtId: string) => {
    setAreas([]); setAreasLoading(true);
    try {
      const params = districtId ? `?district=${districtId}` : "";
      const res = await fetch(`/api/areas${params}`, { headers: hdr() });
      if (res.ok) setAreas(await res.json());
    } finally { setAreasLoading(false); }
  }, [hdr]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST", headers: hdr(),
        body: JSON.stringify({
          name:        form.name,
          mobile:      form.mobile,
          password:    form.password,
          role:        form.role,
          district_id: form.district_id ? Number(form.district_id) : undefined,
          area_id:     form.area_id || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Registration failed"); return; }
      setSuccess(`${form.name} registered as ${form.role}`);
      setForm(EMPTY_FORM);
      setShowForm(false);
      loadVolunteers();
    } finally { setSaving(false); }
  }

  function openEdit(v: Volunteer) {
    setEditTarget(v);
    setEditForm({
      name:        v.name,
      mobile:      v.mobile,
      password:    "",
      role:        v.role,
      district_id: v.district_id != null ? String(v.district_id) : "",
      area_id:     v.area_id ?? "",
      is_active:   v.is_active,
    });
    setEditError("");
    loadDistricts();
    if (v.district_id) loadAreas(String(v.district_id));
    else loadAreas("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setEditSaving(true); setEditError("");
    try {
      const body: Record<string, unknown> = {
        name:        editForm.name,
        mobile:      editForm.mobile,
        role:        editForm.role,
        district_id: editForm.district_id ? Number(editForm.district_id) : null,
        area_id:     editForm.area_id || null,
        is_active:   editForm.is_active,
      };
      if (editForm.password) body.password = editForm.password;

      const res = await fetch(`/api/volunteers/${editTarget.id}`, {
        method: "PUT", headers: hdr(), body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setEditError(data.error ?? "Update failed"); return; }
      setSuccess(`${editForm.name} updated successfully`);
      setEditTarget(null);
      loadVolunteers();
    } finally { setEditSaving(false); }
  }

  const filtered = volunteers.filter(v => {
    const q = search.toLowerCase();
    return !q || v.name.toLowerCase().includes(q) || v.mobile.includes(q);
  });

  const registrableRoles = ROLE_OPTIONS.filter(r => {
    if (user?.role === "super_admin")     return true;
    if (user?.role === "state_leader")    return !["super_admin","state_leader"].includes(r.value);
    if (user?.role === "district_leader") return ["taluka_leader","village_leader","booth_leader","booth_worker","karyakarta"].includes(r.value);
    return false;
  });

  const canEdit = user?.role === "super_admin" || user?.role === "state_leader" || user?.role === "district_leader";

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">User Management</h1>
          <p className="text-gray-400 text-sm mt-0.5">{volunteers.length} active users</p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadVolunteers} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => { setShowForm(true); setError(""); setSuccess(""); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors">
            <UserPlus size={14} /> Add User
          </button>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm text-green-700 font-medium">
          <CheckCircle2 size={15} /> {success}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1 max-w-xs">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input type="text" placeholder="Search name or mobile…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 text-sm text-gray-800 outline-none bg-transparent placeholder:text-gray-400" />
          {search && <button onClick={() => setSearch("")}><X size={13} className="text-gray-400" /></button>}
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none">
          <option value="">All Roles</option>
          {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wide">
              <th className="text-left px-5 py-3">Name</th>
              <th className="text-left px-5 py-3">Mobile</th>
              <th className="text-left px-5 py-3">Role</th>
              <th className="text-left px-5 py-3">District</th>
              <th className="text-left px-5 py-3">Area</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="text-left px-5 py-3">Last Seen</th>
              {canEdit && <th className="text-left px-5 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}>
                  {[...Array(canEdit ? 8 : 7)].map((_, j) => (
                    <td key={j} className="px-5 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse w-24" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={canEdit ? 8 : 7} className="text-center py-12 text-gray-400 text-sm">No users found</td></tr>
            ) : filtered.map(v => (
              <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white text-xs font-black shrink-0">
                      {v.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-semibold text-gray-900">{v.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-gray-500 font-mono text-xs">{v.mobile}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[v.role] ?? "bg-gray-100 text-gray-600"}`}>
                    {v.role.replace("_", " ")}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs">{v.district_name ?? "—"}</td>
                <td className="px-5 py-3 text-gray-500 text-xs">{v.area_name ?? "—"}</td>
                <td className="px-5 py-3">
                  {v.is_active
                    ? <span className="flex items-center gap-1 text-green-600 text-xs font-semibold"><CheckCircle2 size={11} /> Active</span>
                    : <span className="flex items-center gap-1 text-gray-400 text-xs font-semibold"><XCircle size={11} /> Inactive</span>}
                </td>
                <td className="px-5 py-3 text-gray-400 text-xs">
                  {v.last_seen_at ? new Date(v.last_seen_at).toLocaleDateString("en-IN") : "Never"}
                </td>
                {canEdit && (
                  <td className="px-5 py-3">
                    <button
                      onClick={() => openEdit(v)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Add User Drawer ── */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowForm(false)} />
          <div className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="font-black text-gray-900">Register New User</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleRegister} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

              {[
                { id: "name",     label: "Full Name", type: "text",     ph: "e.g. Rahul Deshmukh" },
                { id: "mobile",   label: "Mobile",    type: "tel",      ph: "10-digit mobile"     },
                { id: "password", label: "Password",  type: "password", ph: "Min 6 characters"    },
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
                  value={registrableRoles.find(r => r.value === form.role) ? form.role : "__custom__"}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition bg-white"
                >
                  {registrableRoles.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                  <option value="__custom__">Other (type custom…)</option>
                </select>
                {form.role === "__custom__" && (
                  <input type="text" placeholder="e.g. panna_pramukh" autoFocus
                    onChange={e => setForm(f => ({ ...f, role: e.target.value.toLowerCase().replace(/\s+/g, "_") }))}
                    className="w-full mt-2 border border-blue-300 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition" />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">District ID <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="number" placeholder="District ID from DB"
                  value={form.district_id} onChange={e => setForm(f => ({ ...f, district_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 transition" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Area ID <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="text" placeholder="e.g. wardha-zp"
                  value={form.area_id} onChange={e => setForm(f => ({ ...f, area_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 transition" />
              </div>

              <button type="submit" disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl py-3 text-sm transition-colors">
                {saving ? "Registering…" : "Register User"}
              </button>
            </form>
          </div>
        </>
      )}

      {/* ── Edit User Drawer ── */}
      {editTarget && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setEditTarget(null)} />
          <div className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="font-black text-gray-900">Edit User</h2>
                <p className="text-xs text-gray-400 mt-0.5">ID #{editTarget.id}</p>
              </div>
              <button onClick={() => setEditTarget(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleEdit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {editError && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-xl">{editError}</p>}

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Full Name</label>
                <input type="text" required value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Mobile</label>
                <input type="tel" required value={editForm.mobile}
                  onChange={e => setEditForm(f => ({ ...f, mobile: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Role</label>
                <select value={editForm.role}
                  onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition bg-white">
                  {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">
                  District <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <select
                    value={editForm.district_id}
                    onChange={e => {
                      const val = e.target.value;
                      setEditForm(f => ({ ...f, district_id: val, area_id: "" }));
                      loadAreas(val);
                    }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-8 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition bg-white appearance-none"
                  >
                    <option value="">— No district —</option>
                    {districts.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">
                  Area <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <select
                    value={editForm.area_id}
                    onChange={e => setEditForm(f => ({ ...f, area_id: e.target.value }))}
                    disabled={areasLoading}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-8 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition bg-white appearance-none disabled:opacity-60"
                  >
                    <option value="">— No area —</option>
                    {areas.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                {areasLoading && <p className="text-[10px] text-gray-400 mt-1">Loading areas…</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">New Password <span className="text-gray-400 font-normal">(leave blank to keep current)</span></label>
                <input type="password" placeholder="Min 6 characters"
                  value={editForm.password}
                  onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 transition" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Status</label>
                <div className="flex gap-3">
                  <button type="button"
                    onClick={() => setEditForm(f => ({ ...f, is_active: true }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${editForm.is_active ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-400 hover:border-green-200"}`}>
                    <CheckCircle2 size={14} /> Active
                  </button>
                  <button type="button"
                    onClick={() => setEditForm(f => ({ ...f, is_active: false }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${!editForm.is_active ? "border-red-400 bg-red-50 text-red-600" : "border-gray-200 text-gray-400 hover:border-red-200"}`}>
                    <XCircle size={14} /> Inactive
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditTarget(null)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={editSaving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl py-3 text-sm transition-colors">
                  {editSaving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
