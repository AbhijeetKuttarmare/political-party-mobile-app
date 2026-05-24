import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { Search, X, RefreshCw, AlertTriangle, Plus, Edit2, Upload, Download, CheckCircle2, XCircle, FileSpreadsheet, FileText, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";

interface Booth {
  id: number; booth_number: string; village: string; taluka: string;
  constituency: string; total_voters: number; covered: number;
  sentiment_pct: number; volunteers: number; status: string;
  booth_leader: string | null; district_name: string | null;
  coverage_pct: number | null; election_id: string | null;
  area_id: string | null; district_id: number | null;
  max_volunteers: number; women_outreach: number; youth_support: number;
  voter_list_pdf_url: string | null; voter_list_pdf_name: string | null;
  voter_list_uploaded_at: string | null;
}

interface District { id: number; name: string; }
interface Area     { id: string; name: string; }

const STATUS_STYLES: Record<string, string> = {
  strong:   "bg-green-100 text-green-700",
  swing:    "bg-amber-100 text-amber-700",
  weak:     "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const ELECTION_LABELS: Record<string, string> = {
  ls: "Lok Sabha", vs: "Vidhan Sabha", vp: "Vidhan Parishad",
  mc: "Municipal Corporation", zp: "Zilla Parishad",
  ps: "Panchayat Samiti", gp: "Gram Panchayat", np: "Nagar Panchayat",
};

const EMPTY_FORM = {
  booth_number: "", village: "", taluka: "", constituency: "",
  election_id: "", district_id: "", area_id: "",
  total_voters: "", volunteers: "0", max_volunteers: "5",
  status: "swing", booth_leader: "", sentiment_pct: "0",
  women_outreach: "0", youth_support: "0",
};

export default function WebBooths() {
  const { token, user } = useAuth();
  const [booths,  setBooths]  = useState<Booth[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [statusF,       setStatusF]       = useState("");
  const [electionF,     setElectionF]     = useState("");
  const [districtF,     setDistrictF]     = useState("");
  const [constituencyF, setConstituencyF] = useState("");
  const [page,    setPage]    = useState(1);
  const [limit,   setLimit]   = useState(30);

  // Drawer state
  const [drawer,    setDrawer]    = useState<"add" | "edit" | null>(null);
  const [editBooth, setEditBooth] = useState<Booth | null>(null);
  const [form,      setForm]      = useState({ ...EMPTY_FORM });
  const [saving,    setSaving]    = useState(false);
  const [saveErr,   setSaveErr]   = useState("");

  // PDF voter list upload state (edit mode only)
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [pdfFile,        setPdfFile]        = useState<File | null>(null);
  const [pdfUploading,   setPdfUploading]   = useState(false);
  const [pdfDeleting,    setPdfDeleting]    = useState(false);
  const [pdfErr,         setPdfErr]         = useState("");
  const [currentPdfUrl,  setCurrentPdfUrl]  = useState<string | null>(null);
  const [currentPdfName, setCurrentPdfName] = useState<string | null>(null);

  // Filter meta
  const [districts,        setDistricts]        = useState<District[]>([]);
  const [filterElecs,      setFilterElecs]      = useState<{ id: string; label: string | null }[]>([]);
  const [filterConsts,     setFilterConsts]     = useState<string[]>([]);
  // Drawer cascading dropdowns
  const [areas,         setAreas]         = useState<Area[]>([]);
  const [talukas,       setTalukas]       = useState<{ code: string; name: string }[]>([]);
  const [villages,      setVillages]      = useState<{ code: string; name: string }[]>([]);
  const [areasLoading,  setAreasLoading]  = useState(false);
  const [talukasLoading, setTalukasLoading] = useState(false);
  const [villagesLoading, setVillagesLoading] = useState(false);

  // CSV upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadModal,        setUploadModal]        = useState(false);
  const [uploadStep,         setUploadStep]         = useState<1|2|3>(1);
  const [uploadDistrict,     setUploadDistrict]     = useState("");
  const [uploadElection,     setUploadElection]     = useState("");
  const [uploadConstituency, setUploadConstituency] = useState("");
  const [uploadAreas,        setUploadAreas]        = useState<Area[]>([]);
  const [uploadAreasLoading, setUploadAreasLoading] = useState(false);
  const [csvRows,       setCsvRows]       = useState<Record<string, string>[]>([]);
  const [csvError,      setCsvError]      = useState("");
  const [uploading,     setUploading]     = useState(false);
  const [uploadResult,  setUploadResult]  = useState<{ inserted: number; errors: { row: number; booth_number: string; error: string }[] } | null>(null);

  const hdr = useCallback(() => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }), [token]);

  const canWrite = user?.role === "super_admin" || user?.role === "state_leader";

  /* ── load filter metadata once on mount ── */
  useEffect(() => {
    if (!token) return;
    fetch("/api/booths/meta", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { districts: [], elections: [] })
      .then(d => {
        setDistricts(d.districts ?? []);
        setFilterElecs(d.elections ?? []);
        setFilterConsts(d.constituencies ?? []);
      })
      .catch(() => {});
  }, [token]);

  /* ── load constituencies for upload wizard when district + election change ── */
  useEffect(() => {
    if (!token || !uploadDistrict || !uploadElection) { setUploadAreas([]); return; }
    setUploadAreasLoading(true);
    setUploadConstituency("");
    const params = new URLSearchParams({ district: uploadDistrict, election: uploadElection });
    fetch(`/api/areas?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setUploadAreas(data))
      .catch(() => setUploadAreas([]))
      .finally(() => setUploadAreasLoading(false));
  }, [token, uploadDistrict, uploadElection]);

  /* ── data load ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search)        params.set("search",       search);
      if (statusF)       params.set("status",       statusF);
      if (electionF)     params.set("election",     electionF);
      if (districtF)     params.set("district",     districtF);
      if (constituencyF) params.set("constituency", constituencyF);
      const res = await fetch(`/api/booths?${params}`, { headers: hdr() });
      if (res.ok) {
        const d = await res.json();
        setBooths(d.data ?? d);
        setTotal(d.total ?? (d.data ?? d).length);
      }
    } finally { setLoading(false); }
  }, [hdr, page, limit, statusF, electionF, districtF, constituencyF, search]);

  useEffect(() => { load(); }, [load]);

  /* ── load all 36 districts for drawer (from districts table) ── */
  const loadDistricts = useCallback(async () => {
    if (districts.length > 0) return;
    const res = await fetch("/api/booths/districts", { headers: hdr() });
    if (res.ok) setDistricts(await res.json());
  }, [hdr, districts.length]);

  /* ── load areas when district+election changes ── */
  const loadAreas = useCallback(async (districtId: string, electionId: string) => {
    if (!districtId || !electionId) { setAreas([]); return; }
    setAreasLoading(true);
    try {
      const params = new URLSearchParams({ district: districtId, election: electionId });
      const res = await fetch(`/api/areas?${params}`, { headers: hdr() });
      if (res.ok) setAreas(await res.json());
    } finally { setAreasLoading(false); }
  }, [hdr]);

  const TEMPLATE_HEADERS = [
    "booth_number", "village", "taluka", "constituency",
    "election_id", "district_name", "area_id",
    "total_voters", "volunteers", "max_volunteers",
    "status", "booth_leader", "sentiment_pct", "women_outreach", "youth_support",
  ];
  const TEMPLATE_EXAMPLE = [
    "B-001", "Kasarwadi", "Haveli", "Pune Rural",
    "zp", "Pune", "",
    "1200", "3", "5",
    "swing", "Ramesh Patil", "55", "40", "35",
  ];

  /* ── Template download (CSV or Excel) ── */
  const downloadTemplate = (format: "csv" | "xlsx") => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, TEMPLATE_EXAMPLE]);
    // Style header row bold (xlsx supports limited styling)
    if (format === "xlsx") {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Booths");
      XLSX.writeFile(wb, "booths_template.xlsx");
    } else {
      const csv = [TEMPLATE_HEADERS.join(","), TEMPLATE_EXAMPLE.join(",")].join("\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      a.download = "booths_template.csv";
      a.click();
      URL.revokeObjectURL(a.href);
    }
  };

  /* ── Detect constituency from Excel title rows ── */
  const detectConstituency = (rawRows: unknown[][]): string => {
    // Scan first 3 rows for a non-empty, single-cell merged title (government format)
    for (let i = 0; i < Math.min(3, rawRows.length); i++) {
      const row = rawRows[i] as string[];
      const nonEmpty = row.filter(c => c && String(c).trim());
      if (nonEmpty.length === 1) {
        const val = String(nonEmpty[0]).trim();
        // Skip generic Marathi titles; return anything else that looks like a place name
        if (!val.includes("यादी") && !val.includes("तपशील") && val.length > 2 && val.length < 80) {
          return val;
        }
      }
    }
    return "";
  };

  /* ── Parse government booth format: "N - VillageName" ── */
  const parseGovtBooth = (rawRows: unknown[][]): Record<string, string>[] => {
    // Find header row: contains "मतदान केंद्र" or "matdan kendra"
    let headerIdx = -1;
    for (let i = 0; i < Math.min(5, rawRows.length); i++) {
      const row = rawRows[i] as string[];
      if (row.some(c => String(c ?? "").includes("मतदान केंद्र") || String(c ?? "").toLowerCase().includes("booth"))) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) return []; // Not government format

    const headers = (rawRows[headerIdx] as string[]).map(h => String(h ?? "").trim());
    const boothCol   = headers.findIndex(h => h.includes("मतदान केंद्र") && !h.includes("तपशील"));
    const detailCol  = headers.findIndex(h => h.includes("तपशील") || h.toLowerCase().includes("detail"));

    const rows: Record<string, string>[] = [];
    for (let i = headerIdx + 1; i < rawRows.length; i++) {
      const row = rawRows[i] as string[];
      const boothVal = String(row[boothCol] ?? "").trim();
      if (!boothVal) continue;

      // Parse "1 - हातीवडे" or "1. हातीवडे" or just "हातीवडे"
      const match = boothVal.match(/^(\d+)\s*[-–.]\s*(.+)$/);
      rows.push({
        booth_number: match ? match[1] : boothVal,
        village:      match ? match[2].trim() : boothVal,
        constituency: uploadConstituency || "",
        election_id:  "vs", // Vidhan Sabha format implies VS election
        status:       "swing",
        total_voters: "0",
        volunteers:   "0",
        max_volunteers: "5",
        // Store full detail as booth_leader temporarily for reference
        booth_leader: detailCol >= 0 ? String(row[detailCol] ?? "").trim() : "",
      });
    }
    return rows;
  };

  /* ── Parse CSV or Excel file ── */
  const handleCsvFile = (file: File) => {
    setCsvError(""); setCsvRows([]); setUploadResult(null);
    const name = file.name.toLowerCase();
    const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls");

    // Try to detect constituency from filename (e.g. "Baramati_booths.xlsx" → "Baramati")
    if (!uploadConstituency) {
      const fromName = file.name.replace(/\.(xlsx?|csv)$/i, "").replace(/[_\-]/g, " ").trim();
      if (fromName && !fromName.toLowerCase().includes("booth") && !fromName.toLowerCase().includes("template")) {
        setUploadConstituency(fromName);
      }
    }

    const reader = new FileReader();
    reader.onerror = () => setCsvError("Failed to read file.");
    reader.onload = (e) => {
      try {
        let rows: Record<string, string>[] = [];

        if (isExcel) {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const wb   = XLSX.read(data, { type: "array" });
          const ws   = wb.Sheets[wb.SheetNames[0]];

          // Get raw arrays to check for government format
          const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" }) as unknown[][];

          // Try to detect constituency from title row
          const detected = detectConstituency(rawRows);
          if (detected && !uploadConstituency) setUploadConstituency(detected);

          // Try government format first
          const govtRows = parseGovtBooth(rawRows);
          if (govtRows.length > 0) {
            rows = govtRows;
          } else {
            // Standard format: use first row as headers
            const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
            if (json.length === 0) { setCsvError("Sheet is empty or has no data rows."); return; }
            rows = json.map(r => {
              const out: Record<string, string> = {};
              Object.entries(r).forEach(([k, v]) => { out[k.toLowerCase().trim()] = String(v ?? ""); });
              return out;
            });
          }
        } else {
          // CSV text parsing
          const text  = e.target?.result as string;
          const lines = text.split(/\r?\n/).filter(l => l.trim());
          if (lines.length < 2) { setCsvError("File must have a header row and at least one data row."); return; }

          const parseRow = (line: string): string[] => {
            const result: string[] = [];
            let cur = ""; let inQ = false;
            for (const c of line) {
              if (c === '"') { inQ = !inQ; }
              else if (c === "," && !inQ) { result.push(cur.trim()); cur = ""; }
              else { cur += c; }
            }
            result.push(cur.trim());
            return result;
          };

          const headers = parseRow(lines[0]).map(h => h.toLowerCase().trim());
          for (let i = 1; i < lines.length; i++) {
            const vals = parseRow(lines[i]);
            const obj: Record<string, string> = {};
            headers.forEach((h, idx) => { obj[h] = vals[idx] ?? ""; });
            rows.push(obj);
          }
        }

        // Inject constituency into every row if set
        if (uploadConstituency) {
          rows = rows.map(r => ({ ...r, constituency: r.constituency || uploadConstituency }));
        }

        if (rows.length > 500) { setCsvError("Max 500 rows per upload."); return; }
        setCsvRows(rows);
      } catch {
        setCsvError("Could not parse file. Make sure it matches the template format.");
      }
    };

    if (isExcel) reader.readAsArrayBuffer(file);
    else         reader.readAsText(file);
  };

  /* ── submit bulk upload ── */
  const handleBulkUpload = async () => {
    if (csvRows.length === 0) return;
    setUploading(true); setUploadResult(null);
    try {
      const districtName = districts.find(d => String(d.id) === uploadDistrict)?.name ?? "";
      const enrichedRows = csvRows.map(r => ({
        ...r,
        district_name: districtName || r.district_name || "",
        election_id:   uploadElection   || r.election_id   || "",
        constituency:  uploadConstituency || r.constituency || "",
      }));
      const res  = await fetch("/api/booths/bulk", { method: "POST", headers: hdr(), body: JSON.stringify({ booths: enrichedRows }) });
      const data = await res.json();
      if (!res.ok) { setCsvError(data.error ?? "Upload failed"); return; }
      setUploadResult(data);
      setUploadStep(3);
      if (data.inserted > 0) {
        setDistrictF(uploadDistrict);
        setElectionF(uploadElection);
        setConstituencyF(uploadConstituency);
        setPage(1);
      }
    } finally { setUploading(false); }
  };

  /* ── open add drawer ── */
  const openAdd = () => {
    setForm({ ...EMPTY_FORM });
    setAreas([]);
    setSaveErr("");
    loadDistricts();
    setDrawer("add");
  };

  /* ── open edit drawer ── */
  const openEdit = (b: Booth) => {
    setEditBooth(b);
    setForm({
      booth_number:  b.booth_number,
      village:       b.village,
      taluka:        b.taluka ?? "",
      constituency:  b.constituency ?? "",
      election_id:   b.election_id ?? "",
      district_id:   String(b.district_id ?? ""),
      area_id:       b.area_id ?? "",
      total_voters:  String(b.total_voters),
      volunteers:    String(b.volunteers),
      max_volunteers: String(b.max_volunteers),
      status:        b.status,
      booth_leader:  b.booth_leader ?? "",
      sentiment_pct: String(b.sentiment_pct),
      women_outreach: String(b.women_outreach),
      youth_support:  String(b.youth_support),
    });
    setSaveErr("");
    setPdfFile(null);
    setPdfErr("");
    setCurrentPdfUrl(b.voter_list_pdf_url ?? null);
    setCurrentPdfName(b.voter_list_pdf_name ?? null);
    loadDistricts();
    if (b.district_id && b.election_id) loadAreas(String(b.district_id), b.election_id);
    else setAreas([]);
    if (b.district_id) loadTalukas(String(b.district_id));
    else { setTalukas([]); setVillages([]); }
    setDrawer("edit");
  };

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const loadTalukas = useCallback(async (districtId: string) => {
    setTalukas([]); setVillages([]);
    if (!districtId) return;
    setTalukasLoading(true);
    try {
      const res = await fetch(`/api/booths/talukas?district_id=${districtId}`, { headers: hdr() });
      if (res.ok) setTalukas(await res.json());
    } finally { setTalukasLoading(false); }
  }, [hdr]);

  const loadVillages = useCallback(async (talukaCode: string) => {
    setVillages([]);
    if (!talukaCode) return;
    setVillagesLoading(true);
    try {
      const res = await fetch(`/api/booths/villages?taluka_code=${talukaCode}`, { headers: hdr() });
      if (res.ok) setVillages(await res.json());
    } finally { setVillagesLoading(false); }
  }, [hdr]);

  const handleDistrictChange = (distId: string) => {
    f("district_id", distId);
    f("area_id", "");
    f("taluka", "");
    f("village", "");
    setForm(p => ({ ...p, district_id: distId, area_id: "", taluka: "", village: "" }));
    loadAreas(distId, form.election_id);
    loadTalukas(distId);
  };

  const handleElectionChange = (elId: string) => {
    f("election_id", elId);
    f("area_id", "");
    loadAreas(form.district_id, elId);
  };

  const handleTalukaSelect = (code: string, name: string) => {
    setForm(p => ({ ...p, taluka: name, village: "" }));
    loadVillages(code);
  };

  /* ── save ── */
  const handleSave = async () => {
    setSaveErr("");
    if (!form.booth_number.trim() || !form.village.trim() || !form.election_id) {
      setSaveErr("Booth number, village, and election type are required.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        booth_number:   form.booth_number.trim(),
        village:        form.village.trim(),
        taluka:         form.taluka.trim() || null,
        constituency:   form.constituency.trim() || null,
        election_id:    form.election_id,
        district_id:    form.district_id ? Number(form.district_id) : null,
        area_id:        form.area_id || null,
        total_voters:   Number(form.total_voters) || 0,
        volunteers:     Number(form.volunteers) || 0,
        max_volunteers: Number(form.max_volunteers) || 5,
        status:         form.status,
        booth_leader:   form.booth_leader.trim() || null,
        sentiment_pct:  Number(form.sentiment_pct) || 0,
        women_outreach: Number(form.women_outreach) || 0,
        youth_support:  Number(form.youth_support) || 0,
      };

      const url    = drawer === "edit" ? `/api/booths/${editBooth!.id}` : "/api/booths";
      const method = drawer === "edit" ? "PUT" : "POST";
      const res    = await fetch(url, { method, headers: hdr(), body: JSON.stringify(body) });
      const data   = await res.json();
      if (!res.ok) { setSaveErr(data.error ?? "Save failed"); return; }
      setDrawer(null);
      load();
    } finally { setSaving(false); }
  };

  /* ── PDF upload — converts to base64 and sends as JSON ── */
  const handlePdfUpload = async () => {
    if (!pdfFile || !editBooth) return;
    setPdfErr("");
    setPdfUploading(true);
    try {
      const fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(pdfFile);
      });
      const res = await fetch(`/api/booths/${editBooth.id}/voter-list`, {
        method: "POST",
        headers: { ...hdr() },
        body: JSON.stringify({ fileName: pdfFile.name, fileData }),
      });
      const data = await res.json();
      if (!res.ok) { setPdfErr(data.error ?? "Upload failed"); return; }
      setCurrentPdfUrl(data.voter_list_pdf_url);
      setCurrentPdfName(data.voter_list_pdf_name);
      setPdfFile(null);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
      load();
    } catch (e: unknown) {
      setPdfErr(e instanceof Error ? e.message : "Upload failed");
    } finally { setPdfUploading(false); }
  };

  /* ── PDF delete ── */
  const handlePdfDelete = async () => {
    if (!editBooth) return;
    setPdfErr("");
    setPdfDeleting(true);
    try {
      const res = await fetch(`/api/booths/${editBooth.id}/voter-list`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const d = await res.json(); setPdfErr(d.error ?? "Delete failed"); return; }
      setCurrentPdfUrl(null);
      setCurrentPdfName(null);
      load();
    } finally { setPdfDeleting(false); }
  };

  const criticalCount = booths.filter(b => b.status === "critical").length;
  const weakCount     = booths.filter(b => b.status === "weak").length;
  const strongCount   = booths.filter(b => b.status === "strong").length;
  const pages         = Math.ceil(total / limit);
  const activeFilters = [electionF, districtF, constituencyF, statusF, search].filter(Boolean).length;

  // Group rows: insert a district+election group header when the combination changes
  type RowItem = { type: "group"; label: string; sub: string; count: number } | { type: "booth"; data: Booth };
  const rows: RowItem[] = [];
  let lastGroup = "";
  booths.forEach(b => {
    const groupKey = `${b.district_name ?? ""}||${b.election_id ?? ""}`;
    if (groupKey !== lastGroup) {
      const distLabel = b.district_name ?? "Unknown District";
      const elLabel   = b.election_id ? (ELECTION_LABELS[b.election_id] ?? b.election_id.toUpperCase()) : "Unknown Election";
      rows.push({ type: "group", label: distLabel, sub: elLabel, count: booths.filter(x => x.district_name === b.district_name && x.election_id === b.election_id).length });
      lastGroup = groupKey;
    }
    rows.push({ type: "booth", data: b });
  });

  const colSpan = canWrite ? 9 : 8;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Booths</h1>
          <p className="text-gray-400 text-sm mt-0.5">Sorted by district · election · status</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50">
            <RefreshCw size={13} />
          </button>
          {canWrite && (
            <>
              <button onClick={() => { setCsvRows([]); setCsvError(""); setUploadResult(null); setUploadConstituency(""); setUploadDistrict(""); setUploadElection(""); setUploadAreas([]); setUploadStep(1); setUploadModal(true); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                <Upload size={14} /> Upload CSV
              </button>
              <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm">
                <Plus size={14} /> Add Booth
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Booths",  value: total,        color: "text-gray-900",  bg: "bg-white" },
          { label: "Critical",      value: criticalCount, color: "text-red-600",  bg: "bg-red-50" },
          { label: "Weak",          value: weakCount,     color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Strong",        value: strongCount,   color: "text-green-700", bg: "bg-green-50" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-gray-100 rounded-2xl px-4 py-3 flex items-center justify-between`}>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{s.label}</span>
            <span className={`text-xl font-black ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 flex flex-wrap gap-3 mb-4 items-center shadow-sm">
        {/* Search */}
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 flex-1 min-w-[180px] max-w-xs">
          <Search size={13} className="text-gray-400 shrink-0" />
          <input type="text" placeholder="Search booth / village…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 text-sm text-gray-800 outline-none bg-transparent placeholder:text-gray-400" />
          {search && <button onClick={() => { setSearch(""); setPage(1); }}><X size={12} className="text-gray-400" /></button>}
        </div>

        {/* District */}
        <select value={districtF} onChange={e => { setDistrictF(e.target.value); setPage(1); }}
          className="bg-gray-50 border-0 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none min-w-[160px]">
          <option value="">All Districts ({districts.length || "…"})</option>
          {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        {/* Constituency */}
        {filterConsts.length > 0 && (
          <select value={constituencyF} onChange={e => { setConstituencyF(e.target.value); setPage(1); }}
            className="bg-gray-50 border-0 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none min-w-[160px] max-w-[200px]">
            <option value="">All Constituencies</option>
            {filterConsts.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}

        {/* Election — dynamic from booth data */}
        <select value={electionF} onChange={e => { setElectionF(e.target.value); setPage(1); }}
          className="bg-gray-50 border-0 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none min-w-[160px]">
          <option value="">All Elections ({filterElecs.length || "…"})</option>
          {(filterElecs.length > 0 ? filterElecs : Object.entries(ELECTION_LABELS).map(([id, label]) => ({ id, label }))).map(e => (
            <option key={e.id} value={e.id}>
              {e.label ?? ELECTION_LABELS[e.id] ?? e.id.toUpperCase()} ({e.id.toUpperCase()})
            </option>
          ))}
        </select>

        {/* Status */}
        <select value={statusF} onChange={e => { setStatusF(e.target.value); setPage(1); }}
          className="bg-gray-50 border-0 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none">
          <option value="">All Status</option>
          <option value="critical">Critical</option>
          <option value="weak">Weak</option>
          <option value="swing">Swing</option>
          <option value="strong">Strong</option>
        </select>

        {/* Clear filters */}
        {activeFilters > 0 && (
          <button onClick={() => { setSearch(""); setElectionF(""); setDistrictF(""); setConstituencyF(""); setStatusF(""); setPage(1); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-colors ml-auto">
            <X size={12} /> Clear ({activeFilters})
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wide">
              <th className="text-left px-5 py-3 w-24">Booth #</th>
              <th className="text-left px-4 py-3">Village / Taluka</th>
              <th className="text-left px-4 py-3 w-32">Voters</th>
              <th className="text-left px-4 py-3 w-36">Coverage</th>
              <th className="text-left px-4 py-3 w-36">Sentiment</th>
              <th className="text-left px-4 py-3 w-20">Vol.</th>
              <th className="text-left px-4 py-3 w-24">Status</th>
              <th className="text-left px-4 py-3">Booth Leader</th>
              {canWrite && <th className="px-4 py-3 w-14" />}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {[...Array(colSpan)].map((_, j) => (
                    <td key={j} className="px-5 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse w-16" /></td>
                  ))}
                </tr>
              ))
            ) : booths.length === 0 ? (
              <tr><td colSpan={colSpan} className="text-center py-16 text-gray-400">
                <div className="flex flex-col items-center gap-2">
                  <Search size={28} className="text-gray-200" />
                  <p className="font-semibold text-gray-500">No booths found</p>
                  {activeFilters > 0 && <p className="text-xs">Try clearing the filters above</p>}
                </div>
              </td></tr>
            ) : rows.map((row, idx) => {
              if (row.type === "group") {
                return (
                  <tr key={`g-${idx}`} className="bg-gradient-to-r from-blue-50 to-indigo-50 border-t-2 border-b border-blue-100">
                    <td colSpan={colSpan} className="px-5 py-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="font-black text-sm text-blue-900">{row.label}</span>
                        </div>
                        <span className="text-xs font-bold text-blue-500 bg-blue-100 px-2.5 py-0.5 rounded-full">{row.sub}</span>
                        <span className="text-xs text-blue-400 ml-auto">{row.count} booth{row.count !== 1 ? "s" : ""}</span>
                      </div>
                    </td>
                  </tr>
                );
              }
              const b = row.data;
              return (
                <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-black text-gray-800 text-sm">{b.booth_number}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-gray-800">{b.village}</p>
                    {b.taluka && <p className="text-xs text-gray-400">{b.taluka}</p>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-700">{b.total_voters.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(b.coverage_pct ?? 0, 100)}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-600 w-8">{b.coverage_pct ?? 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-1.5 rounded-full transition-all ${b.sentiment_pct >= 60 ? "bg-green-500" : b.sentiment_pct >= 40 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${b.sentiment_pct}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-600 w-8">{b.sentiment_pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-bold text-gray-700">{b.volunteers}</span>
                    <span className="text-xs text-gray-300">/{b.max_volunteers}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[b.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{b.booth_leader ?? <span className="text-gray-300">—</span>}</td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                        <Edit2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        {/* Left: showing range + page size selector */}
        <div className="flex items-center gap-3">
          <p className="text-gray-400">
            {total === 0 ? "No results" : `Showing ${((page - 1) * limit) + 1}–${Math.min(page * limit, total)} of ${total}`}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">Rows:</span>
            <div className="flex gap-1">
              {[10, 20, 50, 100, 500, 1000].map(n => (
                <button key={n} onClick={() => { setLimit(n); setPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    limit === n
                      ? "bg-blue-600 text-white"
                      : "border border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: prev / page numbers / next */}
        {pages > 1 && (
          <div className="flex items-center gap-1.5">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-2 rounded-xl border border-gray-200 font-semibold text-gray-600 disabled:opacity-40 hover:bg-gray-50">
              ← Prev
            </button>
            {/* Show at most 5 page buttons around current page */}
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, pages - 4));
              return start + i;
            }).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-xl text-xs font-bold transition-colors ${
                  p === page
                    ? "bg-blue-600 text-white"
                    : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}>
                {p}
              </button>
            ))}
            {pages > 5 && page < pages - 2 && <span className="text-gray-300 px-1">…</span>}
            {pages > 5 && page < pages - 2 && (
              <button onClick={() => setPage(pages)}
                className="w-9 h-9 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50">
                {pages}
              </button>
            )}
            <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-2 rounded-xl border border-gray-200 font-semibold text-gray-600 disabled:opacity-40 hover:bg-gray-50">
              Next →
            </button>
          </div>
        )}
      </div>

      {/* ── Upload CSV Modal — 3-step wizard ── */}
      {uploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setUploadModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Upload size={15} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="font-black text-base text-gray-900">Bulk Upload Booths</h2>
                  <p className="text-xs text-gray-400">
                    {uploadStep === 1 ? "Step 1 of 3 — Select context" : uploadStep === 2 ? "Step 2 of 3 — Upload file" : "Step 3 of 3 — Results"}
                  </p>
                </div>
              </div>
              <button onClick={() => setUploadModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            {/* Step progress bar */}
            <div className="px-6 pt-4 pb-1 shrink-0">
              <div className="flex items-center gap-1.5">
                {([1, 2, 3] as const).map(s => (
                  <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${s <= uploadStep ? "bg-blue-500" : "bg-gray-100"}`} />
                ))}
              </div>
              <div className="flex justify-between mt-1.5">
                {["Select Context", "Upload File", "Results"].map((label, i) => (
                  <span key={i} className={`text-[10px] font-bold tracking-wide ${i + 1 <= uploadStep ? "text-blue-600" : "text-gray-300"}`}>{label}</span>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {/* ── STEP 1: Select District + Election + Constituency ── */}
              {uploadStep === 1 && (
                <>
                  <p className="text-sm text-gray-500">Choose the district, election type, and constituency for this upload. All uploaded booths will be tagged with these values.</p>

                  {/* District */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">District *</label>
                    <select value={uploadDistrict} onChange={e => setUploadDistrict(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 bg-white">
                      <option value="">Select district</option>
                      {districts.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
                    </select>
                  </div>

                  {/* Election type */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Election Type *</label>
                    <select value={uploadElection} onChange={e => setUploadElection(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 bg-white">
                      <option value="">Select election type</option>
                      {Object.entries(ELECTION_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v} ({k.toUpperCase()})</option>
                      ))}
                    </select>
                  </div>

                  {/* Constituency — dropdown from areas if available */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                      Constituency *
                      {uploadAreasLoading && <span className="ml-1 font-normal text-gray-400 normal-case">(loading…)</span>}
                    </label>
                    {uploadAreas.length > 0 ? (
                      <select
                        value={uploadConstituency}
                        onChange={e => setUploadConstituency(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 bg-white">
                        <option value="">Select constituency</option>
                        {uploadAreas.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={uploadConstituency}
                        onChange={e => setUploadConstituency(e.target.value)}
                        placeholder={
                          !uploadDistrict || !uploadElection
                            ? "Select district & election first"
                            : "No constituencies found — type manually"
                        }
                        disabled={!uploadDistrict || !uploadElection}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 disabled:bg-gray-50 disabled:text-gray-400"
                      />
                    )}
                  </div>

                  {/* Template download (helpful on step 1 too) */}
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                    <p className="text-xs font-bold text-gray-600 mb-2">Need a template? Download and fill it in.</p>
                    <div className="flex gap-2">
                      <button onClick={() => downloadTemplate("xlsx")}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700">
                        <FileSpreadsheet size={12} /> Excel (.xlsx)
                      </button>
                      <button onClick={() => downloadTemplate("csv")}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700">
                        <Download size={12} /> CSV (.csv)
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-2">Columns: booth_number, village, taluka, total_voters, volunteers, max_volunteers, status, booth_leader, sentiment_pct, women_outreach, youth_support</p>
                    <p className="text-[11px] text-blue-500 mt-0.5">Maharashtra government Excel format ("1 - हातीवडे") is also supported.</p>
                  </div>
                </>
              )}

              {/* ── STEP 2: Upload file ── */}
              {uploadStep === 2 && (
                <>
                  {/* Context chips */}
                  <div className="flex flex-wrap gap-2">
                    <span className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold px-3 py-1.5 rounded-full">
                      <span className="text-blue-400 font-normal">District</span>
                      {districts.find(d => String(d.id) === uploadDistrict)?.name ?? uploadDistrict}
                    </span>
                    <span className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold px-3 py-1.5 rounded-full">
                      <span className="text-indigo-400 font-normal">Election</span>
                      {ELECTION_LABELS[uploadElection] ?? uploadElection.toUpperCase()} ({uploadElection.toUpperCase()})
                    </span>
                    <span className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-800 text-xs font-bold px-3 py-1.5 rounded-full">
                      <span className="text-green-500 font-normal">Constituency</span>
                      {uploadConstituency}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 -mt-1">All uploaded rows will be tagged with the above values.</p>

                  {/* File drop zone */}
                  <label
                    htmlFor="booth-csv-input"
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleCsvFile(f); }}
                    className="block border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <Upload size={22} className="text-gray-300" />
                      <FileSpreadsheet size={22} className="text-gray-300" />
                    </div>
                    {csvRows.length > 0
                      ? <p className="text-sm font-bold text-blue-600">{csvRows.length} rows loaded — click to replace file</p>
                      : <p className="text-sm font-semibold text-gray-500">Click to browse or drag & drop here</p>
                    }
                    <p className="text-xs text-gray-400 mt-1">
                      Supports <span className="font-bold text-green-600">.xlsx</span>, <span className="font-bold text-green-600">.xls</span>, <span className="font-bold text-blue-500">.csv</span> · Max 500 rows
                    </p>
                    <input
                      id="booth-csv-input"
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                      style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleCsvFile(f); e.target.value = ""; }}
                    />
                  </label>

                  {csvError && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
                      <XCircle size={16} className="shrink-0" /> {csvError}
                    </div>
                  )}

                  {/* Preview table */}
                  {csvRows.length > 0 && (
                    <div>
                      <p className="font-bold text-sm text-gray-700 mb-2">
                        Preview — {csvRows.length} row{csvRows.length !== 1 ? "s" : ""} detected
                      </p>
                      <div className="overflow-x-auto rounded-xl border border-gray-100">
                        <table className="w-full text-xs min-w-[500px]">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              {["#", "booth_number", "village", "constituency", "election_id", "status"].map(h => (
                                <th key={h} className="text-left px-3 py-2 font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {csvRows.slice(0, 10).map((row, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-400">{i + 2}</td>
                                <td className="px-3 py-2 font-semibold text-gray-800">{row.booth_number || <span className="text-red-400">—</span>}</td>
                                <td className="px-3 py-2 text-gray-600">{row.village || <span className="text-red-400">—</span>}</td>
                                <td className="px-3 py-2 font-medium text-green-700">{uploadConstituency}</td>
                                <td className="px-3 py-2">
                                  <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase">{uploadElection}</span>
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`px-1.5 py-0.5 rounded font-bold capitalize ${STATUS_STYLES[row.status] ?? "bg-gray-100 text-gray-500"}`}>
                                    {row.status || "swing"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {csvRows.length > 10 && (
                          <p className="text-center text-xs text-gray-400 py-2">…and {csvRows.length - 10} more rows</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── STEP 3: Results ── */}
              {uploadStep === 3 && uploadResult && (
                <div className="space-y-4">
                  <div className={`flex items-center gap-3 p-4 rounded-2xl border ${uploadResult.inserted > 0 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
                    <CheckCircle2 size={24} className={uploadResult.inserted > 0 ? "text-green-600" : "text-amber-500"} />
                    <div>
                      <p className="font-black text-base text-gray-900">{uploadResult.inserted} booth{uploadResult.inserted !== 1 ? "s" : ""} added successfully</p>
                      {uploadResult.errors.length > 0 && (
                        <p className="text-xs text-amber-700 mt-0.5">{uploadResult.errors.length} row{uploadResult.errors.length !== 1 ? "s" : ""} had errors</p>
                      )}
                    </div>
                  </div>

                  {uploadResult.inserted > 0 && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                      <p className="text-xs font-bold text-blue-700 mb-1">Filters applied automatically</p>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                          {districts.find(d => String(d.id) === uploadDistrict)?.name}
                        </span>
                        <span className="bg-indigo-100 text-indigo-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                          {ELECTION_LABELS[uploadElection] ?? uploadElection.toUpperCase()}
                        </span>
                        <span className="bg-green-100 text-green-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                          {uploadConstituency}
                        </span>
                      </div>
                      <p className="text-[11px] text-blue-500 mt-1">The booth list is now filtered to show your uploaded data.</p>
                    </div>
                  )}

                  {uploadResult.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-100 rounded-xl overflow-hidden">
                      <div className="px-4 py-2 border-b border-red-100 bg-red-100">
                        <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Row Errors</p>
                      </div>
                      <div className="divide-y divide-red-50 max-h-48 overflow-y-auto">
                        {uploadResult.errors.map((e, i) => (
                          <div key={i} className="px-4 py-2 flex items-start gap-2">
                            <XCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
                            <span className="text-xs text-red-700">
                              <span className="font-bold">Row {e.row}</span> {e.booth_number ? `(${e.booth_number})` : ""}: {e.error}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
              {uploadStep === 1 && (
                <>
                  <button onClick={() => setUploadModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button
                    onClick={() => { if (uploadDistrict && uploadElection && uploadConstituency.trim()) { setCsvRows([]); setCsvError(""); setUploadStep(2); } }}
                    disabled={!uploadDistrict || !uploadElection || !uploadConstituency.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center gap-2">
                    Next — Upload File →
                  </button>
                </>
              )}
              {uploadStep === 2 && (
                <>
                  <button onClick={() => { setUploadStep(1); setCsvRows([]); setCsvError(""); }}
                    className="py-2.5 px-5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                    ← Back
                  </button>
                  <button onClick={handleBulkUpload} disabled={csvRows.length === 0 || uploading}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    {uploading
                      ? <><RefreshCw size={14} className="animate-spin" /> Uploading…</>
                      : <><Upload size={14} /> Upload {csvRows.length > 0 ? `${csvRows.length} Rows` : "File"}</>
                    }
                  </button>
                </>
              )}
              {uploadStep === 3 && (
                <button onClick={() => setUploadModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700">
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Drawer ── */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDrawer(null)} />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="font-black text-lg text-gray-900">{drawer === "add" ? "Add Booth" : "Edit Booth"}</h2>
              <button onClick={() => setDrawer(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {/* Election type */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Election Type *</label>
                <select value={form.election_id} onChange={e => handleElectionChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 bg-white">
                  <option value="">Select election type</option>
                  {Object.entries(ELECTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v} ({k.toUpperCase()})</option>)}
                </select>
              </div>

              {/* District */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">District</label>
                <select value={form.district_id} onChange={e => handleDistrictChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 bg-white">
                  <option value="">Select district</option>
                  {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              {/* Area */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Area {areasLoading && <span className="text-gray-400 font-normal">(loading…)</span>}
                </label>
                <select value={form.area_id} onChange={e => f("area_id", e.target.value)}
                  disabled={areas.length === 0}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 bg-white disabled:opacity-50">
                  <option value="">Select area (optional)</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Booth number */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Booth Number *</label>
                  <input value={form.booth_number} onChange={e => f("booth_number", e.target.value)}
                    placeholder="e.g. B-042" maxLength={20}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400" />
                </div>
                {/* Total voters */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Total Voters</label>
                  <input type="number" min={0} value={form.total_voters} onChange={e => f("total_voters", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400" />
                </div>
              </div>

              {/* Taluka — dropdown from district selection */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Taluka {talukasLoading && <span className="text-gray-400 font-normal">(loading…)</span>}
                </label>
                {talukas.length > 0 ? (
                  <select
                    value={talukas.find(t => t.name === form.taluka)?.code ?? ""}
                    onChange={e => {
                      const t = talukas.find(x => x.code === e.target.value);
                      if (t) handleTalukaSelect(t.code, t.name);
                      else setForm(p => ({ ...p, taluka: "", village: "" }));
                    }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 bg-white">
                    <option value="">Select taluka</option>
                    {talukas.map(t => <option key={t.code} value={t.code}>{t.name}</option>)}
                  </select>
                ) : (
                  <input value={form.taluka} onChange={e => f("taluka", e.target.value)}
                    placeholder={form.district_id ? "No taluka data — type manually" : "Select district first"}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400" />
                )}
              </div>

              {/* Village — dropdown from taluka selection */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Village * {villagesLoading && <span className="text-gray-400 font-normal">(loading…)</span>}
                </label>
                {villages.length > 0 ? (
                  <select
                    value={villages.find(v => v.name === form.village)?.code ?? ""}
                    onChange={e => {
                      const v = villages.find(x => x.code === e.target.value);
                      f("village", v?.name ?? "");
                    }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 bg-white">
                    <option value="">Select village</option>
                    {villages.map(v => <option key={v.code} value={v.code}>{v.name}</option>)}
                  </select>
                ) : (
                  <input value={form.village} onChange={e => f("village", e.target.value)}
                    placeholder={form.taluka ? "No village data — type manually" : "Select taluka first"}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400" />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Constituency</label>
                <input value={form.constituency} onChange={e => f("constituency", e.target.value)}
                  placeholder="e.g. Wardha"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400" />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Status</label>
                <div className="flex gap-2">
                  {["strong", "swing", "weak", "critical"].map(s => (
                    <button key={s} type="button" onClick={() => f("status", s)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize border transition-all ${
                        form.status === s
                          ? s === "strong" ? "bg-green-500 text-white border-green-500"
                          : s === "swing"  ? "bg-amber-400 text-white border-amber-400"
                          : s === "weak"   ? "bg-orange-500 text-white border-orange-500"
                                           : "bg-red-500 text-white border-red-500"
                          : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Voter List PDF (edit mode only) ── */}
              {drawer === "edit" && (
                <div className="border-2 border-dashed border-blue-300 rounded-2xl p-4 bg-blue-50 space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-blue-600 shrink-0" />
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Voter List PDF</span>
                  </div>

                  {currentPdfUrl ? (
                    <div className="flex items-center gap-3 bg-white border border-blue-100 rounded-xl px-3 py-2.5">
                      <FileText size={18} className="text-blue-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{currentPdfName ?? "voter-list.pdf"}</p>
                        <p className="text-xs text-green-600 font-medium">Uploaded — visible to mobile users</p>
                      </div>
                      <a href={currentPdfUrl} target="_blank" rel="noreferrer"
                        className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors" title="Preview">
                        <Download size={14} />
                      </a>
                      <button onClick={handlePdfDelete} disabled={pdfDeleting}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors disabled:opacity-50" title="Remove">
                        {pdfDeleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-gray-400 bg-white border border-gray-100 rounded-xl px-3 py-2.5">
                      <FileText size={14} className="shrink-0 text-gray-300" />
                      <span>No voter list uploaded yet</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5 cursor-pointer hover:border-blue-400 transition-colors">
                      <Upload size={14} className="text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-500 truncate flex-1">
                        {pdfFile ? pdfFile.name : "Choose PDF file…"}
                      </span>
                      <input
                        ref={pdfInputRef}
                        type="file"
                        accept="application/pdf"
                        className="sr-only"
                        onChange={e => { const file = e.target.files?.[0]; setPdfFile(file ?? null); setPdfErr(""); }}
                      />
                    </label>
                    <button
                      onClick={handlePdfUpload}
                      disabled={!pdfFile || pdfUploading}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-40 shrink-0"
                    >
                      {pdfUploading
                        ? <><RefreshCw size={13} className="animate-spin" /> Uploading…</>
                        : <><Upload size={13} /> Upload</>
                      }
                    </button>
                  </div>

                  {pdfErr && (
                    <p className="text-xs text-red-600 font-medium flex items-center gap-1.5">
                      <XCircle size={12} /> {pdfErr}
                    </p>
                  )}
                </div>
              )}

              {/* Booth leader */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Booth Leader</label>
                <input value={form.booth_leader} onChange={e => f("booth_leader", e.target.value)}
                  placeholder="Leader name"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Volunteers</label>
                  <input type="number" min={0} value={form.volunteers} onChange={e => f("volunteers", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Max Volunteers</label>
                  <input type="number" min={1} value={form.max_volunteers} onChange={e => f("max_volunteers", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Sentiment %</label>
                  <input type="number" min={0} max={100} value={form.sentiment_pct} onChange={e => f("sentiment_pct", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Women %</label>
                  <input type="number" min={0} max={100} value={form.women_outreach} onChange={e => f("women_outreach", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Youth %</label>
                  <input type="number" min={0} max={100} value={form.youth_support} onChange={e => f("youth_support", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400" />
                </div>
              </div>

              {saveErr && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
                  {saveErr}
                </div>
              )}
            </div>

            {/* Drawer footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
              <button onClick={() => setDrawer(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60">
                {saving ? "Saving…" : drawer === "add" ? "Add Booth" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
