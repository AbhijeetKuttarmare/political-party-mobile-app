import { useEffect, useState } from "react";
import { ArrowLeft, Star, Crown } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

interface Leader {
  id: number;
  name: string;
  designation: string;
  category: string;
  photo_url: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  national: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  mp:       "bg-purple-500/20 text-purple-300 border-purple-500/30",
  mla:      "bg-green-500/20 text-green-300 border-green-500/30",
  youth:    "bg-orange-500/20 text-orange-300 border-orange-500/30",
  district: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
};

const AVATAR_GRADIENTS: Record<string, string> = {
  national: "from-blue-700 to-blue-500",
  mp:       "from-purple-600 to-pink-500",
  mla:      "from-emerald-600 to-teal-500",
  youth:    "from-orange-500 to-amber-400",
  district: "from-cyan-600 to-blue-500",
};

const COVER_GRADIENTS: Record<string, string> = {
  national: "from-blue-700 via-blue-600 to-cyan-500",
  mp:       "from-purple-700 via-purple-600 to-pink-500",
  mla:      "from-emerald-700 via-emerald-600 to-teal-500",
  youth:    "from-orange-600 via-orange-500 to-amber-400",
  district: "from-cyan-700 via-cyan-600 to-blue-500",
};

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function MinisterProfile() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const { token } = useAuth();
  const { isDark } = useTheme();
  const [leader,  setLeader]  = useState<Leader | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgErr,  setImgErr]  = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    fetch(`/api/leaders/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then((data: Leader | null) => setLeader(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, id]);

  const catColor  = isDark
    ? (CATEGORY_COLORS[leader?.category ?? ""] ?? "bg-gray-700 text-gray-300 border-gray-600")
    : "bg-blue-100 text-blue-700 border-blue-200";
  const avatarGrd = AVATAR_GRADIENTS[leader?.category ?? ""] ?? "from-blue-600 to-cyan-500";
  const coverGrd  = COVER_GRADIENTS[leader?.category ?? ""] ?? "from-blue-700 via-blue-600 to-cyan-500";

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" : "bg-gray-50"}`}>

      {/* Header */}
      <div className={`px-4 py-3 flex items-center gap-3 sticky top-0 z-10 ${isDark ? "bg-slate-900/80 backdrop-blur-xl border-b border-white/10" : "bg-white border-b border-gray-200 shadow-sm"}`}>
        <button onClick={() => navigate(-1)} className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${isDark ? "hover:bg-white/10 active:bg-white/20" : "hover:bg-gray-100"}`}>
          <ArrowLeft size={20} className={isDark ? "text-white" : "text-gray-700"} />
        </button>
        <div className="flex items-center gap-2">
          <Crown size={16} className="text-blue-400" />
          <h1 className={`font-black text-base ${isDark ? "text-white" : "text-gray-900"}`}>Leader Profile</h1>
        </div>
      </div>

      {loading ? (
        <div className="p-6 space-y-4 animate-pulse">
          <div className="h-32 bg-white/10 rounded-2xl" />
          <div className="h-24 bg-white/10 rounded-2xl" />
          <div className="h-40 bg-white/10 rounded-2xl" />
        </div>
      ) : !leader ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <p className="text-5xl mb-3">👤</p>
          <p className="font-bold text-gray-300">Leader not found</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-blue-400 text-sm font-semibold">← Go back</button>
        </div>
      ) : (
        <>
          {/* Cover */}
          <div className={`h-36 bg-gradient-to-br ${coverGrd} relative`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.12),transparent)]" />
          </div>

          {/* Profile card */}
          <div className="px-4 -mt-14 pb-4">
            <div className={`rounded-3xl shadow-xl p-6 ${isDark ? "bg-white/5 backdrop-blur-sm border border-white/10" : "bg-white border border-gray-200"}`}>
              <div className="flex flex-col items-center text-center">

                {/* Photo */}
                <div className="relative mb-4">
                  {leader.photo_url && !imgErr ? (
                    <img
                      src={leader.photo_url}
                      alt={leader.name}
                      onError={() => setImgErr(true)}
                      className="w-28 h-28 rounded-full object-cover border-4 border-white/20 shadow-xl ring-2 ring-blue-500/30"
                    />
                  ) : (
                    <div className={`w-28 h-28 rounded-full bg-gradient-to-br ${avatarGrd} flex items-center justify-center text-white text-3xl font-black border-4 border-white/20 shadow-xl`}>
                      {initials(leader.name)}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-9 h-9 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center border-4 border-slate-800 shadow-lg">
                    <Star size={15} className="text-white" fill="white" />
                  </div>
                </div>

                <h2 className={`font-black text-2xl mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>{leader.name}</h2>
                <p className={`text-sm font-medium mb-3 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{leader.designation}</p>

                <span className={`text-xs font-bold px-4 py-1.5 rounded-full border capitalize ${catColor}`}>
                  {leader.category}
                </span>
              </div>
            </div>
          </div>

          {/* Info section */}
          <div className="px-4 pb-24 space-y-3">
            <div className={`rounded-2xl p-4 ${isDark ? "bg-white/5 backdrop-blur-sm border border-white/10" : "bg-white border border-gray-200 shadow-sm"}`}>
              <h3 className={`font-black text-sm mb-3 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                <span className="text-lg">ℹ️</span> Details
              </h3>
              <div className="space-y-2.5">
                <div className={`flex justify-between items-center py-2 border-b ${isDark ? "border-white/5" : "border-gray-100"}`}>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Name</span>
                  <span className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{leader.name}</span>
                </div>
                <div className={`flex justify-between items-center py-2 border-b ${isDark ? "border-white/5" : "border-gray-100"}`}>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Designation</span>
                  <span className={`text-sm font-semibold text-right max-w-[60%] ${isDark ? "text-gray-300" : "text-gray-700"}`}>{leader.designation}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Category</span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border capitalize ${catColor}`}>
                    {leader.category}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl p-4 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <Crown size={16} className="text-yellow-300" />
                <span className="font-black text-sm">NCP-SP Maharashtra</span>
              </div>
              <p className="text-xs text-blue-100 leading-relaxed">
                Nationalist Congress Party – Sharadchandra Pawar. Building a stronger Maharashtra together.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
