import { NavLink, Outlet, useNavigate } from "react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  LayoutDashboard, Users, BarChart2, MapPin, UserCheck,
  ClipboardList, MonitorCheck, LogOut, ChevronRight, Shield, Megaphone, Rss,
  UserPlus, UserCheck2, X, Loader, MessageCircle, Send, Check, CheckCheck,
  Search, Minus, Smile, ImageIcon, Paperclip, FileText, Heart,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

/* ─── Types ──────────────────────────────────────────────────── */
const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  super_admin:     { label: "Super Admin",     color: "bg-red-100 text-red-700"       },
  state_leader:    { label: "State Leader",    color: "bg-blue-100 text-blue-700"     },
  district_leader: { label: "District Leader", color: "bg-purple-100 text-purple-700" },
  observer:        { label: "Observer",        color: "bg-gray-100 text-gray-600"     },
};

const ROLE_LABEL_STR: Record<string, string> = {
  super_admin: "Super Admin", state_leader: "State Leader",
  district_leader: "District Leader", taluka_leader: "Taluka Leader",
  village_leader: "Village Leader", booth_leader: "Booth Leader",
  booth_worker: "Booth Worker", karyakarta: "Karyakarta", observer: "Observer",
};

const GRAD: Record<string, string> = {
  super_admin: "from-blue-700 to-blue-500", state_leader: "from-purple-600 to-pink-500",
  district_leader: "from-emerald-600 to-teal-500", taluka_leader: "from-orange-500 to-amber-400",
  village_leader: "from-cyan-600 to-blue-500", booth_leader: "from-rose-500 to-pink-500",
  booth_worker: "from-indigo-600 to-violet-500", karyakarta: "from-teal-600 to-cyan-500",
};

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime(), m = Math.floor(d / 60000);
  if (m < 1) return "now"; if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

interface NavItem { to: string; label: string; icon: React.ElementType; roles: string[] }
const NAV: NavItem[] = [
  { to: "/web",            label: "Dashboard",   icon: LayoutDashboard, roles: ["super_admin","state_leader","district_leader","observer"] },
  { to: "/web/feed",       label: "Social Feed", icon: Rss,             roles: ["super_admin","state_leader","district_leader","observer"] },
  { to: "/web/users",      label: "Users",       icon: Users,           roles: ["super_admin","state_leader"] },
  { to: "/web/analytics",  label: "Analytics",   icon: BarChart2,       roles: ["super_admin","state_leader","district_leader","observer"] },
  { to: "/web/districts",  label: "Districts",   icon: MapPin,          roles: ["super_admin","state_leader","observer"] },
  { to: "/web/volunteers", label: "Volunteers",  icon: UserCheck,       roles: ["super_admin","state_leader","district_leader"] },
  { to: "/web/booths",     label: "Booths",      icon: MonitorCheck,    roles: ["super_admin","state_leader","district_leader"] },
  { to: "/web/surveys",    label: "Surveys",     icon: ClipboardList,   roles: ["super_admin","state_leader","district_leader","observer"] },
  { to: "/web/campaign",   label: "Campaign",    icon: Megaphone,       roles: ["super_admin","state_leader"] },
];

type FriendReq = { id: number; from_id: number; from_name: string; from_role: string; created_at: string };

interface Conversation {
  partner_id: number; partner_name: string; partner_role: string;
  last_message: string; last_message_at: string; last_sender_id: number; unread_count: number;
}
const EMOJIS = [
  "😀","😂","😅","🤣","😊","😇","🙂","😉","😍","🥰","😘","😎","🤩","🥳",
  "😔","😢","😭","😤","😠","😱","😮","🤔","🤗","🥺","😋","😜","🤪","😏",
  "👍","👎","👋","🤝","🙌","👏","💪","🙏","👌","🤞","🫡",
  "❤️","💛","💚","💙","💜","🖤","💔","💯",
  "🔥","✨","⭐","🌟","🎉","🎊","🎁","🎯","🚀","💡","🌈","🎵",
];

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍", "🙏", "🔥"];

interface WMessage {
  id: number; from_user_id: number; to_user_id: number;
  content: string | null; is_read: boolean; created_at: string;
  media_url?: string | null; media_type?: string | null; media_name?: string | null;
  reactions?: { emoji: string; user_id: number }[];
}
interface ChatBubble {
  partnerId: number; partnerName: string; partnerRole: string;
  messages: WMessage[]; loading: boolean; minimized: boolean;
  inputText: string; sending: boolean;
}

