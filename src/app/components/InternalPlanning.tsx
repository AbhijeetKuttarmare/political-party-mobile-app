import { useState } from "react";
import { ArrowLeft, FileText, Download, Eye, Lock, Plus, Search, Filter, ChevronRight, X } from "lucide-react";
import { useNavigate } from "react-router";
import { useTheme } from "../context/ThemeContext";

type Doc = {
  id: number;
  title: string;
  description: string;
  category: string;
  date: string;
  size: string;
  confidential: boolean;
  author: string;
};

const DOCUMENTS: Doc[] = [
  {
    id: 1,
    title: "Q1 2026 Campaign Strategy",
    description: "Detailed strategy for electoral reform campaign across Maharashtra",
    category: "Strategy",
    date: "Mar 3, 2026",
    size: "2.4 MB",
    confidential: true,
    author: "Sharad Pawar",
  },
  {
    id: 2,
    title: "Pune Ground Operations Plan",
    description: "Ward-wise deployment and volunteer allocation for Pune district",
    category: "Operations",
    date: "Mar 2, 2026",
    size: "1.8 MB",
    confidential: true,
    author: "Jayant Patil",
  },
  {
    id: 3,
    title: "Social Media Content Calendar",
    description: "March–April content strategy and daily posting schedule",
    category: "Media",
    date: "Mar 1, 2026",
    size: "890 KB",
    confidential: false,
    author: "Supriya Sule",
  },
  {
    id: 4,
    title: "Volunteer Training Manual 2026",
    description: "Complete training guide for new karyakartas",
    category: "Training",
    date: "Feb 28, 2026",
    size: "3.2 MB",
    confidential: false,
    author: "Anil Deshmukh",
  },
  {
    id: 5,
    title: "Nashik Expansion Strategy",
    description: "Strategic plan for strengthening operations in Nashik division",
    category: "Strategy",
    date: "Feb 25, 2026",
    size: "1.5 MB",
    confidential: true,
    author: "Praful Patel",
  },
  {
    id: 6,
    title: "Booth Committee Guidelines",
    description: "Standard operating procedures for booth-level committees",
    category: "Operations",
    date: "Feb 22, 2026",
    size: "640 KB",
    confidential: false,
    author: "Jayant Patil",
  },
  {
    id: 7,
    title: "Media Guidelines 2026",
    description: "Brand and communication guidelines for all party communications",
    category: "Media",
    date: "Feb 20, 2026",
    size: "1.1 MB",
    confidential: false,
    author: "Supriya Sule",
  },
];

const CATEGORIES = ["All", "Strategy", "Operations", "Media", "Training"];

const CATEGORY_COLORS: Record<string, string> = {
  Strategy:   "bg-blue-100 text-blue-700",
  Operations: "bg-emerald-100 text-emerald-700",
  Media:      "bg-purple-100 text-purple-700",
  Training:   "bg-orange-100 text-orange-700",
};

const CATEGORY_ICONS: Record<string, string> = {
  Strategy:   "🎯",
  Operations: "⚙️",
  Media:      "📢",
  Training:   "📚",
};

