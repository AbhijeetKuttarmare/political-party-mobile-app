import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  Bell, Sparkles, Megaphone, X,
  Heart, MessageCircle, Share2, MapPin, Calendar,
  MoreHorizontal, Target, ChevronRight, Send, Image, Smile, Plus,
  Users, BarChart2, Zap, Search, CheckCircle2, ChevronLeft,
  Building2, Landmark, TreePine, Crown, Bookmark,
  MonitorCheck, UserCheck, Navigation, ClipboardList, BookUser,
  Clock, PhoneCall, Star, TrendingUp, AlertCircle,
  UserPlus, Flag, AlertTriangle, Loader,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { motion, AnimatePresence } from "motion/react";

/* ─── Hierarchy API types ────────────────────────────────── */
interface HDistrict { code: number; name: string; name_marathi: string; population: number; active_leaders: number; taluka_count: number; village_count: number; leader_count: number; }
interface HTaluka   { code: number; name: string; name_marathi: string; total_villages: number; leader_count: number; }
interface HVillage  { code: number; name: string; name_marathi: string; type: "rural"|"urban"; population: number; leaders: { name: string; designation: string }[]; }
interface HSearch   { type: "village"|"taluka"|"district"; code: number; name: string; taluka_name: string|null; district_name: string|null; village_count: number|null; }

/* ─── Types ──────────────────────────────────────────────── */
type Comment = { id: number; user: string; initials: string; color: string; text: string; time: string };
type Post = {
  id: number;
  author_id?: number;
  author: { name: string; role: string; initials: string; color: string };
  time: string;
  type: "post" | "event" | "campaign";
  content: string;
  likes: number;
  comments: Comment[];
  shares: number;
  liked_by_me?: boolean;
  bookmarked_by_me?: boolean;
  event?: { title: string; date: string; time: string; location: string; going: number; interested: number; my_rsvp?: "going" | "interested" | null };
  campaign?: { title: string; goal: string; progress: number };
};

type ApiComment = {
  id: number; content: string; created_at: string; parent_id: number | null;
  author_name: string; author_role: string; like_count: number; liked_by_me: boolean;
};
type ApiPost = {
  id: number; type: string; content: string; created_at: string;
  event_title: string | null; event_date: string | null; event_time: string | null; event_location: string | null;
  campaign_title: string | null; campaign_goal: string | null; campaign_progress: number | null;
  author_id: number; author_name: string; author_role: string;
  like_count: number; comment_count: number; liked_by_me: boolean; bookmarked_by_me: boolean;
};
type Status = { id: number; user: string; initials: string; bg: string; text: string; time: string };

/* ─── Constants ──────────────────────────────────────────── */
const STATUS_COLORS = [
  { id: "blue",    cls: "from-blue-600 to-cyan-500" },
  { id: "purple",  cls: "from-purple-600 to-pink-500" },
  { id: "orange",  cls: "from-orange-500 to-amber-400" },
  { id: "green",   cls: "from-emerald-600 to-teal-500" },
  { id: "rose",    cls: "from-rose-500 to-pink-600" },
  { id: "indigo",  cls: "from-indigo-600 to-violet-500" },
];

const MEMBERS = [
  { id: 1,  name: "Sharad Pawar",      role: "Party President",      district: "Pune",       initials: "SP", color: "from-blue-700 to-blue-500",     verified: true  },
  { id: 2,  name: "Supriya Sule",      role: "Working President",     district: "Pune",       initials: "SS", color: "from-purple-600 to-pink-500",   verified: true  },
  { id: 3,  name: "Jayant Patil",      role: "State President",       district: "Sangli",     initials: "JP", color: "from-emerald-600 to-teal-500",  verified: true  },
  { id: 4,  name: "Praful Patel",      role: "Rajya Sabha MP",        district: "Nagpur",     initials: "PP", color: "from-orange-500 to-amber-400",  verified: true  },
  { id: 5,  name: "Ajit Pawar",        role: "Senior Leader",         district: "Pune",       initials: "AP", color: "from-cyan-600 to-blue-500",     verified: true  },
  { id: 6,  name: "Chhagan Bhujbal",   role: "Senior Leader",         district: "Nashik",     initials: "CB", color: "from-rose-500 to-pink-500",     verified: true  },
  { id: 7,  name: "Dilip Walse Patil", role: "Home Affairs Leader",   district: "Pune",       initials: "DW", color: "from-indigo-600 to-violet-500", verified: true  },
  { id: 8,  name: "Anil Deshmukh",     role: "Administration Leader", district: "Nagpur",     initials: "AD", color: "from-teal-600 to-cyan-500",     verified: true  },
  { id: 9,  name: "Rohit Patil",       role: "District Coordinator",  district: "Solapur",    initials: "RP", color: "from-amber-500 to-orange-400",  verified: false },
  { id: 10, name: "Sneha More",        role: "Block Leader",          district: "Mumbai",     initials: "SM", color: "from-pink-500 to-rose-400",     verified: false },
  { id: 11, name: "Rahul Deshmukh",    role: "Karyakarta",            district: "Aurangabad", initials: "RD", color: "from-green-600 to-emerald-500", verified: false },
  { id: 12, name: "Priya Kulkarni",    role: "Karyakarta",            district: "Kolhapur",   initials: "PK", color: "from-violet-600 to-purple-500", verified: false },
];

/* ─── Live Campaign Data ─────────────────────────────────── */
const BOOTHS = [
  { id: 1,  number: "Booth 42", location: "Yashwant School, Hadapsar",    status: "active",   volunteers: 4, totalVoters: 1240, covered: 68, agent: "Suresh Pawar"   },
  { id: 2,  number: "Booth 17", location: "Gram Panchayat Hall, Supe",    status: "active",   volunteers: 3, totalVoters: 980,  covered: 82, agent: "Anita Jadhav"   },
  { id: 3,  number: "Booth 08", location: "Zilla Parishad School, Loni",  status: "alert",    volunteers: 1, totalVoters: 1120, covered: 31, agent: "Ramesh Shinde"  },
  { id: 4,  number: "Booth 55", location: "Municipal Hall, Baramati",     status: "active",   volunteers: 5, totalVoters: 1450, covered: 91, agent: "Kavita Pawar"   },
  { id: 5,  number: "Booth 23", location: "Primary School, Morgaon",      status: "inactive", volunteers: 0, totalVoters: 760,  covered: 0,  agent: "—"              },
  { id: 6,  number: "Booth 31", location: "Community Hall, Niphad",       status: "active",   volunteers: 2, totalVoters: 1090, covered: 54, agent: "Yamini Kulkarni"},
  { id: 7,  number: "Booth 64", location: "High School, Igatpuri",        status: "active",   volunteers: 3, totalVoters: 870,  covered: 73, agent: "Shobha Nikam"   },
  { id: 8,  number: "Booth 11", location: "Waqf Board Hall, Aurangabad",  status: "alert",    volunteers: 2, totalVoters: 1380, covered: 42, agent: "Pramod Shinde"  },
];

const VOLUNTEERS = [
  { id: 1,  name: "Suresh Pawar",     area: "Hadapsar East",      checkin: "07:45 AM", status: "active",   tasks: 12, contact: "9876543210", designation: "Block Coordinator" },
  { id: 2,  name: "Anita Jadhav",     area: "Supe Village",       checkin: "08:10 AM", status: "active",   tasks: 9,  contact: "9823456781", designation: "Village Volunteer"  },
  { id: 3,  name: "Rohit Mane",       area: "Baramati Ward 3",    checkin: "08:30 AM", status: "break",    tasks: 6,  contact: "9765432190", designation: "Ward Volunteer"     },
  { id: 4,  name: "Kavita Shinde",    area: "Loni Kalbhor",       checkin: "07:55 AM", status: "active",   tasks: 14, contact: "9812345678", designation: "Booth Agent"        },
  { id: 5,  name: "Deepak Jadhav",    area: "Hadapsar West",      checkin: "09:00 AM", status: "active",   tasks: 8,  contact: "9834512367", designation: "Survey Leader"      },
  { id: 6,  name: "Sunita Thorat",    area: "Morgaon",            checkin: "—",        status: "absent",   tasks: 0,  contact: "9756321890", designation: "Village Volunteer"  },
  { id: 7,  name: "Manoj Gaikwad",    area: "Niphad Town",        checkin: "08:20 AM", status: "active",   tasks: 11, contact: "9898765432", designation: "Area Coordinator"  },
  { id: 8,  name: "Pooja Kulkarni",   area: "Igatpuri North",     checkin: "08:45 AM", status: "active",   tasks: 7,  contact: "9745678901", designation: "Booth Agent"        },
];

const CAMPAIGN_LOCATIONS = [
  { id: 1, name: "Hadapsar Rally Ground",       type: "Rally",         date: "Mar 10, 2026", time: "5:00 PM",  coordinator: "Supriya Sule",  status: "upcoming", district: "Pune",       attendees: 5000 },
  { id: 2, name: "Baramati Town Hall",           type: "Public Meeting",date: "Mar 12, 2026", time: "10:00 AM", coordinator: "Sharad Pawar",  status: "upcoming", district: "Pune",       attendees: 1200 },
  { id: 3, name: "Nashik Road – Door to Door",   type: "Door-to-Door",  date: "Mar 08, 2026", time: "All Day",  coordinator: "Pramod Shinde", status: "live",     district: "Nashik",     attendees: 0    },
  { id: 4, name: "Nagpur Dharampeth Ground",     type: "Rally",         date: "Mar 15, 2026", time: "4:00 PM",  coordinator: "Anil Deshmukh", status: "upcoming", district: "Nagpur",     attendees: 8000 },
  { id: 5, name: "Aurangabad CIDCO Ground",      type: "Rally",         date: "Mar 07, 2026", time: "6:00 PM",  coordinator: "Suresh Jedhe",  status: "completed",district: "Aurangabad", attendees: 3400 },
  { id: 6, name: "Kolhapur Krantiveer Chowk",   type: "Nukkad Sabha",  date: "Mar 09, 2026", time: "7:00 PM",  coordinator: "Satish Patil",  status: "live",     district: "Kolhapur",   attendees: 0    },
];

const SURVEYS = [
  { id: 1, title: "Voter Satisfaction Survey",      responses: 3840, target: 5000, rating: 4.2, tags: ["governance","roads","water"],     insight: "82% satisfied with water supply schemes." },
  { id: 2, title: "Agricultural Policy Feedback",   responses: 1920, target: 3000, rating: 4.5, tags: ["farming","MSP","loans"],          insight: "76% want increased MSP for sugarcane."   },
  { id: 3, title: "Youth Employment Survey",        responses: 2760, target: 4000, rating: 3.8, tags: ["jobs","education","startup"],      insight: "64% demand more govt job opportunities."  },
  { id: 4, title: "Infrastructure Development",     responses: 1540, target: 2500, rating: 4.0, tags: ["roads","bridges","connectivity"], insight: "Road quality is top concern in rural areas."},
  { id: 5, title: "Women Safety & Welfare",         responses: 2100, target: 3500, rating: 4.6, tags: ["safety","welfare","schemes"],     insight: "91% aware of Mahila Aadhar scheme."       },
];