/* ─── Component ──────────────────────────────────────────────── */
export default function WebLayout() {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();

  /* ── Friend requests ── */
  const [showFriendReqs, setShowFriendReqs] = useState(false);
  const [friendReqList,  setFriendReqList]  = useState<FriendReq[]>([]);
  const [frLoading,      setFrLoading]      = useState(false);
  const [frActioning,    setFrActioning]    = useState<Set<number>>(new Set());

  const authHdr = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const fetchFriendReqs = useCallback(() => {
    if (!token) return;
    setFrLoading(true);
    fetch("/api/friends/requests", { headers: authHdr() })
      .then(r => r.ok ? r.json() : [])
      .then(setFriendReqList).catch(() => {}).finally(() => setFrLoading(false));
  }, [token, authHdr]);

  useEffect(() => { fetchFriendReqs(); }, [fetchFriendReqs]);

  async function handleFriendReqAction(reqId: number, status: "accepted" | "declined") {
    setFrActioning(prev => new Set([...prev, reqId]));
    try {
      await fetch(`/api/friends/requests/${reqId}`, {
        method: "PATCH",
        headers: { ...authHdr(), "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setFriendReqList(prev => prev.filter(r => r.id !== reqId));
    } catch { /* silent */ }
    finally { setFrActioning(prev => { const s = new Set(prev); s.delete(reqId); return s; }); }
  }

  /* ── Messenger ── */
  const [showMsgPanel,   setShowMsgPanel]   = useState(false);
  const [conversations,  setConversations]  = useState<Conversation[]>([]);
  const [convLoading,    setConvLoading]    = useState(false);
  const [convSearch,     setConvSearch]     = useState("");
  const [chatBubbles,    setChatBubbles]    = useState<ChatBubble[]>([]);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalUnreadMsgs = conversations.reduce((a, c) => a + c.unread_count, 0);

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    setConvLoading(true);
    try {
      const res = await fetch("/api/messages/conversations", { headers: authHdr() });
      if (res.ok) setConversations(await res.json());
    } finally { setConvLoading(false); }
  }, [token, authHdr]);

  useEffect(() => {
    if (showMsgPanel) fetchConversations();
  }, [showMsgPanel, fetchConversations]);

  /* Poll messages for all open bubbles every 4s */
  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      if (!token) return;
      const openBubbles = chatBubbles.filter(b => !b.minimized);
      for (const bubble of openBubbles) {
        const res = await fetch(`/api/messages/${bubble.partnerId}`, { headers: authHdr() }).catch(() => null);
        if (res?.ok) {
          const msgs: WMessage[] = await res.json();
          setChatBubbles(prev => prev.map(b =>
            b.partnerId === bubble.partnerId ? { ...b, messages: msgs } : b
          ));
          // mark read
          fetch(`/api/messages/${bubble.partnerId}/read`, { method: "PATCH", headers: authHdr() }).catch(() => {});
        }
      }
      // Refresh unread counts in conversation list
      const convRes = await fetch("/api/messages/conversations", { headers: authHdr() }).catch(() => null);
      if (convRes?.ok) setConversations(await convRes.json());
    }, 4000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [chatBubbles, token, authHdr]);

  async function openChat(partnerId: number, partnerName: string, partnerRole: string) {
    setShowMsgPanel(false);
    // If already open, un-minimize
    if (chatBubbles.find(b => b.partnerId === partnerId)) {
      setChatBubbles(prev => prev.map(b => b.partnerId === partnerId ? { ...b, minimized: false } : b));
      return;
    }
    // Max 3 bubbles
    const newBubble: ChatBubble = {
      partnerId, partnerName, partnerRole,
      messages: [], loading: true, minimized: false, inputText: "", sending: false,
    };
    setChatBubbles(prev => [...prev.slice(-2), newBubble]);

    // Fetch messages
    const res = await fetch(`/api/messages/${partnerId}`, { headers: authHdr() }).catch(() => null);
    const msgs: WMessage[] = res?.ok ? await res.json() : [];
    setChatBubbles(prev => prev.map(b =>
      b.partnerId === partnerId ? { ...b, messages: msgs, loading: false } : b
    ));
    // Mark read
    fetch(`/api/messages/${partnerId}/read`, { method: "PATCH", headers: authHdr() }).catch(() => {});
    // Update conversation unread
    setConversations(prev => prev.map(c => c.partner_id === partnerId ? { ...c, unread_count: 0 } : c));
  }

  function closeBubble(partnerId: number) {
    setChatBubbles(prev => prev.filter(b => b.partnerId !== partnerId));
  }

  function toggleMinimize(partnerId: number) {
    setChatBubbles(prev => prev.map(b =>
      b.partnerId === partnerId ? { ...b, minimized: !b.minimized } : b
    ));
  }

  function setBubbleInput(partnerId: number, text: string) {
    setChatBubbles(prev => prev.map(b =>
      b.partnerId === partnerId ? { ...b, inputText: text } : b
    ));
  }

  async function sendBubbleMessage(partnerId: number) {
    const bubble = chatBubbles.find(b => b.partnerId === partnerId);
    if (!bubble || !bubble.inputText.trim() || bubble.sending) return;
    const text = bubble.inputText.trim();
    setChatBubbles(prev => prev.map(b =>
      b.partnerId === partnerId ? { ...b, inputText: "", sending: true } : b
    ));
    try {
      const res = await fetch(`/api/messages/${partnerId}`, {
        method: "POST",
        headers: { ...authHdr(), "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const msg: WMessage = await res.json();
        setChatBubbles(prev => prev.map(b =>
          b.partnerId === partnerId ? { ...b, messages: [...b.messages, msg], sending: false } : b
        ));
        // Update conversation last message
        setConversations(prev => {
          const exists = prev.find(c => c.partner_id === partnerId);
          const updated = { partner_id: partnerId, partner_name: bubble.partnerName,
            partner_role: bubble.partnerRole, last_message: text,
            last_message_at: msg.created_at, last_sender_id: user?.id ?? 0, unread_count: 0 };
          if (exists) return [updated, ...prev.filter(c => c.partner_id !== partnerId)];
          return [updated, ...prev];
        });
      } else {
        setChatBubbles(prev => prev.map(b => b.partnerId === partnerId ? { ...b, sending: false } : b));
      }
    } catch {
      setChatBubbles(prev => prev.map(b => b.partnerId === partnerId ? { ...b, sending: false } : b));
    }
  }

  async function sendBubbleMedia(partnerId: number, file: File) {
    if (!token) return;
    const form = new FormData();
    form.append("file", file);
    const uploadRes = await fetch("/api/messages/upload", {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form,
    }).catch(() => null);
    if (!uploadRes?.ok) return;
    const { url, media_type, original_name } = await uploadRes.json();
    const res = await fetch(`/api/messages/${partnerId}`, {
      method: "POST",
      headers: { ...authHdr(), "Content-Type": "application/json" },
      body: JSON.stringify({ content: null, media_url: url, media_type, media_name: original_name }),
    }).catch(() => null);
    if (res?.ok) {
      const msg: WMessage = await res.json();
      setChatBubbles(prev => prev.map(b =>
        b.partnerId === partnerId ? { ...b, messages: [...b.messages, msg] } : b
      ));
    }
  }

  async function toggleBubbleReaction(partnerId: number, msgId: number, emoji: string) {
    const res = await fetch(`/api/messages/${msgId}/reactions`, {
      method: "POST",
      headers: { ...authHdr(), "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    }).catch(() => null);
    if (!res?.ok) return;
    const { action } = await res.json();
    setChatBubbles(prev => prev.map(b => {
      if (b.partnerId !== partnerId) return b;
      const messages = b.messages.map(m => {
        if (m.id !== msgId) return m;
        const reactions = m.reactions ?? [];
        const updated = action === "added"
          ? [...reactions, { emoji, user_id: user?.id ?? 0 }]
          : reactions.filter(r => !(r.emoji === emoji && r.user_id === user?.id));
        return { ...m, reactions: updated };
      });
      return { ...b, messages };
    }));
  }

  /* ── Break out of mobile container ── */
  useEffect(() => {
    const root = document.getElementById("root");
    const body = document.body;
    const prev = { w: root?.style.width ?? "", mw: root?.style.maxWidth ?? "",
                   sh: root?.style.boxShadow ?? "", ov: root?.style.overflow ?? "", bg: body.style.background ?? "" };
    if (root) { root.style.width = "100%"; root.style.maxWidth = "100vw";
                root.style.boxShadow = "none"; root.style.overflow = "hidden"; }
    body.style.background = "#f3f4f6";
    return () => {
      if (root) { root.style.width = prev.w; root.style.maxWidth = prev.mw;
                  root.style.boxShadow = prev.sh; root.style.overflow = prev.ov; }
      body.style.background = prev.bg;
    };
  }, []);

  const role = user?.role ?? "";
  const meta = ROLE_LABELS[role] ?? { label: role, color: "bg-gray-100 text-gray-600" };
  const visibleNav = NAV.filter(n => n.roles.includes(role));
  function handleLogout() { logout(); navigate("/login"); }

  const filteredConvs = conversations.filter(c =>
    c.partner_name.toLowerCase().includes(convSearch.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gray-50 font-sans">

      {/* ── Sidebar ── */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0 shadow-sm">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-700 to-cyan-500 flex items-center justify-center shrink-0">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <p className="font-black text-sm text-gray-900 leading-tight">NCP-SP</p>
            <p className="text-[10px] text-gray-400 font-medium">Campaign Platform</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleNav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/web"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                }`}
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} className={isActive ? "text-blue-600" : "text-gray-400"} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight size={13} className="text-blue-400" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-700 to-cyan-500 flex items-center justify-center text-white font-black text-xs shrink-0">
              {user?.name?.slice(0,2).toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-xs text-gray-900 truncate">{user?.name}</p>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
            <LogOut size={13} />Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-end gap-2 px-6 shrink-0 relative z-30">

          {/* ── Messages button ── */}
          <div className="relative">
            <button
              onClick={() => { setShowMsgPanel(v => !v); setShowFriendReqs(false); }}
              className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                showMsgPanel ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              }`}
            >
              <MessageCircle size={16} />
              <span>Messages</span>
              {totalUnreadMsgs > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {totalUnreadMsgs > 9 ? "9+" : totalUnreadMsgs}
                </span>
              )}
            </button>

            {showMsgPanel && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowMsgPanel(false)} />
                <div className="absolute top-10 right-0 z-40 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col" style={{ maxHeight: 480 }}>
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50 shrink-0">
                    <div className="flex items-center gap-2">
                      <MessageCircle size={15} className="text-blue-600" />
                      <span className="font-bold text-sm text-gray-800">Messages</span>
                    </div>
                    <button onClick={() => setShowMsgPanel(false)}
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">
                      <X size={12} className="text-gray-500" />
                    </button>
                  </div>
                  {/* Search */}
                  <div className="px-3 py-2 border-b border-gray-100 shrink-0">
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" placeholder="Search messages…"
                        value={convSearch} onChange={e => setConvSearch(e.target.value)}
                        className="w-full h-8 pl-8 pr-3 rounded-xl bg-gray-100 text-xs text-gray-700 outline-none placeholder:text-gray-400" />
                    </div>
                  </div>
                  {/* List */}
                  <div className="overflow-y-auto flex-1">
                    {convLoading ? (
                      <div className="py-8 text-center"><Loader size={18} className="animate-spin mx-auto text-blue-400" /></div>
                    ) : filteredConvs.length === 0 ? (
                      <div className="py-10 text-center text-gray-400">
                        <MessageCircle size={28} className="mx-auto mb-2 opacity-20" />
                        <p className="text-xs font-semibold">No conversations yet</p>
                        <p className="text-[11px] mt-0.5 text-gray-300">Send a friend request first</p>
                      </div>
                    ) : (
                      filteredConvs.map(conv => (
                        <button key={conv.partner_id}
                          onClick={() => openChat(conv.partner_id, conv.partner_name, conv.partner_role)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left">
                          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${GRAD[conv.partner_role] ?? "from-gray-400 to-gray-500"} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                            {initials(conv.partner_name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`text-sm font-bold truncate ${conv.unread_count > 0 ? "text-gray-900" : "text-gray-700"}`}>
                                {conv.partner_name}
                              </p>
                              <span className="text-[10px] text-gray-400 shrink-0 ml-1">{timeAgo(conv.last_message_at)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className={`text-xs truncate ${conv.unread_count > 0 ? "text-gray-700 font-semibold" : "text-gray-400"}`}>
                                {conv.last_sender_id === user?.id ? "You: " : ""}{conv.last_message}
                              </p>
                              {conv.unread_count > 0 && (
                                <span className="shrink-0 w-4 h-4 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center ml-1">
                                  {conv.unread_count}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Friend Requests button ── */}
          <div className="relative">
            <button
              onClick={() => { setShowFriendReqs(v => !v); setShowMsgPanel(false); }}
              className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                showFriendReqs ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              }`}
            >
              <UserPlus size={16} />
              <span>Friend Requests</span>
              {friendReqList.length > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {friendReqList.length > 9 ? "9+" : friendReqList.length}
                </span>
              )}
            </button>

            {showFriendReqs && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowFriendReqs(false)} />
                <div className="absolute top-10 right-0 z-40 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50">
                    <div className="flex items-center gap-2">
                      <UserPlus size={15} className="text-blue-600" />
                      <span className="font-bold text-sm text-gray-800">Friend Requests</span>
                      {friendReqList.length > 0 && (
                        <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">{friendReqList.length}</span>
                      )}
                    </div>
                    <button onClick={() => setShowFriendReqs(false)}
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">
                      <X size={12} className="text-gray-500" />
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                    {frLoading ? (
                      <div className="py-8 text-center text-gray-400">
                        <Loader size={20} className="animate-spin mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-medium">Loading…</p>
                      </div>
                    ) : friendReqList.length === 0 ? (
                      <div className="py-10 text-center text-gray-400">
                        <UserPlus size={28} className="mx-auto mb-2 opacity-25" />
                        <p className="text-sm font-semibold">No pending requests</p>
                        <p className="text-xs mt-0.5 text-gray-300">You're all caught up!</p>
                      </div>
                    ) : (
                      friendReqList.map(req => {
                        const ini = req.from_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                        const isActioning = frActioning.has(req.id);
                        return (
                          <div key={req.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                              {ini}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-gray-900 truncate">{req.from_name}</p>
                              <p className="text-[11px] text-gray-400">{ROLE_LABEL_STR[req.from_role] ?? req.from_role}</p>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button onClick={() => handleFriendReqAction(req.id, "accepted")} disabled={isActioning}
                                className="h-7 px-2.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1">
                                {isActioning ? <Loader size={11} className="animate-spin" /> : <UserCheck2 size={12} />}
                                Confirm
                              </button>
                              <button onClick={() => handleFriendReqAction(req.id, "declined")} disabled={isActioning}
                                className="h-7 px-2.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-50">
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
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* ── Facebook-style Chat Bubbles (bottom right) ── */}
      <div className="fixed bottom-0 right-4 flex items-end gap-3 z-50 pointer-events-none">
        {chatBubbles.map((bubble, idx) => (
          <ChatBubbleWidget
            key={bubble.partnerId}
            bubble={bubble}
            currentUserId={user?.id}
            token={token ?? undefined}
            onClose={() => closeBubble(bubble.partnerId)}
            onToggleMinimize={() => toggleMinimize(bubble.partnerId)}
            onInputChange={text => setBubbleInput(bubble.partnerId, text)}
            onSend={() => sendBubbleMessage(bubble.partnerId)}
            onSendMedia={file => sendBubbleMedia(bubble.partnerId, file)}
            onToggleReaction={(msgId, emoji) => toggleBubbleReaction(bubble.partnerId, msgId, emoji)}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Chat Bubble Widget ─────────────────────────────────────── */
function ChatBubbleWidget({
  bubble, currentUserId, token, onClose, onToggleMinimize, onInputChange, onSend, onSendMedia, onToggleReaction,
}: {
  bubble: ChatBubble;
  currentUserId?: number;
  token?: string;
  onClose: () => void;
  onToggleMinimize: () => void;
  onInputChange: (t: string) => void;
  onSend: () => void;
  onSendMedia: (file: File) => void;
  onToggleReaction: (msgId: number, emoji: string) => void;
}) {
  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const imageInputRef   = useRef<HTMLInputElement>(null);
  const docInputRef     = useRef<HTMLInputElement>(null);
  const [showEmoji,     setShowEmoji]     = useState(false);
  const [hoverMsgId,    setHoverMsgId]    = useState<number | null>(null);
  const [reactionMsgId, setReactionMsgId] = useState<number | null>(null);
  const grad = GRAD[bubble.partnerRole] ?? "from-gray-400 to-gray-500";

  useEffect(() => {
    if (!bubble.minimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [bubble.messages, bubble.minimized]);

  return (
    <div className="pointer-events-auto flex flex-col shadow-2xl rounded-t-2xl overflow-hidden border border-gray-200"
      style={{ width: 330, height: 580 }}>

      {/* Header */}
      <div className={`bg-gradient-to-r ${grad} flex items-center gap-3 px-4 py-3 cursor-pointer select-none shrink-0`}
        onClick={onToggleMinimize}>
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold shrink-0">
          {initials(bubble.partnerName)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{bubble.partnerName}</p>
          <p className="text-xs text-white/70">{ROLE_LABEL_STR[bubble.partnerRole] ?? bubble.partnerRole}</p>
        </div>
        <button onClick={e => { e.stopPropagation(); onToggleMinimize(); }}
          className="w-7 h-7 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors text-white">
          <Minus size={14} />
        </button>
        <button onClick={e => { e.stopPropagation(); onClose(); }}
          className="w-7 h-7 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors text-white">
          <X size={14} />
        </button>
      </div>

      {/* Body — hidden when minimized */}
      {!bubble.minimized && (
        <>
          {/* Messages */}
          <div className="bg-white flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">
            {bubble.loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader size={18} className="animate-spin text-blue-400" />
              </div>
            ) : bubble.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                <p className="text-xs font-semibold">No messages yet</p>
                <p className="text-[10px] mt-0.5">Say hi! 👋</p>
              </div>
            ) : (
              bubble.messages.map(msg => {
                const isMine   = msg.from_user_id === currentUserId;
                const reactions = msg.reactions ?? [];
                const iLiked   = reactions.some(r => r.emoji === "❤️" && r.user_id === currentUserId);
                const rxGroups = reactions.reduce((acc, r) => {
                  if (!acc[r.emoji]) acc[r.emoji] = { emoji: r.emoji, count: 0, userIds: [] as number[] };
                  acc[r.emoji].count++;
                  acc[r.emoji].userIds.push(r.user_id);
                  return acc;
                }, {} as Record<string, { emoji: string; count: number; userIds: number[] }>);

                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[82%] flex flex-col">
                      {/* Reaction picker popup */}
                      {reactionMsgId === msg.id && (
                        <div className={`flex gap-0.5 px-1.5 py-1 rounded-full shadow-xl bg-white border border-gray-100 mb-1 ${isMine ? "self-end" : "self-start"}`}
                          onClick={e => e.stopPropagation()}>
                          {REACTION_EMOJIS.map(e => (
                            <button key={e} onClick={() => { onToggleReaction(msg.id, e); setReactionMsgId(null); }}
                              className={`text-base w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-90 transition-all ${
                                reactions.some(r => r.emoji === e && r.user_id === currentUserId) ? "bg-blue-50 ring-1 ring-blue-300" : ""
                              }`}>
                              {e}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Bubble with hover reaction button */}
                      <div className="relative group"
                        onMouseEnter={() => setHoverMsgId(msg.id)}
                        onMouseLeave={() => setHoverMsgId(null)}>

                        {/* Hover reaction trigger */}
                        {hoverMsgId === msg.id && reactionMsgId !== msg.id && (
                          <button
                            onClick={e => { e.stopPropagation(); setReactionMsgId(msg.id); }}
                            className={`absolute top-1/2 -translate-y-1/2 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow text-gray-400 hover:text-yellow-400 hover:border-yellow-300 transition-all ${
                              isMine ? "-left-7" : "-right-7"
                            }`}>
                            <Smile size={13} />
                          </button>
                        )}

                        {msg.media_type === "image" && msg.media_url ? (
                          <div className="relative inline-block">
                            <a href={msg.media_url} target="_blank" rel="noreferrer"
                              className="block rounded-2xl overflow-hidden shadow border border-black/10">
                              <img src={msg.media_url} alt="shared"
                                className="max-w-full max-h-44 object-cover block" />
                            </a>
                            {/* ❤️ Like overlay */}
                            <button onClick={e => { e.preventDefault(); onToggleReaction(msg.id, "❤️"); }}
                              className={`absolute bottom-2 right-2 w-7 h-7 flex items-center justify-center rounded-full shadow-lg transition-all active:scale-90 ${
                                iLiked ? "bg-red-500 text-white" : "bg-black/40 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100"
                              }`}>
                              <Heart size={13} fill={iLiked ? "currentColor" : "none"} />
                            </button>
                          </div>
                        ) : msg.media_type === "document" && msg.media_url ? (
                          <a href={msg.media_url} download={msg.media_name} target="_blank" rel="noreferrer"
                            className={`flex items-center gap-2 px-3 py-2 rounded-2xl shadow-sm ${
                              isMine ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"
                            }`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isMine ? "bg-white/20" : "bg-blue-50"}`}>
                              <FileText size={15} className={isMine ? "text-white" : "text-blue-500"} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate max-w-[160px]">{msg.media_name ?? "Document"}</p>
                              <p className={`text-[10px] ${isMine ? "text-blue-200" : "text-gray-400"}`}>Download</p>
                            </div>
                          </a>
                        ) : (
                          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-snug shadow-sm ${
                            isMine ? "bg-blue-600 text-white rounded-br-sm" : "bg-gray-100 text-gray-800 rounded-bl-sm"
                          }`}>
                            {msg.content}
                          </div>
                        )}
                      </div>

                      <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                        <span className="text-[11px] text-gray-400">{fmtTime(msg.created_at)}</span>
                        {isMine && (
                          msg.is_read
                            ? <CheckCheck size={11} className="text-blue-400" />
                            : <Check size={11} className="text-gray-400" />
                        )}
                      </div>

                      {/* Reactions */}
                      {Object.values(rxGroups).length > 0 && (
                        <div className={`flex flex-wrap gap-0.5 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                          {Object.values(rxGroups).map(({ emoji, count, userIds }) => (
                            <button key={emoji} onClick={() => onToggleReaction(msg.id, emoji)}
                              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border shadow-sm hover:scale-110 active:scale-95 transition-transform ${
                                userIds.includes(currentUserId ?? -1)
                                  ? "bg-blue-50 border-blue-300 text-blue-700"
                                  : "bg-white border-gray-200 text-gray-600"
                              }`}>
                              <span>{emoji}</span>
                              <span className="text-[10px] font-semibold">{count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Emoji picker */}
          {showEmoji && (
            <div className="bg-white border-t border-gray-100 px-2 py-1.5 grid grid-cols-8 gap-0.5 max-h-28 overflow-y-auto shrink-0">
              {EMOJIS.map(e => (
                <button key={e} onClick={() => onInputChange(bubble.inputText + e)}
                  className="text-lg py-0.5 rounded hover:bg-gray-100 transition-colors">
                  {e}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div className="bg-white border-t border-gray-100 px-2 py-2 flex items-center gap-1.5 shrink-0">
            <button onClick={() => imageInputRef.current?.click()}
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-blue-500 transition-colors shrink-0">
              <ImageIcon size={17} />
            </button>
            <button onClick={() => docInputRef.current?.click()}
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-blue-500 transition-colors shrink-0">
              <Paperclip size={17} />
            </button>
            <input
              type="text"
              placeholder="Aa"
              value={bubble.inputText}
              onChange={e => onInputChange(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && onSend()}
              className="flex-1 h-9 px-3 rounded-full bg-gray-100 text-sm text-gray-800 outline-none placeholder:text-gray-400 min-w-0"
            />
            <button onClick={() => setShowEmoji(v => !v)}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors shrink-0 ${showEmoji ? "text-yellow-400 bg-yellow-50" : "text-gray-400 hover:bg-gray-100 hover:text-yellow-400"}`}>
              <Smile size={17} />
            </button>
            <button
              onClick={onSend}
              disabled={!bubble.inputText.trim() || bubble.sending}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-90 shrink-0 ${
                bubble.inputText.trim() && !bubble.sending
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-100 text-gray-400"
              }`}>
              {bubble.sending
                ? <Loader size={13} className="animate-spin" />
                : <Send size={14} className={bubble.inputText.trim() ? "ml-0.5" : ""} />
              }
            </button>

            {/* Hidden file inputs */}
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) { onSendMedia(f); e.target.value = ""; } }} />
            <input ref={docInputRef} type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) { onSendMedia(f); e.target.value = ""; } }} />
          </div>
        </>
      )}
    </div>
  );
}
