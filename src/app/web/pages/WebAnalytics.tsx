import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { TrendingUp, Target, Users, BarChart2 } from "lucide-react";

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

function GaugeBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div className={`h-2 rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

export default function WebAnalytics() {
  const { token } = useAuth();
  const [election,  setElection]  = useState("zp");
  const [summary,   setSummary]   = useState<Summary | null>(null);
  const [loading,   setLoading]   = useState(true);

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
    </div>
  );
}
