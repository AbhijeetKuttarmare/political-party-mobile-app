import { useState, useEffect } from "react";
import { Search, ArrowRight, Star, Crown } from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

interface Leader {
  id: number;
  name: string;
  designation: string;
  category: string;
  photo_url: string | null;
}

const CATEGORY_TABS = [
  { key: "all",      label: "All"      },
  { key: "national", label: "National" },
  { key: "mp",       label: "MPs"      },
  { key: "mla",      label: "MLAs"     },
  { key: "youth",    label: "Youth"    },
  { key: "district", label: "District" },
];

const CATEGORY_COLORS: Record<string, string> = {
  national: "bg-blue-500/20 text-blue-300",
  mp:       "bg-purple-500/20 text-purple-300",
  mla:      "bg-emerald-500/20 text-emerald-300",
  youth:    "bg-orange-500/20 text-orange-300",
  district: "bg-cyan-500/20 text-cyan-300",
};

const AVATAR_GRADIENTS = [
  "from-blue-600 to-cyan-500",
  "from-purple-600 to-pink-500",
  "from-emerald-600 to-teal-500",
  "from-orange-500 to-amber-400",
  "from-rose-500 to-pink-600",
  "from-indigo-600 to-violet-500",
];

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function MinistersScreen() {
  const { token } = useAuth();
  const { isDark } = useTheme();
  const [leaders,    setLeaders]    = useState<Leader[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [activeTab,  setActiveTab]  = useState("all");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch("/api/leaders", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then((data: Leader[]) => setLeaders(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = leaders.filter(l => {
    const matchCat = activeTab === "all" || l.category === activeTab;
    const q = search.toLowerCase();
    const matchSearch = !q || l.name.toLowerCase().includes(q) || l.designation.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const countFor = (key: string) =>
    key === "all" ? leaders.length : leaders.filter(l => l.category === key).length;

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" : "bg-gray-50"}`}>

      {/* Header */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 text-white px-4 pt-5 pb-6 rounded-b-[2rem] shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.12),transparent_55%)]" />
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center border border-white/30">
              <Crown size={18} className="text-yellow-300" />
            </div>
            <div>
              <h1 className="font-black text-xl leading-tight">Party Leaders</h1>
              <p className="text-[11px] text-blue-100">{leaders.length} leaders · live data</p>
            </div>
          </div>
          {/* Search */}
          <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl px-4 py-2.5">
            <Search size={15} className="text-white/70 shrink-0" />
            <input
              type="text"
              placeholder="Search leaders…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/60 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
          {CATEGORY_TABS.map(tab => {
            const count = countFor(tab.key);
            if (tab.key !== "all" && count === 0) return null;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-bold whitespace-nowrap transition-all border ${
                  activeTab === tab.key
                    ? "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/30"
                    : isDark
                      ? "bg-white/8 text-gray-300 border-white/15 hover:bg-white/15 hover:text-white"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
                }`}
              >
                {tab.label}
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? "bg-white/25 text-white" : "bg-white/10 text-gray-400"
                }`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Results */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`rounded-2xl p-4 flex items-center gap-4 animate-pulse ${isDark ? "bg-white/5 border border-white/10" : "bg-white border border-gray-200"}`}>
                <div className="w-16 h-16 rounded-2xl bg-white/10 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-2/3" />
                  <div className="h-3 bg-white/8 rounded w-1/2" />
                  <div className="h-5 bg-white/8 rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className={`text-center py-16 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            <p className="text-5xl mb-3">🔍</p>
            <p className={`font-bold ${isDark ? "text-gray-300" : "text-gray-600"}`}>No leaders found</p>
            <p className="text-sm mt-1">Try a different category or search term</p>
          </div>
        ) : (
          <div className="space-y-3 pb-24">
            {filtered.map((leader, idx) => {
              const grad = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
              const catColor = CATEGORY_COLORS[leader.category] ?? (isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600");
              const catLabel = CATEGORY_TABS.find(t => t.key === leader.category)?.label ?? leader.category;
              return (
                <Link
                  key={leader.id}
                  to={`/ministers/${leader.id}`}
                  className={`rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-all block ${isDark ? "bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20" : "bg-white border border-gray-200 hover:bg-gray-50 shadow-sm"}`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {leader.photo_url ? (
                      <img
                        src={leader.photo_url}
                        alt={leader.name}
                        className="w-16 h-16 rounded-2xl object-cover shadow-md border-2 border-white ring-2 ring-blue-100"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex"; }}
                      />
                    ) : null}
                    <div
                      className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center text-white text-lg font-black shadow-md ${leader.photo_url ? "hidden" : "flex"}`}
                    >
                      {initials(leader.name)}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center border-2 border-white shadow">
                      <Star size={10} className="text-white" fill="white" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-black text-sm truncate ${isDark ? "text-white" : "text-gray-900"}`}>{leader.name}</p>
                    <p className={`text-xs font-medium mt-0.5 truncate ${isDark ? "text-gray-400" : "text-gray-500"}`}>{leader.designation}</p>
                    <span className={`inline-block mt-2 text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize ${catColor}`}>
                      {catLabel}
                    </span>
                  </div>

                  <div className="w-8 h-8 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                    <ArrowRight size={14} className="text-blue-400" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