export default function InternalPlanning() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [previewDoc, setPreviewDoc] = useState<Doc | null>(null);
  const { isDark } = useTheme();

  const filtered = DOCUMENTS.filter((d) => {
    const matchCat = activeCategory === "All" || d.category === activeCategory;
    const matchSearch =
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.description.toLowerCase().includes(search.toLowerCase()) ||
      d.author.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" : "bg-gray-50"}`}>

      {/* Header */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 text-white px-4 pt-5 pb-5 rounded-b-[2rem] shadow-2xl relative overflow-hidden">
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
              <h1 className="font-bold text-xl tracking-tight">Internal Planning</h1>
              <p className="text-xs text-blue-100 mt-0.5">Strategy & Campaign Documents</p>
            </div>
            <button className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 active:bg-white/40 transition-colors">
              <Plus size={18} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-2xl bg-white/95 text-gray-700 text-sm placeholder:text-gray-400 outline-none shadow-lg"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4 pb-6">

        {/* Category filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 text-xs font-bold rounded-2xl whitespace-nowrap transition-all border ${
                activeCategory === cat
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md border-transparent"
                  : "bg-white text-slate-600 border-slate-200 shadow-sm hover:text-blue-600 hover:bg-blue-50"
              }`}
            >
              {cat !== "All" && <span className="mr-1">{CATEGORY_ICONS[cat]}</span>}
              {cat}
            </button>
          ))}
        </div>

        {/* Count */}
        <p className="text-xs text-slate-400 font-medium">
          {filtered.length} document{filtered.length !== 1 ? "s" : ""}
          {activeCategory !== "All" ? ` · ${activeCategory}` : ""}
        </p>

        {/* Documents */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-3">📄</p>
            <p className="font-semibold">No documents found</p>
            <p className="text-sm mt-1">Try a different filter or search term</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Doc header row */}
                <div className="flex items-start gap-3 p-4 pb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shrink-0 shadow-md">
                    <FileText size={20} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <h3 className="font-bold text-sm text-gray-900 flex-1 leading-snug">{doc.title}</h3>
                      {doc.confidential && (
                        <div className="shrink-0 w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center mt-0.5">
                          <Lock size={12} className="text-red-600" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-snug">{doc.description}</p>
                  </div>
                </div>

                {/* Tags row */}
                <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-xl ${CATEGORY_COLORS[doc.category]}`}>
                    {CATEGORY_ICONS[doc.category]} {doc.category}
                  </span>
                  <span className="text-[11px] text-gray-400">by {doc.author}</span>
                  <span className="text-[11px] text-gray-300">·</span>
                  <span className="text-[11px] text-gray-400">{doc.size}</span>
                  <span className="text-[11px] text-gray-300">·</span>
                  <span className="text-[11px] text-gray-400">{doc.date}</span>
                </div>

                {/* Confidential banner */}
                {doc.confidential && (
                  <div className="mx-4 mb-3 px-3 py-2 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
                    <Lock size={11} className="text-red-500 shrink-0" />
                    <span className="text-[11px] text-red-600 font-semibold">Confidential — Admin access only</span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex border-t border-slate-100">
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition-colors border-r border-slate-100"
                  >
                    <Eye size={14} />
                    View
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100 transition-colors">
                    <Download size={14} />
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Security notice */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <Lock size={14} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-800 mb-0.5">Document Security</p>
            <p className="text-xs text-blue-600 leading-relaxed">
              All documents are encrypted and accessible only to approved team members. Do not share outside the platform.
            </p>
          </div>
        </div>
      </div>

      {/* Preview sheet */}
      {previewDoc && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setPreviewDoc(null)} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[390px] max-w-full z-50 bg-white rounded-t-[2rem] shadow-2xl p-6">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-md">
                <FileText size={24} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base text-gray-900 leading-snug">{previewDoc.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">by {previewDoc.author} · {previewDoc.date}</p>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                <X size={16} className="text-gray-600" />
              </button>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed mb-4">{previewDoc.description}</p>

            <div className="flex gap-2 mb-4">
              <span className={`text-xs font-bold px-3 py-1.5 rounded-xl ${CATEGORY_COLORS[previewDoc.category]}`}>
                {CATEGORY_ICONS[previewDoc.category]} {previewDoc.category}
              </span>
              <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600">{previewDoc.size}</span>
              {previewDoc.confidential && (
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-red-100 text-red-600 flex items-center gap-1">
                  <Lock size={10} /> Confidential
                </span>
              )}
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 mb-5 flex items-center justify-center h-32 text-gray-300 border border-gray-100">
              <div className="text-center">
                <FileText size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs font-medium text-gray-400">Document preview</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPreviewDoc(null)}
                className="flex-1 h-11 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 font-bold text-sm rounded-2xl hover:bg-gray-200 active:scale-95 transition-all"
              >
                Close
              </button>
              <button className="flex-1 h-11 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-sm rounded-2xl shadow-md hover:shadow-lg active:scale-95 transition-all">
                <Download size={16} />
                Download
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