const VOTERS = [
  { id: 1,  name: "Ramesh Suresh Pawar",   booth: "Booth 42", area: "Hadapsar",    age: 54, gender: "M", status: "contacted", phone: "✓" },
  { id: 2,  name: "Sunita Anil Jadhav",    booth: "Booth 42", area: "Hadapsar",    age: 38, gender: "F", status: "contacted", phone: "✓" },
  { id: 3,  name: "Manoj Vijay Shinde",    booth: "Booth 17", area: "Supe",        age: 45, gender: "M", status: "pending",   phone: "—" },
  { id: 4,  name: "Kavita Raju More",      booth: "Booth 17", area: "Supe",        age: 29, gender: "F", status: "contacted", phone: "✓" },
  { id: 5,  name: "Dattatray Pandurang",   booth: "Booth 08", area: "Loni",        age: 62, gender: "M", status: "pending",   phone: "—" },
  { id: 6,  name: "Priya Santosh Kulkarni",booth: "Booth 55", area: "Baramati",    age: 33, gender: "F", status: "contacted", phone: "✓" },
  { id: 7,  name: "Arun Babu Desai",       booth: "Booth 55", area: "Baramati",    age: 47, gender: "M", status: "contacted", phone: "✓" },
  { id: 8,  name: "Meena Sanjay Bhosle",   booth: "Booth 23", area: "Morgaon",     age: 41, gender: "F", status: "pending",   phone: "—" },
  { id: 9,  name: "Vinod Narayan Chavan",  booth: "Booth 31", area: "Niphad",      age: 58, gender: "M", status: "contacted", phone: "✓" },
  { id: 10, name: "Sushma Dilip Wagh",     booth: "Booth 64", area: "Igatpuri",    age: 36, gender: "F", status: "pending",   phone: "—" },
  { id: 11, name: "Ganesh Yashwant Kale",  booth: "Booth 11", area: "Aurangabad",  age: 50, gender: "M", status: "contacted", phone: "✓" },
  { id: 12, name: "Lalita Ashok Pawar",    booth: "Booth 42", area: "Hadapsar",    age: 44, gender: "F", status: "pending",   phone: "—" },
];

const CAMPAIGN_TABS = [
  { id: "booth",     label: "Booth",     icon: MonitorCheck  },
  { id: "volunteer", label: "Volunteers",icon: UserCheck     },
  { id: "locations", label: "Locations", icon: Navigation    },
  { id: "survey",    label: "Survey",    icon: ClipboardList },
  { id: "voters",    label: "Voters",    icon: BookUser      },
] as const;
type CampaignTab = typeof CAMPAIGN_TABS[number]["id"];

const announcements = [
  { id: 1, title: "Member Profile Verification Drive", content: "All members please update and verify their profiles. Leader verification & GPS-based tracking now live.", date: "Mar 5, 2026", priority: "high" },
  { id: 2, title: "Analytics & AI Dashboard Active",   content: "Real-time insights, sentiment analysis, and performance metrics now available for all leaders.",        date: "Mar 4, 2026", priority: "medium" },
  { id: 3, title: "New Karyakarta Onboarding Session", content: "All district coordinators must register karyakartas before March 20. Training sessions scheduled.",     date: "Mar 3, 2026", priority: "medium" },
];

type Notif = { id: number; type: "like"|"comment"|"follow"|"event"|"system"; user: string; initials: string; color: string; action: string; content: string; time: string; read: boolean };
const NOTIFICATIONS: Notif[] = [
  { id: 1, type: "like",    user: "Priya Sharma",      initials: "PS", color: "from-pink-500 to-rose-500",    action: "liked your post",           content: "Organized health camp in our locality…", time: "2h ago",  read: false },
  { id: 2, type: "comment", user: "Amit Singh",        initials: "AS", color: "from-blue-500 to-cyan-500",    action: "commented on your post",     content: "This is exactly what we need more of!", time: "3h ago",  read: false },
  { id: 3, type: "follow",  user: "Rahul Deshmukh",    initials: "RD", color: "from-emerald-500 to-teal-500", action: "started following you",      content: "",                                      time: "5h ago",  read: false },
  { id: 4, type: "event",   user: "NCP-SP Maharashtra",initials: "NM", color: "from-orange-500 to-amber-400", action: "invited you to an event",    content: "Town Hall Meeting · Mar 10, 2026",      time: "1d ago",  read: true  },
  { id: 5, type: "system",  user: "System",            initials: "SP", color: "from-blue-700 to-blue-500",    action: "Your profile has been verified", content: "Leader badge added to your account.", time: "2d ago",  read: true  },
];

const NOTIF_ICON_MAP: Record<string, string> = { like: "❤️", comment: "💬", follow: "👤", event: "📅", system: "🔔" };

// IDs 80001-80005 = static demo posts (never sent to DB; IDs < 80000 = real DB posts)
const INITIAL_POSTS: Post[] = [
  {
    id: 80001,
    author: { name: "Sharad Pawar", role: "Party President", initials: "SP", color: "from-blue-700 to-blue-500" },
    time: "2 hours ago", type: "post",
    content: "Proud to announce that our NCP-SP digital platform has crossed 50,000 active members! Together we are building a stronger Maharashtra. 🙏🇮🇳 #NCP #Maharashtra",
    likes: 2400, shares: 542,
    comments: [
      { id: 1, user: "Rahul Deshmukh", initials: "RD", color: "from-purple-500 to-pink-400", text: "Jai Maharashtra! 🙏 Proud to be part of NCP-SP family!", time: "1h ago" },
      { id: 2, user: "Priya Kulkarni",  initials: "PK", color: "from-teal-500 to-cyan-400",   text: "Great milestone! Digital India, Digital NCP 💪",         time: "45m ago" },
    ],
  },
  {
    id: 80002,
    author: { name: "Supriya Sule", role: "Working President", initials: "SS", color: "from-purple-600 to-pink-500" },
    time: "5 hours ago", type: "event",
    content: "Join us for a state-level training on rally and event management. All district leaders must attend. See you there! 🎉",
    likes: 876, shares: 210,
    comments: [
      { id: 1, user: "Amit Jadhav", initials: "AJ", color: "from-orange-500 to-amber-400", text: "Looking forward to this! Will all 36 districts be covered?", time: "3h ago" },
    ],
    event: { title: "Rally & Event Management Training", date: "Sun, Mar 10, 2026", time: "6:00 PM", location: "Yashwantrao Chavan Centre, Mumbai", going: 1240, interested: 3800 },
  },
  {
    id: 80003,
    author: { name: "Jayant Patil", role: "State President", initials: "JP", color: "from-emerald-600 to-teal-500" },
    time: "Yesterday", type: "campaign",
    content: "Launching our Digital Outreach Campaign across all 36 districts. Every karyakarta is a digital ambassador. Let's connect Maharashtra digitally! 💪",
    likes: 1530, shares: 389, comments: [],
    campaign: { title: "Digital Maharashtra Campaign", goal: "50,000 digital members", progress: 72 },
  },
  {
    id: 80004,
    author: { name: "Praful Patel", role: "Rajya Sabha MP", initials: "PP", color: "from-orange-500 to-amber-400" },
    time: "Yesterday", type: "event",
    content: "Karyakarta onboarding is going hybrid! All 36 districts will participate simultaneously. Register your block coordinators today.",
    likes: 643, shares: 134, comments: [],
    event: { title: "Karyakarta System Onboarding", date: "Sat, Mar 15, 2026", time: "10:00 AM", location: "All 36 Districts (Hybrid Mode)", going: 890, interested: 2100 },
  },
  {
    id: 80005,
    author: { name: "NCP-SP Official", role: "Party Page", initials: "NC", color: "from-blue-800 to-blue-600" },
    time: "2 days ago", type: "campaign",
    content: "Our Member Verification Drive is live. Leaders with verified profiles get priority access to all party resources and events. Update yours now! ✅",
    likes: 3200, shares: 720,
    comments: [
      { id: 1, user: "Sneha More", initials: "SM", color: "from-pink-500 to-rose-400", text: "Profile verified! The process was very smooth 👍", time: "1d ago" },
    ],
    campaign: { title: "Member Verification Drive", goal: "100% verified members", progress: 48 },
  },
];

const SHARE_OPTIONS = [
  { label: "WhatsApp",  emoji: "💬", bg: "bg-green-500" },
  { label: "Facebook",  emoji: "📘", bg: "bg-blue-600"  },
  { label: "Instagram", emoji: "📸", bg: "bg-gradient-to-tr from-purple-600 via-pink-500 to-orange-400" },
];

function fmt(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n); }

