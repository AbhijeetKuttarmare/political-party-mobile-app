import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { RefreshCw } from "lucide-react";

interface Survey {
  id: number; response: string; issues: string[] | null;
  note: string | null; surveyed_at: string;
  voter_name: string | null; voter_id: string | null;
  volunteer_name: string | null;
}

const RESPONSE_STYLES: Record<string, string> = {
  ncp:        "bg-green-100 text-green-700",
  undecided:  "bg-amber-100 text-amber-700",
  opposition: "bg-red-100 text-red-700",
  refused:    "bg-gray-100 text-gray-500",
};

export default function WebSurveys() {
  const { token } = useAuth();
  const [surveys,  setSurveys]  = useState<Survey[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [response, setResponse] = useState("");
  const [page,     setPage]     = useState(1);
  const LIMIT = 50;

  const hdr = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (response) params.set("response", response);
      const res = await fetch(`/api/surveys?${params}`, { headers: hdr() });
      if (res.ok) setSurveys(await res.json());
    } finally { setLoading(false); }
  }, [hdr, page, response]);

  useEffect(() => { load(); }, [load]);

  const counts = surveys.reduce<Record<string, number>>((acc, s) => {
    acc[s.response] = (acc[s.response] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Surveys</h1>
          <p className="text-gray-400 text-sm mt-0.5">Voter contact records from the field</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3 mb-5">
        {[
          { key: "",           label: "All",       color: "bg-gray-100 text-gray-700"   },
          { key: "ncp",        label: `NCP ${counts.ncp ?? 0}`,              color: "bg-green-100 text-green-700"  },
          { key: "undecided",  label: `Undecided ${counts.undecided ?? 0}`,  color: "bg-amber-100 text-amber-700"  },
          { key: "opposition", label: `Opposition ${counts.opposition ?? 0}`,color: "bg-red-100 text-red-700"      },
          { key: "refused",    label: `Refused ${counts.refused ?? 0}`,      color: "bg-gray-100 text-gray-500"    },
        ].map(({ key, label, color }) => (
          <button key={key} onClick={() => { setResponse(key); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border-2 ${response === key ? "border-blue-500 ring-2 ring-blue-100" : "border-transparent"} ${color}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wide">
              <th className="text-left px-5 py-3">Voter</th>
              <th className="text-left px-5 py-3">Voter ID</th>
              <th className="text-left px-5 py-3">Response</th>
              <th className="text-left px-5 py-3">Issues</th>
              <th className="text-left px-5 py-3">By Volunteer</th>
              <th className="text-left px-5 py-3">Date</th>
              <th className="text-left px-5 py-3">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              [...Array(10)].map((_, i) => (
                <tr key={i}>{[...Array(7)].map((_, j) => (
                  <td key={j} className="px-5 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse w-20" /></td>
                ))}</tr>
              ))
            ) : surveys.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">No surveys found</td></tr>
            ) : surveys.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 font-semibold text-gray-900">{s.voter_name ?? "Anonymous"}</td>
                <td className="px-5 py-3 font-mono text-xs text-gray-500">{s.voter_id ?? "—"}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${RESPONSE_STYLES[s.response] ?? "bg-gray-100 text-gray-500"}`}>
                    {s.response}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs max-w-[160px] truncate">
                  {(s.issues ?? []).join(", ") || "—"}
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs">{s.volunteer_name ?? "—"}</td>
                <td className="px-5 py-3 text-gray-400 text-xs">{new Date(s.surveyed_at).toLocaleDateString("en-IN")}</td>
                <td className="px-5 py-3 text-gray-400 text-xs max-w-[140px] truncate">{s.note ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <p className="text-gray-400">Page {page}</p>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 rounded-xl border border-gray-200 font-semibold text-gray-600 disabled:opacity-40 hover:bg-gray-50">
            Previous
          </button>
          <button disabled={surveys.length < LIMIT} onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 rounded-xl border border-gray-200 font-semibold text-gray-600 disabled:opacity-40 hover:bg-gray-50">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
