import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { ChevronRight, Landmark, MapPin, TreePine } from "lucide-react";

interface District { code: number; name: string; name_marathi: string; taluka_count: number; village_count: number; leader_count: number; population: number }
interface Taluka   { code: number; name: string; name_marathi: string; total_villages: number; leader_count: number }

export default function WebDistricts() {
  const { token } = useAuth();
  const [districts,  setDistricts]  = useState<District[]>([]);
  const [talukas,    setTalukas]    = useState<Record<number, Taluka[]>>({});
  const [expanded,   setExpanded]   = useState<Set<number>>(new Set());
  const [loadingD,   setLoadingD]   = useState(true);
  const [loadingT,   setLoadingT]   = useState<Set<number>>(new Set());
  const [search,     setSearch]     = useState("");

  const hdr = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch("/api/hierarchy/districts", { headers: hdr })
      .then(r => r.ok ? r.json() : [])
      .then(setDistricts)
      .finally(() => setLoadingD(false));
  }, [token]);

  async function toggleDistrict(code: number) {
    if (expanded.has(code)) {
      setExpanded(s => { const n = new Set(s); n.delete(code); return n; });
      return;
    }
    setExpanded(s => new Set(s).add(code));
    if (!talukas[code]) {
      setLoadingT(s => new Set(s).add(code));
      const res = await fetch(`/api/hierarchy/talukas?district=${code}`, { headers: hdr });
      if (res.ok) { const d = await res.json(); setTalukas(prev => ({ ...prev, [code]: d })); }
      setLoadingT(s => { const n = new Set(s); n.delete(code); return n; });
    }
  }

  const filtered = districts.filter(d =>
    !search.trim() || d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Districts & Hierarchy</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          {loadingD ? "Loading…" : `${districts.length} districts · ${districts.reduce((s,d)=>s+d.taluka_count,0)} talukas · ${districts.reduce((s,d)=>s+d.village_count,0).toLocaleString()} villages`}
        </p>
      </div>

      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5 mb-5 max-w-xs">
        <MapPin size={14} className="text-gray-400 shrink-0" />
        <input type="text" placeholder="Search districts…" value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 text-sm text-gray-800 outline-none bg-transparent placeholder:text-gray-400" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loadingD ? (
          [...Array(5)].map((_, i) => <div key={i} className="h-16 border-b border-gray-50 animate-pulse bg-gray-50" />)
        ) : filtered.map(district => {
          const isOpen = expanded.has(district.code);
          const tList  = talukas[district.code];
          const loadingTalukas = loadingT.has(district.code);
          return (
            <div key={district.code} className="border-b border-gray-100 last:border-0">
              <button onClick={() => toggleDistrict(district.code)}
                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-blue-50 transition-colors text-left">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shrink-0">
                  <Landmark size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900">{district.name} District</p>
                  <div className="flex items-center gap-4 mt-0.5 text-xs text-gray-400">
                    <span>{district.taluka_count} talukas</span>
                    <span>{district.village_count.toLocaleString()} villages</span>
                    {district.leader_count > 0 && <span className="text-yellow-600 font-semibold">⚡ {district.leader_count} leaders</span>}
                  </div>
                </div>
                <ChevronRight size={16} className={`text-gray-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 bg-gray-50">
                  {loadingTalukas ? (
                    <div className="text-center py-4 text-gray-400 text-xs">Loading talukas…</div>
                  ) : (tList ?? []).map(taluka => (
                    <div key={taluka.code} className="flex items-center gap-4 px-8 py-3 border-b border-gray-100 last:border-0 hover:bg-white transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shrink-0">
                        <TreePine size={14} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-xs text-gray-800">{taluka.name}</p>
                        <div className="flex gap-3 mt-0.5 text-[10px] text-gray-400">
                          <span>{taluka.total_villages} villages</span>
                          {taluka.leader_count > 0 && <span className="text-green-600 font-semibold">{taluka.leader_count} leaders</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