function roleColor(role: string): string {
  const map: Record<string, string> = {
    super_admin:     "from-blue-700 to-blue-500",
    state_leader:    "from-purple-600 to-pink-500",
    district_leader: "from-emerald-600 to-teal-500",
    taluka_leader:   "from-orange-500 to-amber-400",
    village_leader:  "from-cyan-600 to-blue-500",
    booth_leader:    "from-rose-500 to-pink-500",
    booth_worker:    "from-indigo-600 to-violet-500",
    karyakarta:      "from-teal-600 to-cyan-500",
  };
  return map[role] || "from-gray-500 to-gray-400";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return "Just now";
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function apiPostToPost(row: ApiPost): Post {
  const initials = row.author_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return {
    id:        row.id,
    author_id: row.author_id,
    author:    { name: row.author_name, role: row.author_role, initials, color: roleColor(row.author_role) },
    time:    timeAgo(row.created_at),
    type:    row.type as Post["type"],
    content: row.content,
    likes:   row.like_count,
    shares:  0,
    comments: [],
    liked_by_me:    row.liked_by_me,
    bookmarked_by_me: row.bookmarked_by_me,
    ...(row.event_title ? { event: {
      title:    row.event_title,
      date:     row.event_date
        ? new Date(row.event_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
        : "TBD",
      time:     row.event_time ?? "TBD",
      location: row.event_location ?? "",
      going:    0,
      interested: 0,
    }} : {}),
    ...(row.campaign_title ? { campaign: {
      title:    row.campaign_title,
      goal:     row.campaign_goal ?? "",
      progress: row.campaign_progress ?? 0,
    }} : {}),
  };
}

/* ─── Post Card ──────────────────────────────────────────── */
function PostCard({ post, liked, likesCount, bookmarked, expanded, onToggleExpand, onLike, onBookmark, token, currentUserId }: {
  post: Post; liked: boolean; likesCount: number; bookmarked: boolean;
  expanded: boolean; onToggleExpand: () => void;
  onLike: () => void; onBookmark: () => void;
  token: string | null;
  currentUserId?: number;
}) {
  const { isDark } = useTheme();
  const [comments, setComments]         = useState<Comment[]>(post.comments);
  const [commentsLoaded, setCommentsLoaded] = useState(post.comments.length > 0);
  const [commentText, setCommentText]   = useState("");
  const [shareOpen, setShareOpen]       = useState(false);
  const [shareCopied, setShareCopied]   = useState(false);
  const [going, setGoing]               = useState(post.event?.my_rsvp === "going");
  const [interested, setInterested]     = useState(post.event?.my_rsvp === "interested");
  const [goingCount, setGoingCount]     = useState(post.event?.going ?? 0);
  const [intCount, setIntCount]         = useState(post.event?.interested ?? 0);
  const [likedComments, setLikedComments] = useState<Set<number>>(new Set());
  const [replyTo, setReplyTo]           = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Friend + report state
  const [menuOpen, setMenuOpen]             = useState(false);
  const [friendRequested, setFriendRequested] = useState(false);
  const [sendingFriend, setSendingFriend]   = useState(false);
  const [reportOpen, setReportOpen]         = useState(false);
  const [reportReason, setReportReason]     = useState("spam");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportDone, setReportDone]         = useState(false);
  const [spamReporting, setSpamReporting]   = useState(false);
  const [spamReported, setSpamReported]     = useState(false);

  // Lazy-load comments from DB when card is first expanded
  useEffect(() => {
    const isStaticPost = post.id >= 80000 && post.id < 90000;
    if (!expanded || commentsLoaded || isStaticPost || !token) return;
    setCommentsLoaded(true);
    const url = post.id >= 90000
      ? `/api/campaign/events/${post.id - 90000}/comments`
      : `/api/posts/${post.id}/comments`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then((data: ApiComment[]) => {
        setComments(data.map(c => ({
          id:       c.id,
          user:     c.author_name,
          initials: c.author_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
          color:    roleColor(c.author_role),
          text:     c.content,
          time:     timeAgo(c.created_at),
        })));
        setLikedComments(new Set(data.filter(c => c.liked_by_me).map(c => c.id)));
      })
      .catch(() => {});
  }, [expanded, commentsLoaded, post.id, token]);

  useEffect(() => {
    if (expanded) setTimeout(() => inputRef.current?.focus(), 80);
  }, [expanded]);
  useEffect(() => { if (!expanded) { setCommentText(""); setReplyTo(null); } }, [expanded]);

  async function submitComment() {
    const t = commentText.trim(); if (!t) return;
    const tempId = -Date.now();
    const newC: Comment = { id: tempId, user: "You", initials: "Me", color: "from-blue-600 to-cyan-500", text: t, time: "Just now" };
    setComments(prev => [...prev, newC]);
    setCommentText(""); setReplyTo(null);

    const isStaticPost = post.id >= 80000 && post.id < 90000;
    if (isStaticPost || !token) return;
    const commentUrl = post.id >= 90000
      ? `/api/campaign/events/${post.id - 90000}/comments`
      : `/api/posts/${post.id}/comments`;
    try {
      const res = await fetch(commentUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content: t, parent_id: replyTo }),
      });
      if (res.ok) {
        const data: ApiComment = await res.json();
        setComments(prev => prev.map(c => c.id === tempId
          ? { id: data.id, user: data.author_name, initials: "Me", color: "from-blue-600 to-cyan-500", text: data.content, time: "Just now" }
          : c
        ));
      }
    } catch { /* keep optimistic */ }
  }

  async function callRsvp(status: "going" | "interested") {
    if (post.id < 90000 || !token) return;
    try {
      await fetch(`/api/campaign/events/${post.id - 90000}/rsvp`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch { /* optimistic stays */ }
  }

  function toggleGoing() {
    if (going) { setGoing(false); setGoingCount(c => c - 1); callRsvp("going"); }
    else { setGoing(true); setGoingCount(c => c + 1); if (interested) { setInterested(false); setIntCount(c => c - 1); } callRsvp("going"); }
  }

  function toggleInterested() {
    if (interested) { setInterested(false); setIntCount(c => c - 1); callRsvp("interested"); }
    else { setInterested(true); setIntCount(c => c + 1); if (going) { setGoing(false); setGoingCount(c => c - 1); } callRsvp("interested"); }
  }

  async function toggleCommentLike(id: number) {
    setLikedComments(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    if (!token || id < 0) return; // negative = optimistic temp id, not yet in DB
    const likeUrl = post.id >= 90000
      ? `/api/campaign/events/comments/${id}/like`
      : `/api/posts/comments/${id}/like`;
    try {
      await fetch(likeUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* optimistic stays */ }
  }

  async function handleShare() {
    const eventLine = post.event
      ? `\n📅 ${post.event.title}\n📍 ${post.event.location}\n🕐 ${post.event.date} · ${post.event.time}`
      : "";
    const shareText = `${post.author.name} — ${post.content}${eventLine}\n\n#NCPSP #Maharashtra`;
    setShareOpen(false);
    try {
      if (navigator.share) {
        await navigator.share({ title: post.author.name, text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
      }
    } catch { /* user cancelled */ }
  }

  async function shareVia(platform: string) {
    const eventLine = post.event ? ` | ${post.event.title} @ ${post.event.location}` : "";
    const text = encodeURIComponent(`${post.content}${eventLine} #NCPSP`);
    const url  = encodeURIComponent(window.location.href);
    const links: Record<string, string> = {
      WhatsApp:  `https://wa.me/?text=${text}`,
      Facebook:  `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`,
      Instagram: "", // Instagram doesn't support direct share URLs
    };
    if (links[platform]) window.open(links[platform], "_blank", "noopener");
    else {
      await navigator.clipboard.writeText(decodeURIComponent(text));
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    }
    setShareOpen(false);
  }

  async function handleAddFriend() {
    if (!post.author_id || friendRequested || sendingFriend) return;
    setSendingFriend(true);
    setFriendRequested(true); // optimistic
    try {
      await fetch("/api/friends/request", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ to_user_id: post.author_id }),
      });
    } catch { /* keep optimistic */ }
    finally { setSendingFriend(false); }
  }

  async function handleReportSpam() {
    setMenuOpen(false);
    if (spamReported || spamReporting) return;
    setSpamReporting(true);
    try {
      const isStatic = post.id >= 80000;
      if (!isStatic && token) {
        await fetch(`/api/posts/${post.id}/report`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "spam" }),
        });
      }
      setSpamReported(true);
    } catch { /* silent */ }
    finally { setSpamReporting(false); }
  }

  async function handleSubmitReport() {
    setSubmittingReport(true);
    try {
      const isStatic = post.id >= 80000;
      if (!isStatic && token) {
        await fetch(`/api/posts/${post.id}/report`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reportReason }),
        });
      }
      setReportDone(true);
      setTimeout(() => { setReportOpen(false); setReportDone(false); }, 1500);
    } catch { /* silent */ }
    finally { setSubmittingReport(false); }
  }

  const latest      = comments.slice(-1);
  const hiddenCount = comments.length - 1;

  function Bubble({ c }: { c: Comment }) {
    const isLiked = likedComments.has(c.id);
    return (
      <div className="flex gap-2 items-start">
        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${c.color} flex items-center justify-center text-white text-[9px] font-bold shrink-0 ring-1 ring-white shadow-sm`}>{c.initials}</div>
        <div className="flex-1">
          <div className={`rounded-2xl rounded-tl-sm px-3 py-2 ${isDark ? "bg-white/10" : "bg-gray-100"}`}>
            <p className={`text-[11px] font-bold mb-0.5 ${isDark ? "text-white" : "text-gray-900"}`}>{c.user}</p>
            <p className={`text-xs leading-snug ${isDark ? "text-gray-300" : "text-gray-600"}`}>{c.text}</p>
          </div>
          <div className="flex gap-3 mt-1 ml-2 items-center">
            <button
              onClick={() => toggleCommentLike(c.id)}
              className={`text-[10px] font-bold transition-colors flex items-center gap-0.5 ${isLiked ? "text-red-400" : "text-gray-500 hover:text-red-400"}`}
            >
              <Heart size={9} fill={isLiked ? "currentColor" : "none"} /> Like
            </button>
            <button
              onClick={() => { setReplyTo(c.id); onToggleExpand(); setCommentText(`@${c.user.split(" ")[0]} `); setTimeout(() => inputRef.current?.focus(), 80); }}
              className="text-[10px] text-gray-500 hover:text-blue-400 font-semibold transition-colors"
            >Reply</button>
            <span className="text-[10px] text-gray-600">{c.time}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl overflow-hidden ${isDark ? "bg-white/5 backdrop-blur-sm border border-white/10" : "bg-white border border-gray-100 shadow-sm"}`}>

      {/* Author row */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${post.author.color} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md`}>{post.author.initials}</div>
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-sm leading-tight ${isDark ? "text-white" : "text-gray-900"}`}>{post.author.name}</p>
          <p className={`text-[11px] mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{post.author.role} · {post.time}</p>
        </div>

        {/* Add Friend button — only for other users' posts */}
        {post.author_id && post.author_id !== currentUserId && (
          <button
            onClick={handleAddFriend}
            disabled={sendingFriend}
            className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 disabled:opacity-60 ${
              friendRequested
                ? "bg-green-50 border-green-200 text-green-600 cursor-default"
                : "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"
            }`}
          >
            {sendingFriend
              ? <Loader size={12} className="animate-spin" />
              : friendRequested
                ? <><UserCheck size={12} /><span>Added</span></>
                : <><UserPlus size={12} /><span>Add</span></>
            }
          </button>
        )}

        {/* Three-dot menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${isDark ? "hover:bg-white/10 active:bg-white/15" : "hover:bg-gray-100"}`}
          >
            <MoreHorizontal size={18} className={isDark ? "text-gray-400" : "text-gray-500"} />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                  transition={{ duration: 0.13 }}
                  className="absolute top-9 right-0 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 w-48 overflow-hidden"
                >
                  <button
                    onClick={handleReportSpam}
                    disabled={spamReporting || spamReported}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-orange-600 hover:bg-orange-50 active:bg-orange-100 transition-colors disabled:opacity-60"
                  >
                    <AlertTriangle size={14} />
                    {spamReported ? "Reported as Spam" : spamReporting ? "Reporting…" : "Report as Spam"}
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); setReportOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors"
                  >
                    <Flag size={14} />
                    Report Post
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Report modal */}
      <AnimatePresence>
        {reportOpen && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setReportOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ duration: 0.2 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[390px] max-w-full z-50 bg-white rounded-t-[2rem] shadow-2xl p-6"
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
              {reportDone ? (
                <div className="text-center py-4">
                  <CheckCircle2 size={40} className="text-green-500 mx-auto mb-3" />
                  <p className="font-bold text-gray-900">Report Submitted</p>
                  <p className="text-sm text-gray-500 mt-1">Thank you. Our team will review this post.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-red-100 rounded-2xl flex items-center justify-center">
                      <Flag size={18} className="text-red-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Report Post</h3>
                      <p className="text-xs text-gray-400">Help us keep the community safe</p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-5">
                    {[
                      { value: "spam",          label: "Spam or misleading" },
                      { value: "inappropriate", label: "Inappropriate content" },
                      { value: "harassment",    label: "Harassment or bullying" },
                      { value: "misinformation",label: "Misinformation" },
                      { value: "other",         label: "Other" },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setReportReason(opt.value)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-sm font-semibold transition-all ${
                          reportReason === opt.value
                            ? "bg-red-50 border-red-300 text-red-600"
                            : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {opt.label}
                        {reportReason === opt.value && <CheckCircle2 size={14} className="text-red-500" />}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setReportOpen(false)}
                      className="flex-1 h-11 bg-gray-100 text-gray-700 font-bold text-sm rounded-2xl hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitReport}
                      disabled={submittingReport}
                      className="flex-1 h-11 bg-red-500 text-white font-bold text-sm rounded-2xl hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {submittingReport ? <Loader size={14} className="animate-spin" /> : null}
                      Submit Report
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Content text */}
      <p className={`px-4 text-sm leading-relaxed pb-3 ${isDark ? "text-gray-200" : "text-gray-700"}`}>{post.content}</p>

      {/* Event card */}
      {post.type === "event" && post.event && (
        <div className="mx-4 mb-3 rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="h-28 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 flex flex-col items-center justify-center gap-1 relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent)]" />
            <Calendar size={28} className="text-white/90" />
            <span className="text-white text-xs font-bold tracking-widest uppercase">Upcoming Event</span>
          </div>
          <div className={`p-3 ${isDark ? "bg-white/5" : "bg-gray-50"}`}>
            <p className={`font-bold text-sm mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>{post.event.title}</p>
            <div className="space-y-1 mb-2">
              <div className={`flex items-center gap-2 text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                <Calendar size={11} className="text-blue-400 shrink-0" />
                <span>{post.event.date} · {post.event.time}</span>
              </div>
              <div className={`flex items-center gap-2 text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                <MapPin size={11} className="text-red-400 shrink-0" />
                <span>{post.event.location}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-3">
              <span className={`font-bold transition-colors ${going ? "text-blue-300" : "text-blue-400"}`}>{fmt(goingCount)} Going</span>
              <span>·</span>
              <span className={`transition-colors ${interested ? "text-orange-300 font-bold" : ""}`}>{fmt(intCount)} Interested</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={toggleGoing}
                className={`flex-1 h-8 text-xs font-bold rounded-xl border transition-all active:scale-95 ${going ? "bg-blue-500 text-white border-blue-500" : "bg-white/10 text-blue-300 border-white/20 hover:bg-blue-500/20"}`}
              >✓ {going ? "Going!" : "Going"}</button>
              <button
                onClick={toggleInterested}
                className={`flex-1 h-8 text-xs font-bold rounded-xl border transition-all active:scale-95 ${interested ? "bg-orange-500 text-white border-orange-500" : "bg-white/10 text-gray-300 border-white/20 hover:bg-white/15"}`}
              >★ {interested ? "Interested!" : "Interested"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign card */}
      {post.type === "campaign" && post.campaign && (
        <div className="mx-4 mb-3 rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="h-24 bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 flex flex-col items-center justify-center gap-1 relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.15),transparent)]" />
            <Target size={26} className="text-white/90" />
            <span className="text-white text-xs font-bold tracking-widest uppercase">Campaign</span>
          </div>
          <div className={`p-3 ${isDark ? "bg-white/5" : "bg-gray-50"}`}>
            <p className={`font-bold text-sm mb-0.5 ${isDark ? "text-white" : "text-gray-900"}`}>{post.campaign.title}</p>
            <p className={`text-[11px] mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Goal: {post.campaign.goal}</p>
            <div className="flex justify-between text-[10px] font-bold mb-1">
              <span className="text-orange-500">{post.campaign.progress}% Complete</span>
              <span className="text-gray-400">100%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full transition-all" style={{ width: `${post.campaign.progress}%` }} />
            </div>
            <button className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 active:scale-95 transition-transform">
              Support Campaign <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Post image placeholder */}
      {post.type === "post" && (
        <div className="h-52 mb-0 bg-gradient-to-br from-purple-200 via-pink-200 to-orange-100 flex flex-col items-center justify-center gap-2 text-purple-400/70">
          <Image size={28} strokeWidth={1.5} />
          <span className="text-sm font-medium tracking-wide">Post Image</span>
        </div>
      )}

      {/* Reaction summary row */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-b border-gray-100">
        <div className="flex items-center gap-2">
          {likesCount > 0 && (
            <>
              <div className="flex -space-x-1">
                <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[9px] shadow-sm ring-1 ring-white">❤️</span>
                <span className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-[9px] shadow-sm ring-1 ring-white">👍</span>
              </div>
              <span className="text-xs text-gray-500 font-medium">{fmt(likesCount)}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {comments.length > 0 && (
            <button onClick={onToggleExpand} className="hover:text-blue-500 hover:underline transition-colors font-medium">
              {comments.length} comment{comments.length !== 1 ? "s" : ""}
            </button>
          )}
          {post.shares > 0 && <span>{post.shares} shares</span>}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center px-3 py-1.5 gap-1">

        {/* Like */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={onLike}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm transition-colors ${
            liked ? "bg-red-100 text-red-500" : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <Heart size={15} fill={liked ? "currentColor" : "none"} strokeWidth={liked ? 0 : 2} className={liked ? "drop-shadow-sm" : ""} />
          {liked ? "Liked" : "Like"}
        </motion.button>

        {/* Comment */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={onToggleExpand}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm transition-colors ${
            expanded ? "text-blue-500 bg-blue-50" : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <MessageCircle size={15} strokeWidth={2} />
          {comments.length > 0 ? `${comments.length}` : "Comment"}
        </motion.button>

        {/* Share */}
        <div className="relative">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setShareOpen(v => !v)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm transition-colors ${
              shareCopied ? "text-green-600 bg-green-50" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <Share2 size={15} strokeWidth={2} />
            {shareCopied ? "Copied!" : "Share"}
          </motion.button>

          <AnimatePresence>
            {shareOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShareOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-12 left-0 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 w-48"
                >
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">Share via</p>
                  <div className="space-y-1.5">
                    <button onClick={() => shareVia("WhatsApp")}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-green-500 text-white font-semibold text-sm active:scale-95 transition-transform">
                      💬 WhatsApp
                    </button>
                    <button onClick={() => shareVia("Facebook")}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm active:scale-95 transition-transform">
                      📘 Facebook
                    </button>
                    <button onClick={handleShare}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm active:scale-95 transition-transform">
                      📋 Copy Link
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Bookmark */}
        <BookmarkButton saved={bookmarked} onToggle={onBookmark} />
      </div>

      {/* Comments section */}
      <div className="px-4">
        {!expanded && latest.length > 0 && (
          <div className="pt-1.5 pb-3">
            {hiddenCount > 0 && (
              <button onClick={onToggleExpand} className="text-xs text-blue-600 font-semibold mb-2 flex items-center gap-1 hover:text-blue-700 transition-colors">
                <MessageCircle size={12} /> View {hiddenCount} more comment{hiddenCount !== 1 ? "s" : ""}
              </button>
            )}
            <Bubble c={latest[0]} />
          </div>
        )}

        {expanded && (
          <div className="pt-2 pb-3 space-y-3">
            {comments.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-3">No comments yet. Be the first!</p>
            )}
            <div className="max-h-64 overflow-y-auto space-y-3 pr-1 scrollbar-hide overscroll-contain"
              onScroll={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
              {comments.map(c => <Bubble key={c.id} c={c} />)}
            </div>
            {comments.length > 0 && <div className="border-t border-gray-100" />}

            {/* Reply indicator */}
            {replyTo !== null && (
              <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-1.5">
                <span className="text-[10px] text-blue-600 font-medium flex-1">
                  Replying to {comments.find(c => c.id === replyTo)?.user.split(" ")[0]}
                </span>
                <button onClick={() => { setReplyTo(null); setCommentText(""); }} className="text-gray-400 hover:text-gray-600">
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Comment input */}
            <div className="flex gap-2.5 items-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-sm">Me</div>
              <div className="flex-1 flex items-center gap-1.5 bg-gray-100 rounded-2xl px-3 pr-1.5 py-1.5">
                <input ref={inputRef} type="text" placeholder="Write a comment…" value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && submitComment()}
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none min-w-0" />
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={submitComment}
                  disabled={!commentText.trim()}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-600 disabled:bg-gray-300 transition-colors shrink-0"
                >
                  <Send size={13} className="text-white" />
                </motion.button>
              </div>
            </div>
            <button onClick={onToggleExpand} className="w-full text-[10px] text-gray-400 font-medium py-1 hover:text-gray-500 transition-colors">▲ Hide comments</button>
          </div>
        )}
      </div>
    </div>
  );
}

function BookmarkButton({ saved, onToggle }: { saved: boolean; onToggle: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={onToggle}
      className={`ml-auto w-9 h-9 flex items-center justify-center rounded-full transition-colors ${saved ? "text-blue-600 bg-blue-50" : "text-gray-400 hover:bg-gray-100"}`}
    >
      <Bookmark size={17} strokeWidth={2} fill={saved ? "currentColor" : "none"} />
    </motion.button>
  );
}

interface CampaignEvent {
  id: number; title: string; type: string; location: string;
  district: string | null; event_date: string; event_time: string;
  coordinator: string | null; expected_attendance: number;
  status: string; notes: string | null;
  like_count?: number; liked_by_me?: boolean; bookmarked_by_me?: boolean;
  going_count?: number; interested_count?: number;
  my_rsvp?: "going" | "interested" | null;
}

function eventToPost(ev: CampaignEvent): Post {
  const typeLabel  = ev.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const authorName = ev.coordinator ?? "NCP-SP Official";
  return {
    id: 90000 + ev.id,
    author: {
      name:     authorName,
      role:     typeLabel,
      initials: authorName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
      color:    "from-blue-700 to-blue-500",
    },
    time: new Date(ev.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    type: "event",
    content: ev.notes?.trim()
      || `Join us for ${ev.title} at ${ev.location}${ev.district ? ", " + ev.district : ""}. All members and supporters are invited!`,
    likes:    ev.like_count ?? 0,
    shares:   0,
    comments: [],
    liked_by_me:      ev.liked_by_me      ?? false,
    bookmarked_by_me: ev.bookmarked_by_me ?? false,
    event: {
      title:    ev.title,
      date:     new Date(ev.event_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
      time:     ev.event_time ?? "TBD",
      location: ev.location + (ev.district ? ", " + ev.district : ""),
      going:      ev.going_count      ?? 0,
      interested: ev.interested_count ?? ev.expected_attendance,
      my_rsvp:    ev.my_rsvp ?? null,
    },
  };
}

const ROLE_DISPLAY: Record<string, string> = {
  taluka_leader:  "Taluka Leader",
  village_leader: "Village Leader",
  booth_leader:   "Booth Leader",
  booth_worker:   "Booth Worker",
  karyakarta:     "Karyakarta",
  observer:       "Observer",
};

/* ─── Home Screen ────────────────────────────────────────── */
export default function HomeScreen() {
  const navigate = useNavigate();
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>(NOTIFICATIONS);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [friendReqList, setFriendReqList]           = useState<{ id: number; from_id: number; from_name: string; from_role: string; created_at: string }[]>([]);
  const [frLoading, setFrLoading]                   = useState(false);
  const [frActioning, setFrActioning]               = useState<Set<number>>(new Set());
  const [posts, setPosts]           = useState<Post[]>(INITIAL_POSTS);
  const [statuses, setStatuses]     = useState<Status[]>([
    { id: 301, user: "Sharad Pawar",  initials: "SP", bg: "from-blue-700 to-blue-500",       text: "Jai Maharashtra! 🙏 Building a stronger nation together.", time: "1h ago" },
    { id: 302, user: "Supriya Sule",  initials: "SS", bg: "from-purple-600 to-pink-500",     text: "Proud to serve the people of Maharashtra 💪 #NCP", time: "2h ago" },
    { id: 303, user: "Jayant Patil",  initials: "JP", bg: "from-emerald-600 to-teal-500",    text: "Digital Maharashtra campaign is live! Join us today 🌐", time: "3h ago" },
    { id: 304, user: "Praful Patel",  initials: "PP", bg: "from-orange-500 to-amber-400",    text: "Karyakarta onboarding begins this weekend. Be ready! 🏆", time: "5h ago" },
    { id: 305, user: "Anil Deshmukh", initials: "AD", bg: "from-rose-500 to-pink-600",       text: "Member verification drive — please update your profile ✅", time: "6h ago" },
  ]);
  const [liked, setLiked]           = useState<Set<number>>(new Set());
  const [bookmarked, setBookmarked] = useState<Set<number>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>(
    Object.fromEntries(INITIAL_POSTS.map((p) => [p.id, p.likes]))
  );
  const [expandedPost, setExpandedPost]   = useState<number | null>(null);
  const [nextCommentId, setNextCommentId] = useState(100);
  const [nextPostId, setNextPostId]       = useState(200);
  const [nextStatusId, setNextStatusId]   = useState(300);
  const [postToast, setPostToast]         = useState<string | null>(null);

  /* Compose sheet state */
  const [showCompose, setShowCompose]   = useState(false);
  const [composeMode, setComposeMode]   = useState<"post" | "status">("post");
  const [draftText, setDraftText]       = useState("");
  const [statusColor, setStatusColor]   = useState(STATUS_COLORS[0].cls);
  const [viewedStatus, setViewedStatus] = useState<Status | null>(null);
  const [showMembers, setShowMembers]   = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [showCampaign, setShowCampaign]           = useState(false);
  const [campaignTab, setCampaignTab]             = useState<CampaignTab>("booth");
  const [campaignSearch, setCampaignSearch]       = useState("");
  const [showAnalytics, setShowAnalytics]         = useState(false);
  const [analyticsSearch, setAnalyticsSearch]     = useState("");
  const [collapsedDistricts, setCollapsedDistricts] = useState<Set<number>>(new Set());
  const [collapsedTalukas,   setCollapsedTalukas]   = useState<Set<number>>(new Set());

  // Hierarchy API state
  const { token, user } = useAuth();
  const [hDistricts,     setHDistricts]     = useState<HDistrict[]>([]);
  const [hTalukas,       setHTalukas]       = useState<Record<number, HTaluka[]>>({});
  const [hVillages,      setHVillages]      = useState<Record<number, HVillage[]>>({});
  const [hLoadingD,      setHLoadingD]      = useState(false);
  const [hLoadingT,      setHLoadingT]      = useState<Set<number>>(new Set());
  const [hLoadingV,      setHLoadingV]      = useState<Set<number>>(new Set());
  const [hSearchResults, setHSearchResults] = useState<HSearch[]>([]);
  const [hSearching,     setHSearching]     = useState(false);
  const hDistrictsLoaded = hDistricts.length > 0;

  const authHdr = useCallback(() =>
    token ? { Authorization: `Bearer ${token}` } : {} as Record<string, string>,
  [token]);

  // Fetch DB posts (replaces INITIAL_POSTS only when DB has posts; keeps campaign events)
  useEffect(() => {
    if (!token) return;
    fetch("/api/posts?limit=20", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: ApiPost[] | null) => {
        if (!data || !Array.isArray(data) || data.length === 0) return; // keep INITIAL_POSTS if DB is empty
        const mapped = data.map(apiPostToPost);
        setPosts(prev => {
          const events = prev.filter(p => p.id >= 90000); // keep campaign events
          return [...events, ...mapped];
        });
        setLiked(new Set(data.filter(p => p.liked_by_me).map(p => p.id)));
        setBookmarked(new Set(data.filter(p => p.bookmarked_by_me).map(p => p.id)));
        setLikeCounts(prev => ({
          ...prev,
          ...Object.fromEntries(data.map(p => [p.id, p.like_count])),
        }));
      })
      .catch(() => {});
  }, [token]);

  // Fetch campaign events and prepend to feed as posts
  useEffect(() => {
    if (!token) return;
    fetch("/api/campaign/events?limit=50", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then((data: CampaignEvent[]) => {
        const mapped = data.map(eventToPost);
        if (mapped.length === 0) return;
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const fresh = mapped.filter(p => !existingIds.has(p.id));
          return [...fresh, ...prev];
        });
        // Initialise like counts from DB values
        setLikeCounts(prev => ({
          ...prev,
          ...Object.fromEntries(mapped.map(p => [p.id, p.likes])),
        }));
        // Initialise liked set from DB liked_by_me flags
        setLiked(prev => {
          const next = new Set(prev);
          mapped.filter(p => p.liked_by_me).forEach(p => next.add(p.id));
          return next;
        });
        // Initialise bookmarked set from DB bookmarked_by_me flags
        setBookmarked(prev => {
          const next = new Set(prev);
          mapped.filter(p => p.bookmarked_by_me).forEach(p => next.add(p.id));
          return next;
        });
      })
      .catch(() => {});
  }, [token]);

  const fetchDistricts = useCallback(async () => {
    if (hDistrictsLoaded || hLoadingD) return;
    setHLoadingD(true);
    try {
      const res = await fetch("/api/hierarchy/districts", { headers: authHdr() });
      if (res.ok) setHDistricts(await res.json());
    } finally { setHLoadingD(false); }
  }, [hDistrictsLoaded, hLoadingD, authHdr]);

  const fetchTalukas = useCallback(async (districtCode: number) => {
    if (hTalukas[districtCode] || hLoadingT.has(districtCode)) return;
    setHLoadingT(s => new Set(s).add(districtCode));
    try {
      const res = await fetch(`/api/hierarchy/talukas?district=${districtCode}`, { headers: authHdr() });
      if (res.ok) { const data = await res.json(); setHTalukas(prev => ({ ...prev, [districtCode]: data })); }
    } finally { setHLoadingT(s => { const n = new Set(s); n.delete(districtCode); return n; }); }
  }, [hTalukas, hLoadingT, authHdr]);

  const fetchVillages = useCallback(async (talukaCode: number) => {
    if (hVillages[talukaCode] || hLoadingV.has(talukaCode)) return;
    setHLoadingV(s => new Set(s).add(talukaCode));
    try {
      const res = await fetch(`/api/hierarchy/villages?taluka=${talukaCode}&limit=200`, { headers: authHdr() });
      if (res.ok) { const d = await res.json(); setHVillages(prev => ({ ...prev, [talukaCode]: d.data })); }
    } finally { setHLoadingV(s => { const n = new Set(s); n.delete(talukaCode); return n; }); }
  }, [hVillages, hLoadingV, authHdr]);

  // Fetch pending friend requests
  useEffect(() => {
    if (!token) return;
    setFrLoading(true);
    fetch("/api/friends/requests", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setFriendReqList)
      .catch(() => {})
      .finally(() => setFrLoading(false));
  }, [token]);

  async function handleFriendReqAction(reqId: number, status: "accepted" | "declined") {
    setFrActioning(prev => new Set([...prev, reqId]));
    try {
      await fetch(`/api/friends/requests/${reqId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setFriendReqList(prev => prev.filter(r => r.id !== reqId));
    } catch { /* silent */ }
    finally { setFrActioning(prev => { const s = new Set(prev); s.delete(reqId); return s; }); }
  }

  // Debounced search
  useEffect(() => {
    if (!showAnalytics) return;
    if (!analyticsSearch.trim()) { setHSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setHSearching(true);
      try {
        const res = await fetch(`/api/hierarchy/search?q=${encodeURIComponent(analyticsSearch)}&limit=25`, { headers: authHdr() });
        if (res.ok) setHSearchResults(await res.json());
      } finally { setHSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [analyticsSearch, showAnalytics, authHdr]);

  const { isDark } = useTheme();
  const scrollRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const statusInputRef = useRef<HTMLInputElement>(null);

  function openCompose(mode: "post" | "status" = "post") {
    setComposeMode(mode);
    setDraftText("");
    setStatusColor(STATUS_COLORS[0].cls);
    setShowCompose(true);
    setTimeout(() => {
      if (mode === "post") textareaRef.current?.focus();
      else statusInputRef.current?.focus();
    }, 100);
  }

  function closeCompose() { setShowCompose(false); setDraftText(""); }

  function showToast(msg: string) {
    setPostToast(msg);
    setTimeout(() => setPostToast(null), 3500);
  }

  async function submitPost() {
    const text = draftText.trim(); if (!text) return;
    closeCompose();
    if (token) {
      try {
        const res = await fetch("/api/posts", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ type: "post", content: text }),
        });
        if (res.ok) {
          const data: ApiPost = await res.json();
          const newPost = apiPostToPost(data);
          setPosts(prev => [newPost, ...prev]);
          setLikeCounts(c => ({ ...c, [newPost.id]: 0 }));
          showToast("Post shared successfully!");
          return;
        }
        const err = await res.json().catch(() => ({}));
        showToast(err?.error ?? "Failed to post. Please try again.");
        return;
      } catch {
        showToast("Network error. Please check your connection.");
        return;
      }
    }
    // Local fallback (offline / no token)
    const id = nextPostId;
    setPosts(prev => [{
      id, author: { name: user?.name ?? "You", role: "Member", initials: "Me", color: "from-blue-600 to-cyan-500" },
      time: "Just now", type: "post", content: text, likes: 0, comments: [], shares: 0,
    }, ...prev]);
    setLikeCounts(c => ({ ...c, [id]: 0 }));
    setNextPostId(n => n + 1);
  }

  function submitStatus() {
    const text = draftText.trim(); if (!text) return;
    setStatuses((s) => [{ id: nextStatusId, user: "You", initials: "Me", bg: statusColor, text, time: "Just now" }, ...s]);
    setNextStatusId((n) => n + 1);
    closeCompose();
  }

  async function toggleLike(id: number) {
    if (!token) return;
    // Optimistic update first
    setLiked(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); setLikeCounts(c => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) - 1) })); }
      else               { next.add(id);    setLikeCounts(c => ({ ...c, [id]: (c[id] ?? 0) + 1 })); }
      return next;
    });

    if (id >= 80000 && id < 90000) return; // static INITIAL_POSTS — local only

    const url = id >= 90000
      ? `/api/campaign/events/${id - 90000}/like`   // campaign event
      : `/api/posts/${id}/like`;                     // real DB post

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLikeCounts(c => ({ ...c, [id]: data.count }));
      }
    } catch { /* optimistic stays */ }
  }

  async function toggleBookmark(id: number) {
    setBookmarked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    const isStaticPost = id >= 80000 && id < 90000;
    if (isStaticPost || !token) return;
    const bookmarkUrl = id >= 90000
      ? `/api/campaign/events/${id - 90000}/bookmark`
      : `/api/posts/${id}/bookmark`;
    try {
      await fetch(bookmarkUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* optimistic stays */ }
  }

  return (
    <div ref={scrollRef} className={`min-h-screen ${isDark ? "bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" : "bg-gray-50"}`}>

      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 text-white p-4 pb-5 rounded-b-[2rem] shadow-2xl relative overflow-hidden z-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(6,182,212,0.2),transparent_50%)]" />
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="font-bold text-lg mb-0.5 tracking-tight">NCP</h1>
              <p className="text-xs text-blue-100 font-semibold mb-0.5">Sharadchandra Pawar</p>
              <p className="text-[10px] text-blue-50 flex items-center gap-1">
                <Sparkles size={10} className="text-yellow-300" />
                {user?.name ? `Welcome, ${user.name.split(" ")[0]}` : "Welcome back"}
                {user?.role && ROLE_DISPLAY[user.role] ? ` · ${ROLE_DISPLAY[user.role]}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Friend Requests */}
              <div className="relative">
                <button
                  onClick={() => { setShowFriendRequests(v => !v); setShowAnnouncements(false); setShowNotifications(false); }}
                  className={`p-2.5 rounded-xl backdrop-blur-md border shadow-lg hover:scale-105 active:scale-95 transition-all ${showFriendRequests ? "bg-white/40 border-white/60" : "bg-white/20 hover:bg-white/30 border-white/30"}`}
                >
                  <Users size={18} />
                </button>
                {friendReqList.length > 0 && (
                  <div className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg">
                    {friendReqList.length > 9 ? "9+" : friendReqList.length}
                  </div>
                )}
              </div>
              {/* Announcements */}
              <div className="relative">
                <button onClick={() => { setShowAnnouncements((v) => !v); setShowNotifications(false); setShowFriendRequests(false); }} className={`p-2.5 rounded-xl backdrop-blur-md border shadow-lg hover:scale-105 active:scale-95 transition-all ${showAnnouncements ? "bg-white/40 border-white/60" : "bg-white/20 hover:bg-white/30 border-white/30"}`}>
                  <Megaphone size={18} />
                </button>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg">{announcements.length}</div>
              </div>
              {/* Notifications */}
              <div className="relative">
                <button onClick={() => { setShowNotifications((v) => !v); setShowAnnouncements(false); setShowFriendRequests(false); if (!showNotifications) setNotifs((n) => n.map((x) => ({ ...x, read: true }))); }} className={`p-2.5 rounded-xl backdrop-blur-md border shadow-lg hover:scale-105 active:scale-95 transition-all ${showNotifications ? "bg-white/40 border-white/60" : "bg-white/20 hover:bg-white/30 border-white/30"}`}>
                  <Bell size={18} />
                </button>
                {notifs.some((n) => !n.read) && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg animate-pulse">
                    {notifs.filter((n) => !n.read).length}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {/* Members */}
            <button onClick={() => setShowMembers(true)}
              className="bg-white/20 backdrop-blur-lg rounded-xl p-3 border border-white/30 shadow-xl hover:bg-white/30 transition-all hover:scale-105 active:scale-95 text-left">
              <Users size={13} className="text-orange-300 mb-1" />
              <p className="text-xl font-bold mb-0.5">50K+</p>
              <p className="text-[10px] text-blue-100">Members</p>
            </button>
            {/* Analytics */}
            <button onClick={() => { setShowAnalytics(true); setAnalyticsSearch(""); setCollapsedDistricts(new Set()); setCollapsedTalukas(new Set()); fetchDistricts(); }}
              className="bg-white/20 backdrop-blur-lg rounded-xl p-3 border border-white/30 shadow-xl hover:bg-white/30 transition-all hover:scale-105 active:scale-95 text-left">
              <BarChart2 size={13} className="text-cyan-300 mb-1" />
              <p className="text-xl font-bold mb-0.5">36</p>
              <p className="text-[10px] text-blue-100">Analytics</p>
            </button>
            {/* Live Campaign */}
            <button onClick={() => navigate("/campaign")}
              className="bg-white/20 backdrop-blur-lg rounded-xl p-3 border border-white/30 shadow-xl hover:bg-white/30 transition-all hover:scale-105 active:scale-95 text-left relative overflow-hidden">
              <div className="absolute top-2 right-2 flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              </div>
              <Zap size={13} className="text-yellow-300 mb-1" />
              <p className="text-xl font-bold mb-0.5">Live</p>
              <p className="text-[10px] text-blue-100">Campaign</p>
            </button>
          </div>
        </div>
      </div>

      {/* ── Announcements panel ── */}
      {showAnnouncements && (
        <>
          <div className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[2px]" onClick={() => setShowAnnouncements(false)} />
          <div className="fixed top-[172px] left-1/2 -translate-x-1/2 w-[366px] z-40 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-pink-50">
              <div className="flex items-center gap-2">
                <Megaphone size={15} className="text-orange-500" />
                <span className="font-bold text-sm text-gray-800">Announcements</span>
                <span className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full font-bold">{announcements.length}</span>
              </div>
              <button onClick={() => setShowAnnouncements(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"><X size={13} className="text-gray-600" /></button>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
              {announcements.map((a) => (
                <div key={a.id} className="px-4 py-3 hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-bold text-xs text-gray-900 flex-1">{a.title}</p>
                    {a.priority === "high" && <span className="text-[10px] bg-gradient-to-r from-orange-500 to-pink-500 text-white px-2 py-0.5 rounded-full font-bold shrink-0">🔥 Hot</span>}
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed mb-1">{a.content}</p>
                  <p className="text-[10px] text-gray-400 font-medium">{a.date}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Notifications panel ── */}
      {showNotifications && (
        <>
          <div className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[2px]" onClick={() => setShowNotifications(false)} />
          <div className="fixed top-[172px] left-1/2 -translate-x-1/2 w-[366px] z-40 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50">
              <div className="flex items-center gap-2">
                <Bell size={15} className="text-blue-500" />
                <span className="font-bold text-sm text-gray-800">Notifications</span>
                {notifs.some((n) => !n.read) && (
                  <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">
                    {notifs.filter((n) => !n.read).length} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setNotifs((n) => n.map((x) => ({ ...x, read: true })))} className="text-[10px] text-blue-600 font-bold hover:underline">
                  Mark all read
                </button>
                <button onClick={() => setShowNotifications(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">
                  <X size={13} className="text-gray-600" />
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {notifs.length === 0 ? (
                <div className="py-10 text-center text-gray-400">
                  <Bell size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No notifications</p>
                </div>
              ) : notifs.map((n) => (
                <div
                  key={n.id}
                  onClick={() => setNotifs((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x))}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${n.read ? "bg-white hover:bg-gray-50" : "bg-blue-50/60 hover:bg-blue-50"}`}
                >
                  <div className="relative shrink-0">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${n.color} flex items-center justify-center text-white text-[11px] font-bold shadow-sm`}>
                      {n.initials}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 text-sm leading-none">{NOTIF_ICON_MAP[n.type]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-800 leading-snug">
                      <span className="font-bold">{n.user}</span>{" "}
                      <span className="text-gray-600">{n.action}</span>
                    </p>
                    {n.content && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{n.content}</p>}
                    <p className="text-[10px] text-gray-300 font-medium mt-0.5">{n.time}</p>
                  </div>
                  {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Friend Requests panel ── */}
      {showFriendRequests && (
        <>
          <div className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[2px]" onClick={() => setShowFriendRequests(false)} />
          <div className="fixed top-[172px] left-1/2 -translate-x-1/2 w-[366px] z-40 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center gap-2">
                <Users size={15} className="text-emerald-600" />
                <span className="font-bold text-sm text-gray-800">Friend Requests</span>
                {friendReqList.length > 0 && (
                  <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold">{friendReqList.length}</span>
                )}
              </div>
              <button onClick={() => setShowFriendRequests(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">
                <X size={13} className="text-gray-600" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {frLoading ? (
                <div className="py-8 text-center text-gray-400">
                  <Loader size={20} className="animate-spin mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-medium">Loading requests…</p>
                </div>
              ) : friendReqList.length === 0 ? (
                <div className="py-10 text-center text-gray-400">
                  <Users size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold">No pending requests</p>
                  <p className="text-xs mt-0.5 text-gray-300">You're all caught up!</p>
                </div>
              ) : (
                friendReqList.map((req) => {
                  const initials = req.from_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                  const isActioning = frActioning.has(req.id);
                  return (
                    <div key={req.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                      {/* Avatar */}
                      <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${roleColor(req.from_role)} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md`}>
                        {initials}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-900 truncate">{req.from_name}</p>
                        <p className="text-[11px] text-gray-400 truncate">{req.from_role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
                      </div>
                      {/* Action buttons */}
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => handleFriendReqAction(req.id, "accepted")}
                          disabled={isActioning}
                          className="h-8 px-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1"
                        >
                          {isActioning ? <Loader size={11} className="animate-spin" /> : <UserCheck size={12} />}
                          Confirm
                        </button>
                        <button
                          onClick={() => handleFriendReqAction(req.id, "declined")}
                          disabled={isActioning}
                          className="h-8 px-3 bg-gray-100 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Status row (replaces hardcoded stories) ── */}
      <div className={`mt-2 px-3 py-4 shadow-sm ${isDark ? "bg-white/8 backdrop-blur-sm" : "bg-white"}`}>
        <div className="flex gap-4 overflow-x-auto scrollbar-hide">

          {/* Add Status button */}
          <div className="flex flex-col items-center gap-1.5 min-w-fit cursor-pointer group" onClick={() => openCompose("status")}>
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-blue-400 flex items-center justify-center bg-blue-50 group-hover:bg-blue-100 group-hover:scale-110 group-active:scale-95 transition-all shadow-sm">
                <Plus size={24} className="text-blue-500" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                <Plus size={10} className="text-white" strokeWidth={3} />
              </div>
            </div>
            <span className="text-[10px] text-blue-600 font-bold">Add Status</span>
          </div>

          {/* Posted statuses */}
          {statuses.map((s) => (
            <div key={s.id} className="flex flex-col items-center gap-1.5 min-w-fit cursor-pointer group" onClick={() => setViewedStatus(s)}>
              <div className="relative">
                {/* Gradient ring */}
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${s.bg} p-[2.5px] shadow-md group-hover:scale-110 group-active:scale-95 transition-all`}>
                  <div className={`w-full h-full rounded-full bg-gradient-to-br ${s.bg} flex items-center justify-center px-1`}>
                    <p className="text-white text-[8px] font-bold text-center leading-tight line-clamp-3">{s.text}</p>
                  </div>
                </div>
                {/* Avatar badge */}
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md border-2 border-white">
                  <div className={`w-full h-full rounded-full bg-gradient-to-br ${s.bg} flex items-center justify-center text-[7px] text-white font-black`}>{s.initials[0]}</div>
                </div>
              </div>
              <span className={`text-[10px] font-semibold max-w-[64px] truncate text-center ${isDark ? "text-gray-300" : "text-gray-600"}`}>{s.user.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Create post bar ── */}
      <div className={`mt-2 px-4 py-3 shadow-sm flex items-center gap-3 ${isDark ? "bg-white/8 backdrop-blur-sm" : "bg-white"}`}>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-sm">Me</div>
        <button onClick={() => openCompose("post")} className={`flex-1 text-left rounded-2xl px-4 py-2.5 text-sm transition-colors ${isDark ? "bg-white/10 text-gray-400 hover:bg-white/15" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}>
          What's on your mind?
        </button>
        <button onClick={() => openCompose("post")} className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors">
          <Image size={18} className="text-blue-600" />
        </button>
      </div>

      {/* ── Compose sheet ── */}
      {showCompose && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[3px]" onClick={closeCompose} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[390px] max-w-full z-50 bg-white rounded-t-3xl shadow-2xl">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>

            {/* Tab switcher */}
            <div className="flex mx-4 mt-2 mb-0 bg-gray-100 rounded-2xl p-1 gap-1">
              {(["post", "status"] as const).map((mode) => (
                <button key={mode} onClick={() => { setComposeMode(mode); setDraftText(""); setTimeout(() => { if (mode === "post") textareaRef.current?.focus(); else statusInputRef.current?.focus(); }, 80); }}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${composeMode === mode ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
                  {mode === "post" ? "📝 Post" : "✨ Status"}
                </button>
              ))}
            </div>

            {/* Header row */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 mt-2">
              <button onClick={closeCompose} className="text-sm font-semibold text-gray-500 hover:text-gray-700">Cancel</button>
              <h3 className="font-bold text-sm text-gray-900">{composeMode === "post" ? "Create Post" : "Create Status"}</h3>
              <button onClick={composeMode === "post" ? submitPost : submitStatus} disabled={!draftText.trim()}
                className="text-sm font-bold text-white bg-blue-600 disabled:bg-blue-300 px-4 py-1.5 rounded-full transition-colors active:scale-95">
                {composeMode === "post" ? "Post" : "Share"}
              </button>
            </div>

            {/* ── POST mode ── */}
            {composeMode === "post" && (
              <>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">Me</div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">You</p>
                    <div className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-0.5 w-fit mt-0.5">
                      <span className="text-[10px]">🌐</span><span className="text-[10px] font-semibold text-gray-600">Public</span>
                    </div>
                  </div>
                </div>
                <textarea ref={textareaRef} value={draftText} onChange={(e) => setDraftText(e.target.value)}
                  placeholder="What's on your mind?" rows={5}
                  className="w-full px-4 text-base text-gray-800 placeholder:text-gray-400 outline-none resize-none leading-relaxed" />
                <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 mr-1">Add:</p>
                  {[{ icon: "🖼️", label: "Photo" }, { icon: "📍", label: "Location" }, { icon: "😊", label: "Feeling" }, { icon: "🏷️", label: "Tag" }].map((t) => (
                    <button key={t.label} title={t.label} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors text-lg active:scale-90">{t.icon}</button>
                  ))}
                </div>
              </>
            )}

            {/* ── STATUS mode ── */}
            {composeMode === "status" && (
              <div className="px-4 pb-4">
                {/* Live preview */}
                <div className={`mt-3 h-36 rounded-2xl bg-gradient-to-br ${statusColor} flex items-center justify-center px-4 shadow-lg`}>
                  <p className="text-white font-bold text-center text-base leading-snug break-words">
                    {draftText || <span className="opacity-50 font-normal text-sm">Your status preview…</span>}
                  </p>
                </div>

                {/* Text input */}
                <div className="mt-3 flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-2.5">
                  <input ref={statusInputRef} type="text" placeholder="Write your status…" value={draftText}
                    onChange={(e) => setDraftText(e.target.value)} maxLength={80}
                    className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none" />
                  <span className="text-[10px] text-gray-400 shrink-0">{draftText.length}/80</span>
                </div>

                {/* Color picker */}
                <div className="mt-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Background</p>
                  <div className="flex gap-2">
                    {STATUS_COLORS.map((sc) => (
                      <button key={sc.id} onClick={() => setStatusColor(sc.cls)}
                        className={`w-9 h-9 rounded-xl bg-gradient-to-br ${sc.cls} transition-all active:scale-90 ${statusColor === sc.cls ? "ring-2 ring-offset-2 ring-blue-500 scale-110" : "hover:scale-105"}`} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Status viewer ── */}
      {viewedStatus && (
        <>
          <div className="fixed inset-0 z-50 bg-black/80" onClick={() => setViewedStatus(null)} />
          <div className={`fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 h-64 rounded-3xl bg-gradient-to-br ${viewedStatus.bg} flex flex-col items-center justify-center px-6 shadow-2xl`}>
            <button onClick={() => setViewedStatus(null)} className="absolute top-4 right-4 w-8 h-8 bg-black/20 rounded-full flex items-center justify-center">
              <X size={16} className="text-white" />
            </button>
            <p className="text-white font-bold text-xl text-center leading-snug">{viewedStatus.text}</p>
            <p className="text-white/70 text-xs mt-3">{viewedStatus.user} · {viewedStatus.time}</p>
          </div>
        </>
      )}

      {/* ── Live Campaign Sheet ── */}
      {showCampaign && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[3px]" onClick={() => setShowCampaign(false)} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[390px] max-w-full z-50 bg-white rounded-t-3xl shadow-2xl flex flex-col" style={{ maxHeight: "90vh" }}>

            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-1 pb-3 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-gray-900">Live Campaign</h3>
                  <span className="flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> LIVE
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">Maharashtra · Lok Sabha Campaign 2026</p>
              </div>
              <button onClick={() => setShowCampaign(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">
                <X size={15} className="text-gray-600" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex px-3 gap-1 pb-2 overflow-x-auto scrollbar-hide shrink-0">
              {CAMPAIGN_TABS.map((t) => {
                const Icon = t.icon;
                const active = campaignTab === t.id;
                return (
                  <button key={t.id} onClick={() => { setCampaignTab(t.id); setCampaignSearch(""); }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${active ? "bg-blue-600 text-white shadow-md" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                    <Icon size={13} />{t.label}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="px-4 pb-2 shrink-0">
              <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-3 py-2">
                <Search size={14} className="text-gray-400 shrink-0" />
                <input type="text" placeholder="Search…" value={campaignSearch} onChange={(e) => setCampaignSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none" />
              </div>
            </div>

            {/* ── BOOTH MONITORING ── */}
            {campaignTab === "booth" && (
              <div className="overflow-y-auto flex-1 px-4 pb-6 space-y-3">
                {/* Summary pills */}
                <div className="flex gap-2 flex-wrap">
                  {[{ label: "Active", val: BOOTHS.filter(b=>b.status==="active").length,   color: "bg-green-100 text-green-700" },
                    { label: "Alert",  val: BOOTHS.filter(b=>b.status==="alert").length,    color: "bg-orange-100 text-orange-700" },
                    { label: "Inactive",val:BOOTHS.filter(b=>b.status==="inactive").length, color: "bg-gray-100 text-gray-500" },
                  ].map(p=>(
                    <span key={p.label} className={`text-[11px] font-bold px-3 py-1 rounded-full ${p.color}`}>{p.label}: {p.val}</span>
                  ))}
                </div>
                {BOOTHS.filter(b => b.number.toLowerCase().includes(campaignSearch.toLowerCase()) || b.location.toLowerCase().includes(campaignSearch.toLowerCase())).map((b) => (
                  <div key={b.id} className={`rounded-2xl border p-3 ${b.status==="active" ? "border-green-200 bg-green-50" : b.status==="alert" ? "border-orange-200 bg-orange-50" : "border-gray-200 bg-gray-50"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${b.status==="active" ? "bg-green-600" : b.status==="alert" ? "bg-orange-500" : "bg-gray-400"}`}>
                          <MonitorCheck size={16} className="text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-gray-900">{b.number}</p>
                          <p className="text-[10px] text-gray-500">{b.location}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${b.status==="active" ? "bg-green-200 text-green-800" : b.status==="alert" ? "bg-orange-200 text-orange-800" : "bg-gray-200 text-gray-600"}`}>
                        {b.status==="active" ? "● Active" : b.status==="alert" ? "⚠ Alert" : "○ Inactive"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-2 text-center">
                      {[{l:"Volunteers", v:b.volunteers},{l:"Voters", v:b.totalVoters},{l:"Covered", v:`${b.covered}%`}].map(s=>(
                        <div key={s.l} className="bg-white/80 rounded-xl py-1.5">
                          <p className="font-bold text-sm text-gray-900">{s.v}</p>
                          <p className="text-[9px] text-gray-400">{s.l}</p>
                        </div>
                      ))}
                    </div>
                    <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${b.covered>70?"bg-green-500":b.covered>40?"bg-orange-400":"bg-red-400"}`} style={{width:`${b.covered}%`}} />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1.5">Agent: <span className="font-semibold text-gray-700">{b.agent}</span></p>
                  </div>
                ))}
              </div>
            )}

            {/* ── VOLUNTEER TRACKING ── */}
            {campaignTab === "volunteer" && (
              <div className="overflow-y-auto flex-1 px-4 pb-6 space-y-2">
                <div className="flex gap-2 flex-wrap mb-1">
                  {[{l:"Active",val:VOLUNTEERS.filter(v=>v.status==="active").length,c:"bg-green-100 text-green-700"},
                    {l:"On Break",val:VOLUNTEERS.filter(v=>v.status==="break").length,c:"bg-yellow-100 text-yellow-700"},
                    {l:"Absent",val:VOLUNTEERS.filter(v=>v.status==="absent").length,c:"bg-red-100 text-red-700"},
                  ].map(p=><span key={p.l} className={`text-[11px] font-bold px-3 py-1 rounded-full ${p.c}`}>{p.l}: {p.val}</span>)}
                </div>
                {VOLUNTEERS.filter(v => v.name.toLowerCase().includes(campaignSearch.toLowerCase()) || v.area.toLowerCase().includes(campaignSearch.toLowerCase())).map((v) => (
                  <div key={v.id} className="bg-gray-50 rounded-2xl p-3 border border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm ${v.status==="active"?"bg-gradient-to-br from-green-600 to-emerald-500":v.status==="break"?"bg-gradient-to-br from-yellow-500 to-orange-400":"bg-gradient-to-br from-gray-400 to-gray-500"}`}>
                        {v.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-gray-900 truncate">{v.name}</p>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${v.status==="active"?"bg-green-100 text-green-700":v.status==="break"?"bg-yellow-100 text-yellow-700":"bg-red-100 text-red-700"}`}>
                            {v.status==="active"?"● Active":v.status==="break"?"◐ Break":"○ Absent"}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500">{v.designation}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><MapPin size={9}/>{v.area}</span>
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Clock size={9}/>{v.checkin}</span>
                          <span className="text-[10px] text-blue-600 font-bold">{v.tasks} tasks</span>
                        </div>
                      </div>
                      <button className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <PhoneCall size={13} className="text-green-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── CAMPAIGN LOCATIONS ── */}
            {campaignTab === "locations" && (
              <div className="overflow-y-auto flex-1 px-4 pb-6 space-y-3">
                {CAMPAIGN_LOCATIONS.filter(l => l.name.toLowerCase().includes(campaignSearch.toLowerCase()) || l.district.toLowerCase().includes(campaignSearch.toLowerCase())).map((loc) => (
                  <div key={loc.id} className={`rounded-2xl border overflow-hidden ${loc.status==="live"?"border-green-300":"loc.status==='completed'"?"border-gray-200":"border-blue-200"}`}>
                    <div className={`px-3 py-2 flex items-center justify-between ${loc.status==="live"?"bg-gradient-to-r from-green-500 to-emerald-500":loc.status==="completed"?"bg-gradient-to-r from-gray-400 to-gray-500":"bg-gradient-to-r from-blue-600 to-cyan-500"}`}>
                      <div className="flex items-center gap-2">
                        <Navigation size={14} className="text-white" />
                        <span className="text-white font-bold text-xs">{loc.type}</span>
                      </div>
                      <span className="text-white/90 text-[10px] font-bold uppercase">
                        {loc.status==="live"?"● Live":loc.status==="completed"?"✓ Done":"◷ Upcoming"}
                      </span>
                    </div>
                    <div className="p-3 bg-white">
                      <p className="font-bold text-sm text-gray-900 mb-1">{loc.name}</p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-[11px] text-gray-500 flex items-center gap-1"><MapPin size={10}/>{loc.district}</span>
                        <span className="text-[11px] text-gray-500 flex items-center gap-1"><Calendar size={10}/>{loc.date}</span>
                        <span className="text-[11px] text-gray-500 flex items-center gap-1"><Clock size={10}/>{loc.time}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[11px] text-gray-600">Coordinator: <span className="font-bold text-gray-800">{loc.coordinator}</span></span>
                        {loc.attendees>0 && <span className="text-[11px] font-bold text-blue-600">👥 {loc.attendees.toLocaleString()} exp.</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── SURVEY & FEEDBACK ── */}
            {campaignTab === "survey" && (
              <div className="overflow-y-auto flex-1 px-4 pb-6 space-y-3">
                {/* Total responses */}
                <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl p-4 text-white">
                  <p className="text-xs font-semibold opacity-80 mb-1">Total Responses</p>
                  <p className="text-3xl font-black">{SURVEYS.reduce((s,sv)=>s+sv.responses,0).toLocaleString()}</p>
                  <p className="text-xs opacity-70 mt-0.5">Across {SURVEYS.length} active surveys</p>
                </div>
                {SURVEYS.filter(s => s.title.toLowerCase().includes(campaignSearch.toLowerCase())).map((sv) => {
                  const pct = Math.round((sv.responses/sv.target)*100);
                  return (
                    <div key={sv.id} className="bg-gray-50 rounded-2xl border border-gray-200 p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-bold text-sm text-gray-900 flex-1">{sv.title}</p>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Star size={12} className="text-yellow-500 fill-yellow-500" />
                          <span className="text-xs font-bold text-gray-700">{sv.rating}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-wrap mb-2">
                        {sv.tags.map(tag=><span key={tag} className="text-[10px] bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded-full">{tag}</span>)}
                      </div>
                      <div className="mb-1 flex justify-between text-[10px] font-bold text-gray-500">
                        <span>{sv.responses.toLocaleString()} responses</span><span>{pct}% of {sv.target.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full" style={{width:`${pct}%`}} />
                      </div>
                      <div className="flex items-start gap-1.5 bg-blue-50 rounded-xl px-2.5 py-2">
                        <TrendingUp size={11} className="text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-blue-700 font-medium leading-snug">{sv.insight}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── VOTER LIST ── */}
            {campaignTab === "voters" && (
              <div className="overflow-y-auto flex-1 px-4 pb-6 space-y-2">
                <div className="flex gap-2 flex-wrap mb-1">
                  {[{l:"Contacted",val:VOTERS.filter(v=>v.status==="contacted").length,c:"bg-green-100 text-green-700"},
                    {l:"Pending",val:VOTERS.filter(v=>v.status==="pending").length,c:"bg-orange-100 text-orange-700"},
                  ].map(p=><span key={p.l} className={`text-[11px] font-bold px-3 py-1 rounded-full ${p.c}`}>{p.l}: {p.val}</span>)}
                </div>
                {VOTERS.filter(v => v.name.toLowerCase().includes(campaignSearch.toLowerCase()) || v.booth.toLowerCase().includes(campaignSearch.toLowerCase()) || v.area.toLowerCase().includes(campaignSearch.toLowerCase())).map((v) => (
                  <div key={v.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3 border border-gray-100 hover:bg-gray-100 transition-colors">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-[11px] shrink-0 ${v.gender==="F"?"bg-gradient-to-br from-pink-500 to-rose-400":"bg-gradient-to-br from-blue-600 to-blue-400"}`}>
                      {v.name.split(" ").map(n=>n[0]).slice(0,2).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-gray-900 truncate">{v.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-400">{v.booth}</span>
                        <span className="text-[10px] text-gray-400">·</span>
                        <span className="text-[10px] text-gray-400">{v.area}</span>
                        <span className="text-[10px] text-gray-400">·</span>
                        <span className="text-[10px] text-gray-400">Age {v.age}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${v.status==="contacted"?"bg-green-100 text-green-700":"bg-orange-100 text-orange-600"}`}>
                        {v.status==="contacted"?"✓ Done":"Pending"}
                      </span>
                      <span className="text-[10px] text-gray-400">📞 {v.phone}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Analytics Full Hierarchy Sheet ── */}
      {showAnalytics && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[3px]" onClick={() => setShowAnalytics(false)} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[390px] max-w-full z-50 bg-white rounded-t-3xl shadow-2xl flex flex-col" style={{ maxHeight: "92vh" }}>

            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 shrink-0">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Full Hierarchy</p>
                <h3 className="font-bold text-base text-gray-900 leading-tight">Analytics</h3>
                <p className="text-[11px] text-gray-400">
                  {hLoadingD ? "Loading…" : `${hDistricts.length} districts · ${hDistricts.reduce((s,d)=>s+d.taluka_count,0)} talukas · ${hDistricts.reduce((s,d)=>s+d.village_count,0).toLocaleString()} villages`}
                </p>
              </div>
              <button onClick={() => setShowAnalytics(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors shrink-0">
                <X size={15} className="text-gray-600" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-2.5 shrink-0">
              <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-3 py-2.5">
                <Search size={14} className={`shrink-0 ${hSearching ? "text-blue-400 animate-pulse" : "text-gray-400"}`} />
                <input type="text" placeholder="Search districts, talukas, villages…"
                  value={analyticsSearch} onChange={(e) => setAnalyticsSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none" />
                {analyticsSearch && (
                  <button onClick={() => setAnalyticsSearch("")} className="text-gray-400 hover:text-gray-600"><X size={13} /></button>
                )}
              </div>
            </div>

            {/* Expand/Collapse all */}
            <div className="flex gap-2 px-4 pb-2 shrink-0">
              <button onClick={() => { setCollapsedDistricts(new Set()); setCollapsedTalukas(new Set()); }}
                className="text-[11px] font-bold text-blue-600 hover:underline">Expand All</button>
              <span className="text-gray-300">·</span>
              <button onClick={() => {
                setCollapsedDistricts(new Set(hDistricts.map(d => d.code)));
                setCollapsedTalukas(new Set(Object.values(hTalukas).flat().map(t => t.code)));
              }} className="text-[11px] font-bold text-gray-400 hover:text-gray-600 hover:underline">Collapse All</button>
            </div>

            {/* Tree */}
            <div className="overflow-y-auto flex-1 pb-8">

              {/* Search results mode */}
              {analyticsSearch.trim() ? (
                hSearching ? (
                  <div className="text-center py-10 text-gray-400 text-sm">Searching…</div>
                ) : hSearchResults.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm">No results for "{analyticsSearch}"</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {hSearchResults.map((r, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${r.type==="district"?"bg-gradient-to-br from-blue-600 to-cyan-600":r.type==="taluka"?"bg-gradient-to-br from-purple-600 to-pink-500":"bg-gradient-to-br from-emerald-500 to-green-600"}`}>
                          {r.type==="district"?<Landmark size={13} className="text-white"/>:r.type==="taluka"?<MapPin size={13} className="text-white"/>:<TreePine size={13} className="text-white"/>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs text-gray-900">{r.name}</p>
                          <p className="text-[10px] text-gray-400 truncate">
                            {r.type==="village"?`${r.taluka_name} · ${r.district_name}`:r.type==="taluka"?`${r.district_name} · ${r.village_count} villages`:`${r.village_count?.toLocaleString()} villages`}
                          </p>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${r.type==="district"?"bg-blue-100 text-blue-700":r.type==="taluka"?"bg-purple-100 text-purple-700":"bg-green-100 text-green-700"}`}>{r.type}</span>
                      </div>
                    ))}
                  </div>
                )
              ) : hLoadingD ? (
                <div className="text-center py-16 text-gray-400">
                  <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm">Loading districts…</p>
                </div>
              ) : (
                /* Normal tree mode */
                hDistricts.map((district) => {
                  const districtCollapsed = collapsedDistricts.has(district.code);
                  const talukas = hTalukas[district.code];
                  const loadingTalukas = hLoadingT.has(district.code);
                  return (
                    <div key={district.code} className="border-b border-gray-100 last:border-0">
                      {/* ── District row ── */}
                      <button
                        onClick={() => {
                          setCollapsedDistricts(prev => {
                            const next = new Set(prev);
                            if (next.has(district.code)) next.delete(district.code);
                            else next.add(district.code);
                            return next;
                          });
                          if (districtCollapsed) fetchTalukas(district.code);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-left hover:from-blue-700 hover:to-cyan-700 transition-colors"
                      >
                        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                          <Landmark size={17} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm leading-tight">{district.name} District</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[10px] text-blue-100">🏘️ {district.village_count.toLocaleString()} villages</span>
                            {district.leader_count > 0 && <span className="text-[10px] text-yellow-300 font-bold">⚡ {district.leader_count} leaders</span>}
                          </div>
                        </div>
                        <ChevronRight size={15} className={`text-white/70 transition-transform ${districtCollapsed ? "" : "rotate-90"}`} />
                      </button>

                      {/* Talukas */}
                      {!districtCollapsed && (
                        loadingTalukas ? (
                          <div className="text-center py-4 text-gray-400 text-xs">Loading talukas…</div>
                        ) : talukas ? talukas.map((taluka) => {
                          const talukaCollapsed = collapsedTalukas.has(taluka.code);
                          const villages = hVillages[taluka.code];
                          const loadingVillages = hLoadingV.has(taluka.code);
                          return (
                            <div key={taluka.code}>
                              {/* ── Taluka row ── */}
                              <button
                                onClick={() => {
                                  setCollapsedTalukas(prev => {
                                    const next = new Set(prev);
                                    if (next.has(taluka.code)) next.delete(taluka.code);
                                    else next.add(taluka.code);
                                    return next;
                                  });
                                  if (talukaCollapsed) fetchVillages(taluka.code);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 bg-purple-50 border-b border-purple-100 text-left hover:bg-purple-100 transition-colors"
                              >
                                <div className="w-1 self-stretch bg-blue-400 rounded-full shrink-0 mx-1" />
                                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-500 rounded-lg flex items-center justify-center shrink-0">
                                  <MapPin size={14} className="text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-xs text-purple-900">{taluka.name} Taluka</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-purple-500">🏘️ {taluka.total_villages} villages</span>
                                    {taluka.leader_count > 0 && <span className="text-[10px] text-green-600 font-bold">⚡ {taluka.leader_count}</span>}
                                  </div>
                                </div>
                                <ChevronRight size={13} className={`text-purple-400 transition-transform ${talukaCollapsed ? "" : "rotate-90"}`} />
                              </button>

                              {/* Villages */}
                              {!talukaCollapsed && (
                                loadingVillages ? (
                                  <div className="text-center py-3 text-gray-400 text-xs">Loading villages…</div>
                                ) : villages ? villages.map((village) => {
                                  const isUrban = village.type === "urban";
                                  return (
                                    <div key={village.code} className={`border-b border-gray-50 ${isUrban ? "bg-blue-50/40" : "bg-green-50/40"}`}>
                                      <div className="flex items-center gap-2.5 px-4 py-2.5">
                                        <div className="w-1 self-stretch bg-purple-300 rounded-full shrink-0 ml-3" />
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${isUrban ? "bg-gradient-to-br from-blue-500 to-cyan-500" : "bg-gradient-to-br from-emerald-500 to-green-600"}`}>
                                          {isUrban ? <Building2 size={13} className="text-white" /> : <TreePine size={13} className="text-white" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <p className="font-bold text-xs text-gray-900">{village.name}</p>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${isUrban ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                                              {isUrban ? "Urban" : "Rural"}
                                            </span>
                                          </div>
                                          {village.population > 0 && (
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                              <span className="text-[10px] text-gray-500 font-medium">Janagana:</span>
                                              <span className="text-[10px] font-black text-gray-800">{village.population.toLocaleString()}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      {village.leaders.length > 0 && (
                                        <div className="pb-2 px-4 ml-[52px] space-y-1.5">
                                          {village.leaders.map((leader, li) => (
                                            <div key={li} className="flex items-center gap-2">
                                              <div className={`w-1 self-stretch rounded-full shrink-0 ${isUrban ? "bg-blue-200" : "bg-green-200"}`} />
                                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-black shadow-sm shrink-0 ${isUrban ? "bg-gradient-to-br from-blue-500 to-cyan-500" : "bg-gradient-to-br from-emerald-500 to-green-600"}`}>
                                                {leader.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-bold text-gray-800 truncate">{leader.name}</p>
                                                <p className="text-[10px] text-gray-400 truncate">{leader.designation}</p>
                                              </div>
                                              <CheckCircle2 size={11} className={`shrink-0 ${isUrban ? "text-blue-400" : "text-emerald-400"}`} />
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }) : null
                              )}
                            </div>
                          );
                        }) : null
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Members Sheet ── */}
      {showMembers && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[3px]" onClick={() => { setShowMembers(false); setMemberSearch(""); }} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[390px] max-w-full z-50 bg-white rounded-t-3xl shadow-2xl flex flex-col" style={{ maxHeight: "82vh" }}>

            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="font-bold text-base text-gray-900">Members</h3>
                <p className="text-[11px] text-gray-400">{MEMBERS.length} total · {MEMBERS.filter(m => m.verified).length} verified</p>
              </div>
              <button onClick={() => { setShowMembers(false); setMemberSearch(""); }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                <X size={15} className="text-gray-600" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 shrink-0">
              <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-3 py-2.5">
                <Search size={15} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search members…"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
                />
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 px-4 pb-6 space-y-2">
              {MEMBERS.filter((m) =>
                m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
                m.role.toLowerCase().includes(memberSearch.toLowerCase()) ||
                m.district.toLowerCase().includes(memberSearch.toLowerCase())
              ).map((m) => (
                <div key={m.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3 hover:bg-gray-100 transition-colors cursor-pointer active:scale-[0.98]">
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${m.color} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}>
                    {m.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-sm text-gray-900 truncate">{m.name}</p>
                      {m.verified && <CheckCircle2 size={13} className="text-blue-500 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-gray-500 truncate">{m.role}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin size={10} className="text-gray-400 shrink-0" />
                      <p className="text-[10px] text-gray-400">{m.district}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${m.verified ? "bg-blue-50 text-blue-600" : "bg-gray-200 text-gray-500"}`}>
                    {m.verified ? "Verified" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Feed ── */}
      <div className="mt-2 space-y-2 pb-6 px-2">
        {posts.map((post) => (
          <PostCard key={post.id} post={post}
            liked={liked.has(post.id)} likesCount={likeCounts[post.id] ?? post.likes}
            bookmarked={bookmarked.has(post.id)}
            expanded={expandedPost === post.id}
            onToggleExpand={() => setExpandedPost((p) => p === post.id ? null : post.id)}
            onLike={() => toggleLike(post.id)}
            onBookmark={() => toggleBookmark(post.id)}
            token={token}
            currentUserId={user?.id} />
        ))}
      </div>

      {/* ── Post toast ── */}
      {postToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
          <div className={`px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold text-white flex items-center gap-2 ${postToast.startsWith("Post shared") ? "bg-green-600" : "bg-red-500"}`}>
            {postToast.startsWith("Post shared") ? "✓" : "✕"} {postToast}
          </div>
        </div>
      )}
    </div>
  );
}
