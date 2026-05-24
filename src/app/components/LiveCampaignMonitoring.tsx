import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useUserLocation } from "../context/LocationContext";
import LocationPermissionModal from "./LocationPermissionModal";
import { useTheme } from "../context/ThemeContext";
import {
  ArrowLeft, Bell, Search, X, Users, MapPin, BarChart2,
  AlertTriangle, Activity, Zap, CheckCircle2, TrendingUp,
  TrendingDown, Minus, Clock, UserCheck, Megaphone,
  PhoneCall, Flag, Target, ChevronRight, RefreshCw, Send,
  MonitorCheck, Navigation, Home, AlertCircle, Flame,
  Shield, Radio, Eye, Filter, ChevronDown, ChevronLeft, Download, Calendar,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────── */
type BoothStatus = "strong" | "swing" | "weak" | "critical";
type FeedType = "checkin" | "survey" | "alert" | "coverage";
type Tab = "booths" | "volunteers" | "surveys" | "locations" | "analytics";
type ElectionId = "ls" | "vs" | "vp" | "mc" | "zp" | "ps" | "gp" | "np";

interface Booth {
  id: number; number: string; village: string; taluka: string;
  district: string; constituency: string; volunteers: number;
  maxVolunteers: number; totalVoters: number; covered: number;
  sentiment: number; womenOutreach: number; youthSupport: number;
  status: BoothStatus; agent: string; lastSurvey: string;
  lastActivity: string; warnings: string[]; trend: "up" | "down" | "stable";
  areaId: string; electionId: ElectionId;
  voterListUrl: string | null;
}

interface FeedItem {
  id: number; type: FeedType; msg: string; time: string; color: string;
}

interface ElectionType {
  id: ElectionId; label: string; short: string; icon: string;
  gradient: string; activeBg: string; activeText: string; activeBorder: string;
}

interface ElectionArea {
  id: string; name: string; sub: string;
  totalVoters: number; totalBooths: number;
  ncpStatus: BoothStatus; ncpVoteShare: number;
  activeVolunteers: number; coverage: number;
  prevVoteShare: number;
}

interface VoterIssue { label: string; score: number; icon: string; }

interface VolunteerRow {
  id: number; name: string; mobile: string; role: string;
  area_name: string | null; district_name: string | null;
  last_seen_at: string | null; is_active: boolean;
  assigned_booth: number | null;
}

interface SurveyRow {
  id: number; response: string; booth_id: number;
  volunteer_id: number | null; surveyed_at: string;
  booth_number: string | null; village: string | null;
}

interface CampaignEventRow {
  id: number; title: string; type: string; location: string;
  district: string | null; event_date: string; event_time: string;
  coordinator: string | null; expected_attendance: number;
  status: string; election_id: string | null;
}

/* ─── Election Types ─────────────────────────────────────────────── */
const ELECTION_TYPES: ElectionType[] = [
  { id: "ls", label: "Lok Sabha",        short: "LS", icon: "🏛️", gradient: "from-orange-500 to-red-600",    activeBg: "bg-orange-500/25", activeText: "text-orange-300", activeBorder: "border-orange-500/60" },
  { id: "vs", label: "Vidhan Sabha",     short: "VS", icon: "🏟️", gradient: "from-blue-500 to-indigo-600",   activeBg: "bg-blue-500/25",   activeText: "text-blue-300",   activeBorder: "border-blue-500/60"   },
  { id: "vp", label: "Vidhan Parishad",  short: "VP", icon: "⚖️", gradient: "from-purple-500 to-violet-600", activeBg: "bg-purple-500/25", activeText: "text-purple-300", activeBorder: "border-purple-500/60" },
  { id: "mc", label: "Mun. Corporation", short: "MC", icon: "🏙️", gradient: "from-teal-500 to-cyan-600",     activeBg: "bg-teal-500/25",   activeText: "text-teal-300",   activeBorder: "border-teal-500/60"   },
  { id: "zp", label: "Zilla Parishad",   short: "ZP", icon: "🏢", gradient: "from-green-500 to-emerald-600", activeBg: "bg-green-500/25",  activeText: "text-green-300",  activeBorder: "border-green-500/60"  },
  { id: "ps", label: "Panchayat Samiti", short: "PS", icon: "🌾", gradient: "from-lime-500 to-green-600",    activeBg: "bg-lime-500/25",   activeText: "text-lime-300",   activeBorder: "border-lime-500/60"   },
  { id: "gp", label: "Gram Panchayat",   short: "GP", icon: "🌿", gradient: "from-yellow-500 to-amber-600",  activeBg: "bg-yellow-500/25", activeText: "text-yellow-300", activeBorder: "border-yellow-500/60" },
  { id: "np", label: "Nagar Panchayat",  short: "NP", icon: "🏘️", gradient: "from-pink-500 to-rose-600",     activeBg: "bg-pink-500/25",   activeText: "text-pink-300",   activeBorder: "border-pink-500/60"   },
];

/* ─── API helpers ────────────────────────────────────────────────── */
function timeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) > 1 ? "s" : ""} ago`;
}

function mapArea(row: Record<string, unknown>): ElectionArea {
  return {
    id:               String(row.id),
    name:             String(row.name),
    sub:              String(row.sub_label || ""),
    totalVoters:      Number(row.total_voters)     || 0,
    totalBooths:      Number(row.total_booths)     || 0,
    ncpStatus:        (String(row.ncp_status || "swing")) as BoothStatus,
    ncpVoteShare:     Number(row.ncp_vote_share)   || 0,
    activeVolunteers: Number(row.active_volunteers)|| 0,
    coverage:         Number(row.coverage_pct)     || 0,
    prevVoteShare:    Number(row.prev_vote_share)   || 0,
  };
}

function mapBooth(row: Record<string, unknown>): Booth {
  const covered = Number(row.covered) || 0;
  const total   = Number(row.total_voters) || 0;
  const covPct  = total > 0 ? Math.round((covered / total) * 100) : 0;
  const warnings: string[] = [];
  if (Number(row.volunteers) === 0)                 warnings.push("No volunteers assigned");
  if (covered === 0 && total > 0)                   warnings.push("Zero coverage");
  else if (covPct < 35 && total > 0)                warnings.push("Low coverage");
  if (Number(row.sentiment_pct) < 40 && Number(row.sentiment_pct) > 0) warnings.push("Low sentiment");
  return {
    id:            Number(row.id),
    number:        String(row.booth_number),
    village:       String(row.village),
    taluka:        String(row.taluka        || ""),
    district:      String(row.district_name || "Wardha"),
    constituency:  String(row.constituency  || ""),
    volunteers:    Number(row.volunteers)    || 0,
    maxVolunteers: Number(row.max_volunteers)|| 5,
    totalVoters:   total,
    covered,
    sentiment:     Number(row.sentiment_pct) || 0,
    womenOutreach: Number(row.women_outreach)|| 0,
    youthSupport:  Number(row.youth_support) || 0,
    status:        (String(row.status || "swing")) as BoothStatus,
    agent:         String(row.booth_leader  || "—"),
    lastSurvey:    row.last_survey_at   ? timeAgo(new Date(String(row.last_survey_at)))   : "—",
    lastActivity:  row.last_activity_at ? timeAgo(new Date(String(row.last_activity_at))) : "—",
    warnings,
    trend:         (String(row.trend || "stable")) as "up" | "down" | "stable",
    areaId:        String(row.area_id     || ""),
    electionId:    (String(row.election_id || "zp")) as ElectionId,
    voterListUrl:  row.voter_list_pdf_url ? String(row.voter_list_pdf_url) : null,
  };
}


/* ─── Other Data ─────────────────────────────────────────────────── */

const QUICK_ACTIONS = [
  { label: "Send Volunteers", icon: Users,      color: "from-blue-500 to-cyan-500"     },
  { label: "Schedule Rally",  icon: Megaphone,  color: "from-purple-500 to-violet-500" },
  { label: "Door-to-door",    icon: Home,       color: "from-emerald-500 to-teal-500"  },
  { label: "Women Outreach",  icon: UserCheck,  color: "from-pink-500 to-rose-500"     },
  { label: "Farmer Meeting",  icon: Flag,       color: "from-amber-500 to-orange-500"  },
  { label: "Rally Call",      icon: PhoneCall,  color: "from-indigo-500 to-blue-500"   },
];


/* ─── Status config ──────────────────────────────────────────────── */
const STATUS_CFG = {
  strong:   { label: "Strong",   border: "border-l-emerald-500", bg: "bg-emerald-500/10", badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", glow: "",                                       dot: "bg-emerald-400" },
  swing:    { label: "Swing",    border: "border-l-amber-500",   bg: "bg-amber-500/10",   badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",       glow: "",                                       dot: "bg-amber-400"   },
  weak:     { label: "Weak",     border: "border-l-orange-500",  bg: "bg-orange-500/10",  badge: "bg-orange-500/20 text-orange-400 border-orange-500/30",    glow: "",                                       dot: "bg-orange-400"  },
  critical: { label: "Critical", border: "border-l-red-500",     bg: "bg-red-500/10",     badge: "bg-red-500/20 text-red-400 border-red-500/30",             glow: "shadow-[0_0_20px_rgba(239,68,68,0.3)]",  dot: "bg-red-400"     },
};

const FEED_ICONS: Record<FeedType, JSX.Element> = {
  checkin:  <UserCheck  size={12} />,
  survey:   <CheckCircle2 size={12} />,
  alert:    <AlertTriangle size={12} />,
  coverage: <TrendingUp size={12} />,
};

const TABS_LIST: { id: Tab; label: string; icon: typeof MonitorCheck }[] = [
  { id: "booths",     label: "Booths",     icon: MonitorCheck },
  { id: "volunteers", label: "Volunteers", icon: Users        },
  { id: "surveys",    label: "Surveys",    icon: Eye          },
  { id: "locations",  label: "Locations",  icon: Navigation   },
  { id: "analytics",  label: "Analytics",  icon: BarChart2    },
];

/* ─── Helpers ────────────────────────────────────────────────────── */
function fmtVoters(n: number) {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

function getVoterFunnel(booth: Booth) {
  const contacted    = booth.covered;
  const surveyed     = Math.round(booth.covered * 0.76);
  const confirmedNCP = booth.totalVoters > 0 ? Math.round(booth.totalVoters * (booth.sentiment / 100) * 0.78) : 0;
  const undecided    = booth.totalVoters > 0 ? Math.round(booth.totalVoters * 0.17) : 0;
  const opposition   = Math.max(0, booth.totalVoters - confirmedNCP - undecided);
  return { contacted, surveyed, confirmedNCP, undecided, opposition };
}

/* ─── Sub-components ─────────────────────────────────────────────── */
function StatBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
      <motion.div className={`h-full rounded-full ${color}`} initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
    </div>
  );
}

function TrendIcon({ trend }: { trend: Booth["trend"] }) {
  if (trend === "up")   return <TrendingUp  size={12} className="text-emerald-400" />;
  if (trend === "down") return <TrendingDown size={12} className="text-red-400" />;
  return <Minus size={12} className="text-gray-400" />;
}

function AreaCard({ area, onSelect }: { area: ElectionArea; onSelect: () => void }) {
  const cfg = STATUS_CFG[area.ncpStatus];
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onSelect}
      className={`text-left w-full rounded-2xl border-l-4 ${cfg.border} ${cfg.glow} bg-white/5 backdrop-blur-md border border-white/10 p-3 hover:bg-white/10 transition-colors active:scale-95`}
    >
      <div className="flex items-start justify-between gap-1 mb-2.5">
        <div className="min-w-0">
          <p className="font-bold text-sm text-white truncate">{area.name}</p>
          <p className="text-[9px] text-gray-500 mt-0.5">{area.sub}</p>
        </div>
        <span className={`shrink-0 px-1.5 py-0.5 rounded-lg border text-[9px] font-bold ${cfg.badge}`}>{cfg.label}</span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-[10px]">
          <span className="text-gray-400">{fmtVoters(area.totalVoters)} voters</span>
          <span className="text-gray-400">{area.totalBooths} booths</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[9px]">
            <span className="text-gray-500">NCP Vote Share</span>
            <span className="font-bold text-white">{area.ncpVoteShare}%</span>
          </div>
          <StatBar value={area.ncpVoteShare} color={area.ncpVoteShare >= 60 ? "bg-emerald-500" : area.ncpVoteShare >= 45 ? "bg-amber-500" : "bg-red-500"} />
        </div>
        <div className="flex items-center gap-1 text-[9px] text-gray-500">
          <Users size={8} />
          <span>{area.activeVolunteers} volunteers · {area.coverage}% coverage</span>
        </div>
      </div>
    </motion.button>
  );
}

function BoothCard({ booth, index }: { booth: Booth; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CFG[booth.status];
  const coveragePct = booth.totalVoters > 0 ? Math.round((booth.covered / booth.totalVoters) * 100) : 0;
  const isCritical = booth.status === "critical";
  const isStrong   = booth.status === "strong";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className={`rounded-2xl border-l-4 ${cfg.border} ${cfg.glow} bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden cursor-pointer`}
      onClick={() => setExpanded(e => !e)}
    >
      {isCritical && <div className="absolute inset-0 rounded-2xl animate-pulse bg-red-500/5 pointer-events-none" />}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isStrong ? "bg-emerald-500/20" : isCritical ? "bg-red-500/20" : "bg-white/10"}`}>
              <MonitorCheck size={18} className={isStrong ? "text-emerald-400" : isCritical ? "text-red-400" : "text-gray-300"} />
            </div>
            {booth.volunteers > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-slate-900 animate-pulse" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-white text-sm">Booth {booth.number}</span>
              <TrendIcon trend={booth.trend} />
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5 truncate">{booth.village} · {booth.taluka} · {booth.district}</p>
            <p className="text-[10px] text-gray-500 truncate">{booth.constituency}</p>
          </div>
          <div className={`shrink-0 px-2.5 py-1 rounded-xl border text-[11px] font-bold ${cfg.badge}`}>{cfg.label}</div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: "Volunteers", value: `${booth.volunteers}/${booth.maxVolunteers}` },
            { label: "Coverage",   value: `${coveragePct}%` },
            { label: "Sentiment",  value: `${booth.sentiment}%` },
          ].map(s => (
            <div key={s.label} className="bg-white/5 rounded-xl p-2 text-center">
              <p className="font-black text-white text-sm leading-none">{s.value}</p>
              <p className="text-[9px] text-gray-400 mt-0.5 leading-none">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-400">Voter Coverage</span>
            <span className="text-[10px] font-bold text-white">{coveragePct}%</span>
          </div>
          <StatBar value={coveragePct} color={coveragePct >= 70 ? "bg-emerald-500" : coveragePct >= 50 ? "bg-amber-500" : coveragePct >= 30 ? "bg-orange-500" : "bg-red-500"} />
        </div>
        {booth.totalVoters > 0 && (() => {
          const { confirmedNCP, undecided } = getVoterFunnel(booth);
          const ncpPct  = Math.round((confirmedNCP / booth.totalVoters) * 100);
          const greyPct = Math.round((undecided / booth.totalVoters) * 100);
          const oppPct  = Math.max(0, 100 - ncpPct - greyPct);
          return (
            <div className="mt-2.5">
              <div className="flex justify-between text-[9px] mb-1">
                <span className="text-gray-500">Voter Janganana</span>
                <span className="text-gray-500">{booth.totalVoters.toLocaleString()} registered</span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 rounded-l-full" style={{ width: `${ncpPct}%` }} />
                <div className="bg-amber-400" style={{ width: `${greyPct}%` }} />
                <div className="bg-red-500 rounded-r-full flex-1" />
              </div>
              <div className="flex justify-between text-[9px] mt-1">
                <span className="text-emerald-400 font-semibold">{ncpPct}% NCP</span>
                <span className="text-amber-400 font-semibold">{greyPct}% Grey</span>
                <span className="text-red-400 font-semibold">{oppPct}% Opp</span>
              </div>
            </div>
          );
        })()}
      </div>
      {/* Booth Leader + Download */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-t border-white/5">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 ${isStrong ? "bg-emerald-600" : isCritical ? "bg-red-600" : "bg-blue-600"}`}>
          {booth.agent !== "—" ? booth.agent.split(" ").map(n => n[0]).join("").slice(0, 2) : "?"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] text-gray-500 leading-none">Booth Leader</p>
          <p className="text-[11px] text-gray-200 font-semibold leading-tight truncate">{booth.agent}</p>
          <p className="text-[9px] text-gray-500 flex items-center gap-1 mt-0.5"><Clock size={8} />{booth.lastActivity}</p>
        </div>
        {booth.voterListUrl ? (
          <a
            href={booth.voterListUrl}
            target="_blank"
            rel="noreferrer"
            download
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 rounded-xl px-2.5 py-1.5 text-[10px] text-blue-400 font-bold shrink-0 transition-colors active:scale-95"
          >
            <Download size={11} />
            Voter List
          </a>
        ) : (
          <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-[10px] text-gray-600 font-bold shrink-0 cursor-not-allowed">
            <Download size={11} />
            Voter List
          </span>
        )}
        <ChevronRight size={13} className={`text-gray-500 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
              {booth.totalVoters > 0 && (() => {
                const { contacted, surveyed, confirmedNCP, undecided } = getVoterFunnel(booth);
                const ncpPct  = Math.round((confirmedNCP / booth.totalVoters) * 100);
                const greyPct = Math.round((undecided / booth.totalVoters) * 100);
                const oppPct  = Math.max(0, 100 - ncpPct - greyPct);
                const steps = [
                  { label: "Total Voters",  value: booth.totalVoters, pct: 100,                                                                                color: "bg-blue-500"    },
                  { label: "Contacted",     value: contacted,          pct: Math.round((contacted    / booth.totalVoters) * 100),                              color: "bg-cyan-500"    },
                  { label: "Surveyed",      value: surveyed,           pct: Math.round((surveyed     / booth.totalVoters) * 100),                              color: "bg-violet-500"  },
                  { label: "Confirmed NCP", value: confirmedNCP,       pct: ncpPct,                                                                            color: "bg-emerald-500" },
                ];
                return (
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-[11px] font-bold text-white mb-2.5 flex items-center gap-1.5">
                      <span className="text-base">🗳️</span> Voter Janganana
                    </p>
                    <div className="space-y-2">
                      {steps.map(s => (
                        <div key={s.label} className="flex items-center gap-2">
                          <span className="text-[9px] text-gray-400 w-24 shrink-0">{s.label}</span>
                          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${s.color} transition-all duration-700`} style={{ width: `${s.pct}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-white w-8 text-right shrink-0">{s.pct}%</span>
                          <span className="text-[9px] text-gray-500 w-12 text-right shrink-0">{s.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1 mt-2.5 pt-2.5 border-t border-white/5">
                      <div className="flex-1 text-center">
                        <p className="text-[11px] font-black text-emerald-400">{ncpPct}%</p>
                        <p className="text-[8px] text-gray-500">NCP</p>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="text-[11px] font-black text-amber-400">{greyPct}%</p>
                        <p className="text-[8px] text-gray-500">Grey Zone</p>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="text-[11px] font-black text-red-400">{oppPct}%</p>
                        <p className="text-[8px] text-gray-500">Opposition</p>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="text-[11px] font-black text-amber-300">{undecided.toLocaleString()}</p>
                        <p className="text-[8px] text-gray-500">Undecided</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Women Outreach", value: booth.womenOutreach, color: "bg-pink-500" },
                  { label: "Youth Support",  value: booth.youthSupport,  color: "bg-violet-500" },
                ].map(s => (
                  <div key={s.label} className="bg-white/5 rounded-xl p-2.5">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[10px] text-gray-400">{s.label}</span>
                      <span className="text-[10px] font-bold text-white">{s.value}%</span>
                    </div>
                    <StatBar value={s.value} color={s.color} />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="flex-1 bg-white/5 rounded-xl p-2 flex items-center gap-2">
                  <Eye size={12} className="text-blue-400 shrink-0" />
                  <div><p className="text-[9px] text-gray-400">Last Survey</p><p className="text-[11px] text-white font-semibold">{booth.lastSurvey}</p></div>
                </div>
                <div className="flex-1 bg-white/5 rounded-xl p-2 flex items-center gap-2">
                  <Activity size={12} className="text-emerald-400 shrink-0" />
                  <div><p className="text-[9px] text-gray-400">Last Activity</p><p className="text-[11px] text-white font-semibold">{booth.lastActivity}</p></div>
                </div>
              </div>
              {booth.warnings.length > 0 && (
                <div className="space-y-1.5">
                  {booth.warnings.map((w, i) => (
                    <div key={i} className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-1.5">
                      <AlertTriangle size={11} className="text-red-400 shrink-0" />
                      <span className="text-[11px] text-red-300">{w}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button className="flex-1 h-9 bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-400 text-xs font-bold flex items-center justify-center gap-1.5">
                  <Send size={12} /> Send Help
                </button>
                <button className="flex-1 h-9 bg-white/5 border border-white/10 rounded-xl text-gray-300 text-xs font-bold flex items-center justify-center gap-1.5">
                  <Eye size={12} /> View Detail
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Grey Zone Panel ────────────────────────────────────────────── */
function GreyZonePanel({ areas, electionLabel }: { areas: ElectionArea[]; electionLabel: string }) {
  const sorted = [...areas]
    .map(a => {
      const totalGrey   = Math.round(a.totalVoters * 0.17);
      const unreached   = Math.round(totalGrey * (1 - a.coverage / 100));
      const reachedPct  = Math.round((1 - unreached / Math.max(totalGrey, 1)) * 100);
      return { ...a, totalGrey, unreached, reachedPct };
    })
    .sort((a, b) => b.unreached - a.unreached)
    .slice(0, 5);

  const totalUndecided = areas.reduce((s, a) => s + Math.round(a.totalVoters * 0.17), 0);

  return (
    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
          <Target size={15} className="text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm text-white">Grey Zone — Undecided Voters</h3>
          <p className="text-[10px] text-gray-400">{electionLabel} · Priority areas to convert</p>
        </div>
        <span className="bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
          {fmtVoters(totalUndecided)}
        </span>
      </div>
      <div className="divide-y divide-white/5">
        {sorted.map((area, i) => (
          <div key={area.id} className="px-4 py-3 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3 mb-1.5">
              <span className="text-[10px] font-black text-amber-400 w-4 shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white">{area.name}</p>
                <p className="text-[9px] text-gray-500">
                  {area.unreached.toLocaleString()} unreached · {area.totalGrey.toLocaleString()} grey voters total
                </p>
              </div>
              <p className="text-sm font-black text-amber-400 shrink-0">{fmtVoters(area.unreached)}</p>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-700" style={{ width: `${area.reachedPct}%` }} />
              </div>
              <span className="text-[9px] text-gray-400 shrink-0">{area.reachedPct}% reached</span>
            </div>
            <div className="flex gap-1.5">
              <button className="flex-1 h-7 bg-amber-500/15 border border-amber-500/30 rounded-lg text-amber-400 text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-amber-500/25 transition-colors active:scale-95">
                <Home size={10} /> Door-to-Door
              </button>
              <button className="flex-1 h-7 bg-blue-500/15 border border-blue-500/30 rounded-lg text-blue-400 text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-blue-500/25 transition-colors active:scale-95">
                <PhoneCall size={10} /> Calling Campaign
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-white/5">
        <button className="w-full h-9 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-bold flex items-center justify-center gap-2 hover:from-amber-500/30 hover:to-orange-500/30 transition-colors active:scale-95">
          <Megaphone size={13} /> Launch Grey Zone Campaign for All Areas
        </button>
      </div>
    </motion.section>
  );
}

/* ─── Analytics Content ───────────────────────────────────────────── */
function AnalyticsContent({ areas, electionCfg, issues }: {
  areas: ElectionArea[];
  electionCfg: ElectionType;
  issues: VoterIssue[];
}) {
  if (areas.length === 0) return (
    <div className="text-center py-16 text-gray-500">
      <BarChart2 size={40} className="mx-auto mb-3 opacity-20" />
      <p className="font-semibold text-gray-400">No analytics data</p>
    </div>
  );

  const avgShare    = Math.round(areas.reduce((s, a) => s + a.ncpVoteShare, 0) / areas.length);
  const avgCoverage = Math.round(areas.reduce((s, a) => s + a.coverage,     0) / areas.length);
  const winProb     = Math.min(98, Math.round(avgShare * 1.12 + (avgCoverage - 50) * 0.15));
  const totalVoters = areas.reduce((s, a) => s + a.totalVoters, 0);
  const confirmedNCP = Math.round(totalVoters * (avgShare / 100) * 0.78);
  const undecided    = Math.round(totalVoters * 0.17);
  const opposition   = Math.max(0, totalVoters - confirmedNCP - undecided);
  const ncpPct       = Math.round((confirmedNCP / totalVoters) * 100);
  const greyPct      = Math.round((undecided    / totalVoters) * 100);
  const oppPct       = Math.max(0, 100 - ncpPct - greyPct);

  // SVG semicircle gauge constants
  const ARC_LEN = Math.PI * 50; // ≈ 157.1
  const fillLen = (winProb / 100) * ARC_LEN;

  // SVG donut constants
  const R = 35; const CIRC = 2 * Math.PI * R;
  const ncpDash  = (ncpPct  / 100) * CIRC;
  const greyDash = (greyPct / 100) * CIRC;
  const oppDash  = (oppPct  / 100) * CIRC;
  const greyOffset = -(ncpDash);
  const oppOffset  = -(ncpDash + greyDash);

  const TREND_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May"];
  const TREND_DATA   = [42, 48, 55, 61, avgCoverage];

  return (
    <div className="space-y-3">
      {/* Win Probability Gauge */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
        <p className="text-[11px] font-bold text-gray-400 mb-3">Win Probability — {electionCfg.label}</p>
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <svg viewBox="0 0 130 80" className="w-36 h-[88px]">
              {/* Track */}
              <path d="M 15 65 A 50 50 0 0 1 115 65" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" strokeLinecap="round" />
              {/* Fill — color based on probability */}
              <path d="M 15 65 A 50 50 0 0 1 115 65" fill="none"
                stroke={winProb >= 65 ? "#10b981" : winProb >= 50 ? "#f59e0b" : "#ef4444"}
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${fillLen} ${ARC_LEN}`}
                style={{ filter: `drop-shadow(0 0 6px ${winProb >= 65 ? "#10b981" : winProb >= 50 ? "#f59e0b" : "#ef4444"}88)` }}
              />
              {/* Needle markers */}
              {[0, 50, 100].map(v => {
                const angle = (v / 100) * Math.PI; // 0 = left, π = right
                const nx = 65 + 46 * Math.cos(Math.PI - angle);
                const ny = 65 - 46 * Math.sin(Math.PI - angle);
                return <circle key={v} cx={nx} cy={ny} r="2" fill="rgba(255,255,255,0.2)" />;
              })}
              {/* Center value */}
              <text x="65" y="62" textAnchor="middle" fill="white" fontSize="18" fontWeight="900" fontFamily="system-ui">
                {winProb}%
              </text>
              <text x="65" y="74" textAnchor="middle" fill="rgba(156,163,175,1)" fontSize="7" fontFamily="system-ui">
                WIN PROBABILITY
              </text>
            </svg>
          </div>
          <div className="flex-1 space-y-2">
            {[
              { label: "NCP Vote Share",    value: `${avgShare}%`,    color: "text-emerald-400" },
              { label: "Avg. Coverage",     value: `${avgCoverage}%`, color: "text-blue-400"    },
              { label: "Active Volunteers", value: String(areas.reduce((s, a) => s + a.activeVolunteers, 0)), color: "text-violet-400" },
            ].map(s => (
              <div key={s.label} className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400">{s.label}</span>
                <span className={`text-xs font-black ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Voter Breakdown Donut */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
        <p className="text-[11px] font-bold text-gray-400 mb-3">Voter Breakdown — {fmtVoters(totalVoters)} total</p>
        <div className="flex items-center gap-4">
          <div className="relative shrink-0 w-24 h-24">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
              {/* NCP segment */}
              <circle cx="50" cy="50" r={R} fill="none" stroke="#10b981" strokeWidth="12"
                strokeDasharray={`${ncpDash} ${CIRC}`} strokeDashoffset={0} strokeLinecap="butt" />
              {/* Grey segment */}
              <circle cx="50" cy="50" r={R} fill="none" stroke="#f59e0b" strokeWidth="12"
                strokeDasharray={`${greyDash} ${CIRC}`} strokeDashoffset={greyOffset} strokeLinecap="butt" />
              {/* Opposition segment */}
              <circle cx="50" cy="50" r={R} fill="none" stroke="#ef4444" strokeWidth="12"
                strokeDasharray={`${oppDash} ${CIRC}`} strokeDashoffset={oppOffset} strokeLinecap="butt" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base font-black text-emerald-400">{ncpPct}%</span>
              <span className="text-[8px] text-gray-500">NCP</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            {[
              { label: "Confirmed NCP", pct: ncpPct,  count: confirmedNCP, color: "bg-emerald-500", text: "text-emerald-400" },
              { label: "Undecided",     pct: greyPct, count: undecided,    color: "bg-amber-400",   text: "text-amber-400"  },
              { label: "Opposition",    pct: oppPct,  count: opposition,   color: "bg-red-500",     text: "text-red-400"    },
            ].map(s => (
              <div key={s.label}>
                <div className="flex justify-between text-[9px] mb-0.5">
                  <span className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${s.color}`}/>{s.label}</span>
                  <span className={`font-bold ${s.text}`}>{s.pct}% · {fmtVoters(s.count)}</span>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Area-wise Vote Share Comparison */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
        <p className="text-[11px] font-bold text-gray-400 mb-3">Area-wise NCP Vote Share</p>
        <div className="flex gap-3 text-[9px] text-gray-500 mb-2">
          <span className="flex items-center gap-1"><span className="w-2 h-1 bg-emerald-500 rounded inline-block"/>Current</span>
          <span className="flex items-center gap-1"><span className="w-2 h-1 bg-white/30 rounded inline-block"/>Previous Election</span>
        </div>
        <div className="space-y-3">
          {areas.slice(0, 6).map(a => {
            const prev = a.prevVoteShare || Math.max(20, a.ncpVoteShare - 8);
            const diff = a.ncpVoteShare - prev;
            return (
              <div key={a.id}>
                <div className="flex justify-between text-[9px] mb-1">
                  <span className="text-gray-300 font-semibold">{a.name}</span>
                  <span className={diff >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                    {diff >= 0 ? "+" : ""}{diff}pp
                  </span>
                </div>
                <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-white/20 rounded-full" style={{ width: `${prev}%` }} />
                  <div className={`absolute inset-y-0 left-0 rounded-full ${a.ncpVoteShare >= 60 ? "bg-emerald-500" : a.ncpVoteShare >= 45 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${a.ncpVoteShare}%`, opacity: 0.85 }} />
                  <span className="absolute right-1.5 top-0 bottom-0 flex items-center text-[8px] font-black text-white">{a.ncpVoteShare}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Coverage Trend */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
        <p className="text-[11px] font-bold text-gray-400 mb-3">Coverage Trend (2025)</p>
        <div className="flex items-end gap-2 h-16">
          {TREND_DATA.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[8px] text-gray-400">{v}%</span>
              <div className="w-full rounded-t-md" style={{
                height: `${(v / 100) * 48}px`,
                background: i === TREND_DATA.length - 1
                  ? "linear-gradient(to top, #10b981, #34d399)"
                  : "rgba(255,255,255,0.15)",
              }} />
              <span className="text-[8px] text-gray-500">{TREND_MONTHS[i]}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Key Voter Issues */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
        <p className="text-[11px] font-bold text-gray-400 mb-3">Key Voter Issues</p>
        <div className="space-y-2.5">
          {issues.map(issue => (
            <div key={issue.label} className="flex items-center gap-2">
              <span className="text-sm shrink-0">{issue.icon}</span>
              <span className="text-[10px] text-gray-300 w-32 shrink-0">{issue.label}</span>
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${issue.score}%` }} />
              </div>
              <span className="text-[10px] font-bold text-blue-400 w-7 text-right shrink-0">{issue.score}%</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ─── District matching helper ───────────────────────────────────── */
function matchDistrict(areaDistrict: string, userDistrict: string): boolean {
  const clean = (s: string) => s.toLowerCase().replace(/\s*district\s*/gi, "").trim();
  const a = clean(areaDistrict);
  const b = clean(userDistrict);
  return a.length > 0 && b.length > 0 && (a.includes(b) || b.includes(a));
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function LiveCampaignMonitoring() {
  const navigate        = useNavigate();
  const { token }       = useAuth();
  const { userLocation } = useUserLocation();
  const { isDark }      = useTheme();

  const [showLocationSheet, setShowLocationSheet] = useState(false);
  const [showAllAreas, setShowAllAreas]           = useState(false);

  const [activeTab, setActiveTab]         = useState<Tab>("booths");
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState<BoothStatus | "all">("all");
  const [feed, setFeed]                   = useState<FeedItem[]>([]);
  const [lastUpdate, setLastUpdate]       = useState("just now");
  const [showFilters, setShowFilters]     = useState(false);
  const [selectedElection, setSelectedElection] = useState<ElectionId>("vs");
  const [selectedArea, setSelectedArea]   = useState<string | null>(null);
  const [activeElections, setActiveElections] = useState<ElectionId[]>([]);

  // API-loaded state (replaces hardcoded arrays)
  const [areas, setAreas]           = useState<ElectionArea[]>([]);
  const [booths, setBooths]         = useState<Booth[]>([]);
  const [issues, setIssues]         = useState<VoterIssue[]>([]);
  const [areasLoading, setAreasLoading]   = useState(false);
  const [boothsLoading, setBoothsLoading] = useState(false);

  // Volunteers / Surveys / Locations tabs
  const [volunteers, setVolunteers]     = useState<VolunteerRow[]>([]);
  const [surveys, setSurveys]           = useState<SurveyRow[]>([]);
  const [locations, setLocations]       = useState<CampaignEventRow[]>([]);
  const [volLoading, setVolLoading]     = useState(false);
  const [survLoading, setSurvLoading]   = useState(false);
  const [locLoading, setLocLoading]     = useState(false);

  const authHeader = useCallback(() =>
    token ? { Authorization: `Bearer ${token}` } : {} as Record<string, string>,
  [token]);

  // Load election types that have real booth data
  useEffect(() => {
    if (!token) return;
    fetch("/api/booths/meta", { headers: authHeader() })
      .then(r => r.ok ? r.json() : { elections: [] })
      .then(d => {
        const ids = ((d.elections ?? []) as { id: string }[]).map(e => e.id) as ElectionId[];
        setActiveElections(ids);
        if (ids.length > 0 && !ids.includes(selectedElection)) setSelectedElection(ids[0]);
      })
      .catch(() => {});
  }, [token]);

  // Derive areas from real booth data — group by constituency
  useEffect(() => {
    setAreasLoading(true);
    setAreas([]);
    setSelectedArea(null);
    const ctrl = new AbortController();
    fetch(`/api/booths?election=${selectedElection}&limit=1000`, { headers: authHeader(), signal: ctrl.signal })
      .then(r => r.ok ? r.json() : { data: [] })
      .then(({ data = [] }: { data: Record<string, unknown>[] }) => {
        const groups = new Map<string, Record<string, unknown>[]>();
        data.forEach(b => {
          const key = String(b.constituency || b.district_name || "Unknown");
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(b);
        });
        const derived: ElectionArea[] = Array.from(groups.entries()).map(([name, bList]) => {
          const totalVoters  = bList.reduce((s, b) => s + (Number(b.total_voters) || 0), 0);
          const totalCovered = bList.reduce((s, b) => s + (Number(b.covered)      || 0), 0);
          const coverage     = totalVoters > 0 ? Math.round((totalCovered / totalVoters) * 100) : 0;
          const avgSent      = bList.length > 0
            ? Math.round(bList.reduce((s, b) => s + (Number(b.sentiment_pct) || 0), 0) / bList.length) : 0;
          const totalVols    = bList.reduce((s, b) => s + (Number(b.volunteers)   || 0), 0);
          const status: BoothStatus = avgSent >= 55 ? "strong" : avgSent >= 40 ? "swing" : avgSent >= 30 ? "weak" : "critical";
          return {
            id: name, name, sub: String(bList[0]?.district_name || ""),
            totalVoters, totalBooths: bList.length,
            ncpStatus: status, ncpVoteShare: avgSent,
            activeVolunteers: totalVols, coverage, prevVoteShare: 0,
          };
        });
        setAreas(derived);
        setAreasLoading(false);
      })
      .catch(() => setAreasLoading(false));
    return () => ctrl.abort();
  }, [selectedElection]);

  // Fetch booths for selected constituency
  useEffect(() => {
    if (!selectedArea) { setBooths([]); return; }
    setBoothsLoading(true);
    const ctrl = new AbortController();
    fetch(`/api/booths?election=${selectedElection}&constituency=${encodeURIComponent(selectedArea)}&limit=500`, {
      headers: authHeader(), signal: ctrl.signal,
    })
      .then(r => r.ok ? r.json() : { data: [] })
      .then(({ data = [] }: { data: Record<string, unknown>[] }) => {
        setBooths(data.map(mapBooth));
        setBoothsLoading(false);
      })
      .catch(() => setBoothsLoading(false));
    return () => ctrl.abort();
  }, [selectedArea, selectedElection]);

  // Fetch voter issues when analytics tab becomes active
  useEffect(() => {
    if (activeTab !== "analytics" || issues.length > 0) return;
    const ctrl = new AbortController();
    fetch(`/api/analytics/issues?election_id=${selectedElection}`, {
      headers: authHeader(), signal: ctrl.signal,
    })
      .then(r => r.ok ? r.json() : [])
      .then((data: VoterIssue[]) => setIssues(data))
      .catch(() => {});
    return () => ctrl.abort();
  }, [activeTab, selectedElection]);

  // Reset issues when election changes so they're re-fetched
  useEffect(() => { setIssues([]); }, [selectedElection]);

  // Reset "show all" override whenever the user changes their district
  useEffect(() => { setShowAllAreas(false); }, [userLocation?.districtName]);

  // Fetch volunteers when tab is active
  useEffect(() => {
    if (activeTab !== "volunteers") return;
    setVolLoading(true);
    const ctrl = new AbortController();
    fetch("/api/volunteers?limit=100", { headers: authHeader(), signal: ctrl.signal })
      .then(r => r.ok ? r.json() : [])
      .then((data: VolunteerRow[]) => { setVolunteers(data); setVolLoading(false); })
      .catch(() => setVolLoading(false));
    return () => ctrl.abort();
  }, [activeTab]);

  // Fetch surveys when tab is active
  useEffect(() => {
    if (activeTab !== "surveys") return;
    setSurvLoading(true);
    const ctrl = new AbortController();
    const params = selectedArea ? `?area=${selectedArea}&limit=50` : "?limit=50";
    fetch(`/api/surveys${params}`, { headers: authHeader(), signal: ctrl.signal })
      .then(r => r.ok ? r.json() : { data: [] })
      .then((d: { data?: SurveyRow[] } | SurveyRow[]) => {
        const rows = Array.isArray(d) ? d : (d.data ?? []);
        setSurveys(rows);
        setSurvLoading(false);
      })
      .catch(() => setSurvLoading(false));
    return () => ctrl.abort();
  }, [activeTab, selectedArea]);

  // Fetch campaign events/locations when tab is active
  useEffect(() => {
    if (activeTab !== "locations") return;
    setLocLoading(true);
    const ctrl = new AbortController();
    fetch(`/api/campaign/events?election_id=${selectedElection}&limit=100`, {
      headers: authHeader(), signal: ctrl.signal,
    })
      .then(r => r.ok ? r.json() : [])
      .then((data: CampaignEventRow[]) => { setLocations(data); setLocLoading(false); })
      .catch(() => setLocLoading(false));
    return () => ctrl.abort();
  }, [activeTab, selectedElection]);


  const electionCfg     = ELECTION_TYPES.find(e => e.id === selectedElection)!;
  const selectedAreaData = selectedArea ? areas.find(a => a.id === selectedArea) : null;

  // District-filtered areas: when user has a location, show only areas in their district
  const districtAreas = userLocation
    ? areas.filter(a => matchDistrict(a.sub, userLocation.districtName))
    : areas;
  // showAllAreas lets the user override the district filter on demand
  const displayAreas = (!userLocation || showAllAreas) ? areas : districtAreas;

  // Booths filtered by search + status (area filter already applied by API)
  const filtered = booths.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !q || [b.number, b.village, b.taluka, b.district, b.constituency, b.agent]
      .some(v => v.toLowerCase().includes(q));
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Summary stats: use booth data when area is selected, else area-level data
  const counts = selectedArea
    ? {
        strong:   booths.filter(b => b.status === "strong").length,
        swing:    booths.filter(b => b.status === "swing").length,
        weak:     booths.filter(b => b.status === "weak").length,
        critical: booths.filter(b => b.status === "critical").length,
      }
    : {
        strong:   displayAreas.filter(a => a.ncpStatus === "strong").length,
        swing:    displayAreas.filter(a => a.ncpStatus === "swing").length,
        weak:     displayAreas.filter(a => a.ncpStatus === "weak").length,
        critical: displayAreas.filter(a => a.ncpStatus === "critical").length,
      };

  const avgCoverage = selectedArea
    ? (booths.length > 0
        ? Math.round(booths.filter(b => b.totalVoters > 0)
            .reduce((s, b) => s + (b.covered / b.totalVoters) * 100, 0)
            / Math.max(booths.filter(b => b.totalVoters > 0).length, 1))
        : 0)
    : (displayAreas.length > 0
        ? Math.round(displayAreas.reduce((s, a) => s + a.coverage, 0) / displayAreas.length)
        : 0);

  const totalVols = selectedArea
    ? booths.reduce((s, b) => s + b.volunteers, 0)
    : displayAreas.reduce((s, a) => s + a.activeVolunteers, 0);

  const SUMMARY_STATS = [
    { label: selectedArea ? "Strong"   : "Strong Areas",  value: String(counts.strong),   color: "from-emerald-500 to-teal-600",   icon: MonitorCheck  },
    { label: selectedArea ? "Swing"    : "Swing Areas",   value: String(counts.swing),    color: "from-amber-400 to-orange-500",   icon: Activity      },
    { label: selectedArea ? "Weak"     : "Weak Areas",    value: String(counts.weak),     color: "from-orange-500 to-red-500",     icon: AlertTriangle },
    { label: selectedArea ? "Critical" : "Critical",      value: String(counts.critical), color: "from-red-500 to-rose-700",       icon: Flame         },
    { label: "Avg. Coverage",  value: `${avgCoverage}%`, color: "from-blue-500 to-cyan-600",      icon: Target },
    { label: "Volunteers",     value: String(totalVols),  color: "from-purple-500 to-violet-600",  icon: Users  },
  ];

  const subtitle = selectedAreaData
    ? `${selectedAreaData.sub ? selectedAreaData.sub + " · " : ""}${electionCfg.label} → ${selectedAreaData.name}`
    : displayAreas.length > 0
      ? `${electionCfg.label} · ${displayAreas.length} constituency${displayAreas.length !== 1 ? "ies" : ""}${userLocation ? ` · ${userLocation.districtName}` : ""}`
      : electionCfg.label;

  return (
    <div className={`min-h-screen text-white ${isDark ? "bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" : "bg-slate-900"}`}>

      {/* ── Location sheet overlay (change location from within campaign) ── */}
      {showLocationSheet && (
        <LocationPermissionModal onClose={() => setShowLocationSheet(false)} />
      )}

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors shrink-0">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-black text-base leading-tight">Live Campaign</h1>
              <div className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/40 rounded-full px-2 py-0.5 shrink-0">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-400">LIVE</span>
              </div>
            </div>
            {/* Location chip */}
            <button
              onClick={() => setShowLocationSheet(true)}
              className="flex items-center gap-1 mt-0.5 group"
            >
              <MapPin size={9} className={userLocation ? "text-blue-400" : "text-gray-500"} />
              <span className={`text-[10px] truncate max-w-[180px] ${userLocation ? "text-blue-300 font-semibold" : "text-gray-500"}`}>
                {userLocation ? `${userLocation.districtName}${userLocation.stateName ? " · " + userLocation.stateName : ""}` : subtitle}
              </span>
              {userLocation && <span className="text-[9px] text-gray-500 underline group-hover:text-gray-300 transition-colors">change</span>}
            </button>
          </div>
          <button onClick={() => setLastUpdate("just now")} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors shrink-0">
            <RefreshCw size={16} />
          </button>
          <button className="relative w-9 h-9 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors shrink-0">
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-4 pb-2">
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-white/10 border border-white/15 rounded-xl px-3 py-2.5">
              <Search size={14} className="text-gray-400 shrink-0" />
              <input type="text" placeholder="Search booth, village, taluka…" value={search} onChange={e => setSearch(e.target.value)} className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 outline-none" />
              {search && <button onClick={() => setSearch("")}><X size={13} className="text-gray-400" /></button>}
            </div>
            <button onClick={() => setShowFilters(f => !f)} className={`w-11 rounded-xl flex items-center justify-center border transition-colors shrink-0 ${showFilters ? "bg-blue-500/30 border-blue-500/50 text-blue-400" : "bg-white/10 border-white/15 text-gray-300"}`}>
              <Filter size={16} />
            </button>
          </div>
        </div>

        {/* ── Election Type Chips ── */}
        <div className="relative pb-2">
          <div className="px-4 overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: "touch" }}>
            <div className="flex gap-2 pr-8">
              {(activeElections.length > 0 ? ELECTION_TYPES.filter(et => activeElections.includes(et.id)) : ELECTION_TYPES).map(et => {
                const isActive = selectedElection === et.id;
                return (
                  <motion.button
                    key={et.id}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => { setSelectedElection(et.id); setSelectedArea(null); setSearch(""); }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all shrink-0 ${
                      isActive
                        ? `${et.activeBg} ${et.activeBorder} ${et.activeText}`
                        : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200"
                    }`}
                  >
                    <span className="text-sm leading-none">{et.icon}</span>
                    <span>{et.short}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                  </motion.button>
                );
              })}
            </div>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none" />
        </div>

        {/* Filter chips */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
                {(["all", "strong", "swing", "weak", "critical"] as const).map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all shrink-0 capitalize ${
                    statusFilter === s
                      ? s === "all" ? "bg-blue-500/30 border-blue-500/50 text-blue-300"
                        : s === "strong" ? "bg-emerald-500/30 border-emerald-500/50 text-emerald-300"
                        : s === "swing" ? "bg-amber-500/30 border-amber-500/50 text-amber-300"
                        : s === "weak" ? "bg-orange-500/30 border-orange-500/50 text-orange-300"
                        : "bg-red-500/30 border-red-500/50 text-red-300"
                      : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                  }`}>
                    {s === "all" ? "All Booths" : STATUS_CFG[s].label}
                    {s !== "all" && <span className="ml-1.5 opacity-70">{s === "strong" ? counts.strong : s === "swing" ? counts.swing : s === "weak" ? counts.weak : counts.critical}</span>}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className="relative pb-3">
          <div className="flex gap-1 px-4 overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: "touch" }}>
            {TABS_LIST.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${activeTab === tab.id ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"}`}>
                  <Icon size={13} />
                  {tab.label}
                </button>
              );
            })}
            <div className="w-6 shrink-0" />
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none" />
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {SUMMARY_STATS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="shrink-0 w-28 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3 hover:bg-white/10 transition-colors">
                <div className={`w-8 h-8 bg-gradient-to-br ${s.color} rounded-xl flex items-center justify-center mb-2 shadow-lg`}>
                  <Icon size={15} className="text-white" />
                </div>
                <p className="font-black text-xl text-white leading-none">{s.value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{s.label}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 pt-2 pb-4 space-y-3">

        {/* BOOTHS TAB */}
        {activeTab === "booths" && (
          <AnimatePresence mode="wait">
            {/* AREA GRID VIEW — no area selected */}
            {!selectedArea ? (
              <motion.div key="area-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {/* Area header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 bg-gradient-to-br ${electionCfg.gradient} rounded-lg flex items-center justify-center text-sm`}>
                      {electionCfg.icon}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white">{electionCfg.label}</p>
                      <p className="text-[10px] text-gray-400">
                        {displayAreas.length} area{displayAreas.length !== 1 ? "s" : ""}
                        {userLocation && !showAllAreas && districtAreas.length > 0 ? ` in ${userLocation.districtName}` : ""}
                        {" "}· Tap to drill down
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Radio size={11} className="text-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-emerald-400 font-bold">LIVE</span>
                  </div>
                </div>

                {/* Location filter banner */}
                {userLocation && !showAllAreas && (
                  <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={11} className="text-blue-400 shrink-0" />
                      <span className="text-[10px] text-blue-300 font-semibold">
                        {districtAreas.length > 0
                          ? <><span className="text-white">{userLocation.districtName}</span> · {districtAreas.length} area{districtAreas.length !== 1 ? "s" : ""}</>
                          : <>No data for <span className="text-white">{userLocation.districtName}</span></>
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {districtAreas.length === 0 && (
                        <button onClick={() => setShowAllAreas(true)} className="text-[9px] text-amber-400 font-bold underline">Show all</button>
                      )}
                      <button onClick={() => setShowLocationSheet(true)} className="text-[9px] text-blue-400 underline">Change</button>
                    </div>
                  </div>
                )}
                {userLocation && showAllAreas && (
                  <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={11} className="text-amber-400 shrink-0" />
                      <span className="text-[10px] text-amber-300 font-semibold">Showing all areas · no data for <span className="text-white">{userLocation.districtName}</span></span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setShowAllAreas(false)} className="text-[9px] text-amber-400 underline">Filter again</button>
                      <button onClick={() => setShowLocationSheet(true)} className="text-[9px] text-blue-400 underline">Change</button>
                    </div>
                  </div>
                )}

                {/* Area cards grid */}
                {areasLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw size={20} className="text-blue-400 animate-spin" />
                    <span className="ml-2 text-sm text-gray-400">Loading areas…</span>
                  </div>
                ) : displayAreas.length === 0 ? (
                  userLocation && districtAreas.length === 0 ? (
                    <div className="text-center py-10 space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto">
                        <MapPin size={28} className="text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-300">No campaigns in {userLocation.districtName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">No {electionCfg.label} data for this district yet</p>
                      </div>
                      <button
                        onClick={() => setShowAllAreas(true)}
                        className="mx-auto flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold hover:bg-blue-500/30 transition-colors"
                      >
                        Show all {areas.length} area{areas.length !== 1 ? "s" : ""}
                      </button>
                      <button onClick={() => setShowLocationSheet(true)} className="block mx-auto text-[10px] text-gray-500 underline">
                        Change district
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <MapPin size={36} className="mx-auto mb-2 opacity-20" />
                      <p className="text-sm text-gray-400">No area data for this election type</p>
                    </div>
                  )
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {displayAreas.map((area, i) => (
                      <motion.div key={area.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                        <AreaCard area={area} onSelect={() => setSelectedArea(area.id)} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              /* BOOTH DRILL-DOWN VIEW — area selected */
              <motion.div key="booth-list" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                {/* Area detail header */}
                {selectedAreaData && (
                  <div className={`rounded-2xl border-l-4 ${STATUS_CFG[selectedAreaData.ncpStatus].border} bg-white/5 backdrop-blur-md border border-white/10 p-4`}>
                    <button onClick={() => setSelectedArea(null)} className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-white mb-3 transition-colors">
                      <ChevronLeft size={14} />
                      All {electionCfg.label} Areas
                    </button>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <p className="font-black text-base text-white">{selectedAreaData.name}</p>
                        <p className="text-[10px] text-gray-400">{selectedAreaData.sub || electionCfg.label}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold ${STATUS_CFG[selectedAreaData.ncpStatus].badge}`}>
                        {STATUS_CFG[selectedAreaData.ncpStatus].label}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        { label: "Total Voters", value: fmtVoters(selectedAreaData.totalVoters) },
                        { label: "Total Booths", value: String(selectedAreaData.totalBooths) },
                        { label: "NCP Share",    value: `${selectedAreaData.ncpVoteShare}%` },
                      ].map(s => (
                        <div key={s.label} className="bg-white/5 rounded-xl p-2 text-center">
                          <p className="font-black text-white text-sm leading-none">{s.value}</p>
                          <p className="text-[9px] text-gray-400 mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-400">Voter Coverage</span>
                        <span className="font-bold text-white">{selectedAreaData.coverage}%</span>
                      </div>
                      <StatBar value={selectedAreaData.coverage} color={selectedAreaData.coverage >= 70 ? "bg-emerald-500" : selectedAreaData.coverage >= 50 ? "bg-amber-500" : "bg-red-500"} />
                    </div>
                  </div>
                )}

                {/* Booth update bar */}
                <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
                  <span className="flex items-center gap-1.5">
                    <Radio size={11} className="text-emerald-500 animate-pulse" />
                    Updated {lastUpdate}
                  </span>
                  <span>{filtered.length} booth{filtered.length !== 1 ? "s" : ""} shown</span>
                </div>

                {/* Booth cards */}
                {boothsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <RefreshCw size={20} className="text-blue-400 animate-spin" />
                    <span className="ml-2 text-sm text-gray-400">Loading booths…</span>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <MonitorCheck size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-semibold text-gray-400">No booths match your search</p>
                    <p className="text-sm mt-1">Try a different filter or search term</p>
                  </div>
                ) : (
                  filtered.map((booth, i) => <BoothCard key={booth.id} booth={booth} index={i} />)
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === "analytics" && (
          <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AnalyticsContent areas={areas} electionCfg={electionCfg} issues={issues} />
          </motion.div>
        )}

        {/* VOLUNTEERS TAB */}
        {activeTab === "volunteers" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <p className="text-[11px] text-gray-400 px-1">{volunteers.length} volunteers loaded</p>
            {volLoading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw size={20} className="text-blue-400 animate-spin" />
                <span className="ml-2 text-sm text-gray-400">Loading volunteers…</span>
              </div>
            ) : volunteers.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Users size={40} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm text-gray-400">No volunteer data available</p>
              </div>
            ) : volunteers.map((v, i) => (
              <motion.div key={v.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${v.is_active ? "bg-emerald-500/20" : "bg-white/10"}`}>
                  <span className="text-white text-xs font-black">{v.name.slice(0,2).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-white truncate">{v.name}</p>
                  <p className="text-[10px] text-gray-400 truncate capitalize">{v.role.replace(/_/g," ")} · {v.area_name ?? v.district_name ?? "—"}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-gray-500"}`}>
                    {v.is_active ? "Active" : "Inactive"}
                  </span>
                  {v.last_seen_at && <p className="text-[9px] text-gray-500 mt-0.5">{new Date(v.last_seen_at).toLocaleDateString("en-IN")}</p>}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* SURVEYS TAB */}
        {activeTab === "surveys" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <p className="text-[11px] text-gray-400 px-1">{surveys.length} recent surveys</p>
            {survLoading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw size={20} className="text-blue-400 animate-spin" />
                <span className="ml-2 text-sm text-gray-400">Loading surveys…</span>
              </div>
            ) : surveys.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Eye size={40} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm text-gray-400">No survey data available</p>
              </div>
            ) : surveys.map((s, i) => {
              const RESP_COLOR: Record<string,string> = {
                ncp: "bg-emerald-500/20 text-emerald-400", undecided: "bg-amber-500/20 text-amber-400",
                opposition: "bg-red-500/20 text-red-400",  refused: "bg-gray-500/20 text-gray-400",
              };
              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0 bg-blue-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-semibold">
                      {s.booth_number ? `Booth ${s.booth_number}` : `Booth #${s.booth_id}`}
                      {s.village ? ` · ${s.village}` : ""}
                    </p>
                    <p className="text-[10px] text-gray-400">{new Date(s.surveyed_at).toLocaleDateString("en-IN")} {new Date(s.surveyed_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${RESP_COLOR[s.response] ?? "bg-gray-500/20 text-gray-400"}`}>{s.response}</span>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* LOCATIONS TAB */}
        {activeTab === "locations" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">

            {/* Your Location card */}
            <div className="bg-gradient-to-br from-blue-500/15 to-indigo-500/10 border border-blue-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shrink-0">
                  <Navigation size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-blue-300 uppercase tracking-wider">Your Location</p>
                  {userLocation ? (
                    <>
                      <p className="font-black text-white text-base leading-tight">{userLocation.districtName}</p>
                      {userLocation.stateName && <p className="text-[10px] text-blue-300">{userLocation.stateName}</p>}
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Location not set</p>
                  )}
                </div>
                <button
                  onClick={() => setShowLocationSheet(true)}
                  className="shrink-0 px-3 py-1.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold hover:bg-blue-500/30 transition-colors"
                >
                  {userLocation ? "Change" : "Set Location"}
                </button>
              </div>
              {userLocation && (
                <div className="flex items-center gap-2 text-[10px] text-blue-200/70">
                  {userLocation.detected
                    ? <><Navigation size={9} className="text-emerald-400" /><span>Detected via GPS</span></>
                    : <><MapPin size={9} className="text-blue-400" /><span>Set manually</span></>
                  }
                  <span className="text-white/20">·</span>
                  <span>{displayAreas.length} area{displayAreas.length !== 1 ? "s" : ""} in view</span>
                </div>
              )}
            </div>

            {/* Campaign Events */}
            <p className="text-[11px] text-gray-400 px-1">{locations.length} campaign events{userLocation ? ` · ${userLocation.districtName}` : ""}</p>
            {locLoading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw size={20} className="text-blue-400 animate-spin" />
                <span className="ml-2 text-sm text-gray-400">Loading events…</span>
              </div>
            ) : locations.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Navigation size={40} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm text-gray-400">No campaign events scheduled</p>
                <p className="text-xs text-gray-600 mt-1">Super Admin adds events from the web portal</p>
              </div>
            ) : locations.map((ev, i) => {
              const STATUS_COLOR: Record<string,string> = {
                upcoming: "bg-blue-500/20 text-blue-400 border-blue-500/30",
                live:     "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                completed:"bg-gray-500/20 text-gray-400 border-gray-500/30",
                cancelled:"bg-red-500/20 text-red-400 border-red-500/30",
              };
              return (
                <motion.div key={ev.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-white truncate">{ev.title}</p>
                      <p className="text-[10px] text-gray-400 capitalize mt-0.5">{ev.type.replace(/_/g," ")}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize shrink-0 ${STATUS_COLOR[ev.status] ?? "bg-white/10 text-gray-400 border-white/10"}`}>{ev.status}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-1">
                    <MapPin size={10} className="shrink-0" />
                    <span className="truncate">{ev.location}{ev.district ? ` · ${ev.district}` : ""}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar size={10} />
                      <span>{new Date(ev.event_date).toLocaleDateString("en-IN")} · {ev.event_time}</span>
                    </div>
                    {ev.coordinator && <span className="text-gray-400">👤 {ev.coordinator}</span>}
                    {ev.expected_attendance > 0 && <span className="text-blue-400 font-semibold">{ev.expected_attendance.toLocaleString()} expected</span>}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* GREY ZONE PANEL — visible on booths tab */}
        {activeTab === "booths" && displayAreas.length > 0 && (
          <GreyZonePanel areas={displayAreas} electionLabel={electionCfg.label} />
        )}

        {/* ── Weak Area Detection ── */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-rose-700 rounded-xl flex items-center justify-center shadow-lg">
              <AlertCircle size={15} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm text-white">Weak Area Detection</h3>
              <p className="text-[10px] text-gray-400">Areas needing immediate attention</p>
            </div>
            {(() => { const wk = displayAreas.filter(a => a.ncpStatus === "weak" || a.ncpStatus === "critical"); return (
              <span className="bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{wk.length} alerts</span>
            ); })()}
          </div>
          <div className="divide-y divide-white/5">
            {displayAreas.filter(a => a.ncpStatus === "weak" || a.ncpStatus === "critical").map((area, i) => {
              const diff = area.ncpVoteShare - area.prevVoteShare;
              return (
              <motion.div key={area.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.07 }} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                <div className="w-2 h-2 rounded-full bg-red-400 shrink-0 animate-pulse" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">{area.name}</span>
                    <span className="text-[9px] bg-white/10 text-gray-400 px-1.5 py-0.5 rounded-full">{area.sub}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">{area.coverage}% coverage · {area.activeVolunteers} volunteers</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-sm text-red-400">{area.ncpVoteShare}%</p>
                  {diff !== 0 && <p className="text-[10px] text-red-500 flex items-center justify-end gap-0.5"><TrendingDown size={9} />{Math.abs(diff).toFixed(0)}pp</p>}
                </div>
              </motion.div>
              );
            })}
          </div>
          <div className="px-4 py-3 border-t border-white/5">
            <button className="w-full h-9 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-500/30 transition-colors active:scale-95">
              <Zap size={13} /> Deploy Emergency Response Team
            </button>
          </div>
        </motion.section>

        {/* ── Quick Actions ── */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
              <Zap size={15} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Quick Campaign Actions</h3>
              <p className="text-[10px] text-gray-400">Deploy resources instantly</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_ACTIONS.map((action, i) => {
              const Icon = action.icon;
              return (
                <motion.button key={action.label} whileTap={{ scale: 0.92 }} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + i * 0.05 }} className="flex flex-col items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/10 transition-colors">
                  <div className={`w-10 h-10 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center shadow-md`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <span className="text-[10px] text-gray-300 font-semibold text-center leading-tight">{action.label}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.section>

        {/* ── Live Activity Feed ── */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-violet-700 rounded-xl flex items-center justify-center shadow-lg">
              <Activity size={15} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm text-white">Live Activity Feed</h3>
              <p className="text-[10px] text-gray-400">Real-time campaign intelligence</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-bold">LIVE</span>
            </div>
          </div>
          <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
            {feed.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity size={28} className="mx-auto mb-2 opacity-20" />
                <p className="text-xs text-gray-500">No activity yet</p>
                <p className="text-[10px] text-gray-600 mt-0.5">Activity will appear here as volunteers check in</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {feed.slice(0, 10).map(item => (
                  <motion.div key={item.id} initial={{ opacity: 0, x: 20, height: 0 }} animate={{ opacity: 1, x: 0, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${item.color === "emerald" ? "bg-emerald-500/20 text-emerald-400" : item.color === "blue" ? "bg-blue-500/20 text-blue-400" : item.color === "red" ? "bg-red-500/20 text-red-400" : item.color === "amber" ? "bg-amber-500/20 text-amber-400" : "bg-purple-500/20 text-purple-400"}`}>
                      {FEED_ICONS[item.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-200 leading-snug">{item.msg}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{item.time}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
          <div className="px-4 py-3 border-t border-white/5">
            <button className="w-full h-9 bg-white/5 border border-white/10 rounded-xl text-gray-300 text-xs font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors">
              <Eye size={13} /> View Full Campaign Log
            </button>
          </div>
        </motion.section>

        <div className="h-4" />
      </div>
    </div>
  );
}
