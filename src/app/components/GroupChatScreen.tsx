import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import {
  ChevronLeft, Send, Check, CheckCheck, Loader, Users,
  Smile, ImageIcon, Paperclip, FileText, Heart, X, LogOut,
} from "lucide-react";

interface Reaction { emoji: string; user_id: number; }

interface GroupMessage {
  id: number;
  group_id: number;
  from_user_id: number;
  sender_name: string;
  sender_role: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  media_name: string | null;
  created_at: string;
  reactions: Reaction[];
}

interface Member { user_id: number; name: string; vol_role: string; role: string; }

const EMOJIS = [
  "😀","😂","😅","🤣","😊","😇","🙂","😉","😍","🥰","😘","😎","🤩","🥳",
  "😔","😢","😭","😤","😠","😱","😮","🤔","🤗","🥺","😋","😜","🤪","😏",
  "👍","👎","👋","🤝","🙌","👏","💪","🙏","👌","🤞","🫡",
  "❤️","💛","💚","💙","💜","🖤","💔","💯",
  "🔥","✨","⭐","🌟","🎉","🎊","🎁","🎯","🚀","💡","🌈","🎵",
];

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍", "🙏", "🔥"];

const GRAD: Record<string, string> = {
  super_admin: "from-blue-700 to-blue-500", state_leader: "from-purple-600 to-pink-500",
  district_leader: "from-emerald-600 to-teal-500", taluka_leader: "from-orange-500 to-amber-400",
  village_leader: "from-cyan-600 to-blue-500", booth_leader: "from-rose-500 to-pink-500",
  booth_worker: "from-indigo-600 to-violet-500", karyakarta: "from-teal-600 to-cyan-500",
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin", state_leader: "State Leader",
  district_leader: "District Leader", taluka_leader: "Taluka Leader",
  village_leader: "Village Leader", booth_leader: "Booth Leader",
  booth_worker: "Booth Worker", karyakarta: "Karyakarta",
};

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function fmtDate(iso: string) {
  const d = new Date(iso), today = new Date(), yday = new Date(today);
  yday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
}
function groupReactions(reactions: Reaction[]) {
  const map: Record<string, { emoji: string; count: number; userIds: number[] }> = {};
  for (const r of reactions) {
    if (!map[r.emoji]) map[r.emoji] = { emoji: r.emoji, count: 0, userIds: [] };
    map[r.emoji].count++;
    map[r.emoji].userIds.push(r.user_id);
  }
  return Object.values(map);
}

export default function GroupChatScreen() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate    = useNavigate();
  const location    = useLocation();
  const { token, user } = useAuth();
  const { isDark }  = useTheme();

  const gid      = parseInt(groupId ?? "0");
  const navState = location.state as { groupName?: string; memberCount?: number; avatarColor?: string } | null;

  const [groupName,     setGroupName]     = useState(navState?.groupName ?? "Group");
  const [memberCount,   setMemberCount]   = useState(navState?.memberCount ?? 0);
  const [avatarColor,   setAvatarColor]   = useState(navState?.avatarColor ?? "from-blue-600 to-purple-600");
  const [members,       setMembers]       = useState<Member[]>([]);
  const [showInfo,      setShowInfo]      = useState(false);
  const [messages,      setMessages]      = useState<GroupMessage[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [sending,       setSending]       = useState(false);
  const [inputText,     setInputText]     = useState("");
  const [showEmoji,     setShowEmoji]     = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError,   setUploadError]   = useState<string | null>(null);
  const [reactionMsgId, setReactionMsgId] = useState<number | null>(null);
  const [leaving,       setLeaving]       = useState(false);

  const bottomRef     = useRef<HTMLDivElement>(null);
  const inputRef      = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef   = useRef<HTMLInputElement>(null);
  const pressTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch group info
  const fetchGroupInfo = useCallback(async () => {
    if (!token || !gid) return;
    const res = await fetch(`/api/groups/${gid}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setGroupName(data.name);
      setMemberCount(data.member_count);
      setAvatarColor(data.avatar_color);
      setMembers(data.members ?? []);
    }
  }, [token, gid]);

  const fetchMessages = useCallback(async (markRead = false) => {
    if (!token || !gid) return;
    try {
      const res = await fetch(`/api/groups/${gid}/messages`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data: GroupMessage[] = await res.json();
        setMessages(data.map(m => ({ ...m, reactions: m.reactions ?? [] })));
        if (markRead) {
          fetch(`/api/groups/${gid}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        }
      }
    } finally { setLoading(false); }
  }, [token, gid]);

  useEffect(() => { fetchGroupInfo(); fetchMessages(true); }, [fetchGroupInfo, fetchMessages]);

  useEffect(() => {
    const interval = setInterval(() => fetchMessages(true), 4000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (!reactionMsgId) return;
    const close = () => setReactionMsgId(null);
    document.addEventListener("click", close, { once: true });
    return () => document.removeEventListener("click", close);
  }, [reactionMsgId]);

  async function sendMessage() {
    const text = inputText.trim();
    if (!text || sending) return;
    setInputText(""); setShowEmoji(false); setSending(true);
    try {
      const res = await fetch(`/api/groups/${gid}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const msg: GroupMessage = await res.json();
        setMessages(prev => [...prev, { ...msg, reactions: [] }]);
      }
    } finally { setSending(false); }
  }

  async function handleFileUpload(file: File) {
    setUploadingFile(true); setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await fetch("/api/messages/upload", {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form,
      });
      if (!uploadRes.ok) { setUploadError("Upload failed."); return; }
      const { url, media_type, original_name } = await uploadRes.json();
      const res = await fetch(`/api/groups/${gid}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content: null, media_url: url, media_type, media_name: original_name }),
      });
      if (res.ok) {
        const msg: GroupMessage = await res.json();
        setMessages(prev => [...prev, { ...msg, reactions: [] }]);
      }
    } catch { setUploadError("Network error."); }
    finally {
      setUploadingFile(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (docInputRef.current)   docInputRef.current.value   = "";
    }
  }

  async function toggleReaction(msgId: number, emoji: string) {
    setReactionMsgId(null);
    const res = await fetch(`/api/groups/${gid}/messages/${msgId}/reactions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    }).catch(() => null);
    if (!res?.ok) return;
    const { action } = await res.json();
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const reactions = action === "added"
        ? [...m.reactions, { emoji, user_id: user?.id ?? 0 }]
        : m.reactions.filter(r => !(r.emoji === emoji && r.user_id === user?.id));
      return { ...m, reactions };
    }));
  }

  async function handleLeave() {
    if (!confirm("Leave this group?")) return;
    setLeaving(true);
    const res = await fetch(`/api/groups/${gid}/leave`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null);
    if (res?.ok) navigate("/community");
    else setLeaving(false);
  }

  function handlePressStart(msgId: number) { pressTimer.current = setTimeout(() => setReactionMsgId(msgId), 500); }
  function handlePressEnd() { if (pressTimer.current) clearTimeout(pressTimer.current); }

  // Group by day
  const grouped: { label: string; msgs: GroupMessage[] }[] = [];
  messages.forEach(m => {
    const label = fmtDate(m.created_at);
    const last = grouped[grouped.length - 1];
    if (last && last.label === label) last.msgs.push(m);
    else grouped.push({ label, msgs: [m] });
  });

  return (
    <div className={`flex flex-col h-full ${isDark ? "bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" : "bg-gray-50"}`}>

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white px-3 pt-4 pb-3 shadow-lg relative overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.1),transparent_60%)]" />
        <div className="relative z-10 flex items-center gap-3">
          <button onClick={() => navigate("/community")}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/20 active:bg-white/30 transition-colors -ml-1">
            <ChevronLeft size={22} />
          </button>
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0`}>
            {initials(groupName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base leading-tight truncate">{groupName}</p>
            <p className="text-xs mt-0.5 text-blue-200">{memberCount} members</p>
          </div>
          <button onClick={() => { setShowInfo(true); fetchGroupInfo(); }}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors">
            <Users size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader size={22} className="animate-spin text-blue-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white font-bold text-xl shadow-lg mb-3`}>
              {initials(groupName)}
            </div>
            <p className={`font-bold text-base mb-1 ${isDark ? "text-white" : "text-gray-800"}`}>{groupName}</p>
            <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-400"}`}>
              Group created. Say hello! 👋
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {grouped.map(({ label, msgs }) => (
              <div key={label}>
                <div className="flex justify-center my-3">
                  <span className={`text-[10px] font-semibold px-3 py-1 rounded-full border ${isDark ? "bg-white/10 text-gray-300 border-white/10" : "bg-gray-200 text-gray-500 border-gray-300"}`}>
                    {label}
                  </span>
                </div>

                {msgs.map((msg, i) => {
                  const isMine   = msg.from_user_id === user?.id;
                  const prevFrom = i > 0 ? msgs[i - 1].from_user_id : -1;
                  const showName = !isMine && msg.from_user_id !== prevFrom;
                  const rxGroups = groupReactions(msg.reactions);
                  const iLiked   = msg.reactions.some(r => r.emoji === "❤️" && r.user_id === user?.id);
                  const senderGrad = GRAD[msg.sender_role] ?? "from-gray-400 to-gray-500";

                  return (
                    <div key={msg.id} className={`${msg.from_user_id !== prevFrom && i > 0 ? "mt-3" : "mt-0.5"}`}>
                      {/* Reaction picker */}
                      {reactionMsgId === msg.id && (
                        <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1`}
                          onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1 px-2 py-1.5 rounded-full shadow-xl bg-white border border-gray-100">
                            {REACTION_EMOJIS.map(e => (
                              <button key={e} onClick={() => toggleReaction(msg.id, e)}
                                className={`text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-90 transition-all ${
                                  msg.reactions.some(r => r.emoji === e && r.user_id === user?.id) ? "bg-blue-50 ring-1 ring-blue-300" : ""
                                }`}>
                                {e}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                        {/* Other person avatar */}
                        {!isMine && (
                          showName
                            ? <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${senderGrad} flex items-center justify-center text-white text-[9px] font-bold shrink-0 mb-1`}>
                                {initials(msg.sender_name)}
                              </div>
                            : <div className="w-7 shrink-0" />
                        )}

                        <div className={`max-w-[75%] flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                          {/* Sender name */}
                          {showName && !isMine && (
                            <p className={`text-[11px] font-semibold mb-0.5 ml-1 ${isDark ? "text-blue-300" : "text-blue-600"}`}>
                              {msg.sender_name}
                            </p>
                          )}

                          {/* Bubble */}
                          <div
                            onTouchStart={() => handlePressStart(msg.id)}
                            onTouchEnd={handlePressEnd}
                            onContextMenu={e => { e.preventDefault(); setReactionMsgId(msg.id); }}
                          >
                            {msg.media_type === "image" && msg.media_url ? (
                              <div className="relative inline-block">
                                <a href={msg.media_url} target="_blank" rel="noreferrer"
                                  className="block rounded-2xl overflow-hidden shadow-md border border-black/10">
                                  <img src={msg.media_url} alt="shared"
                                    className="max-w-[220px] max-h-56 object-cover block" />
                                </a>
                                <button onClick={e => { e.preventDefault(); toggleReaction(msg.id, "❤️"); }}
                                  className={`absolute bottom-2 right-2 w-8 h-8 flex items-center justify-center rounded-full shadow-lg transition-all active:scale-90 ${
                                    iLiked ? "bg-red-500 text-white" : "bg-black/40 hover:bg-red-500 text-white"
                                  }`}>
                                  <Heart size={14} fill={iLiked ? "currentColor" : "none"} />
                                </button>
                              </div>
                            ) : msg.media_type === "document" && msg.media_url ? (
                              <a href={msg.media_url} download={msg.media_name} target="_blank" rel="noreferrer"
                                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl shadow-sm ${
                                  isMine ? "bg-blue-600 text-white"
                                    : isDark ? "bg-white/10 text-gray-100 border border-white/15"
                                    : "bg-white text-gray-800 border border-gray-200"
                                }`}>
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isMine ? "bg-white/20" : "bg-blue-50"}`}>
                                  <FileText size={17} className={isMine ? "text-white" : "text-blue-500"} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold truncate max-w-[150px]">{msg.media_name ?? "Document"}</p>
                                  <p className={`text-[10px] mt-0.5 ${isMine ? "text-blue-200" : "text-gray-400"}`}>Tap to download</p>
                                </div>
                              </a>
                            ) : (
                              <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-snug shadow-sm ${
                                isMine
                                  ? "bg-blue-600 text-white rounded-br-sm"
                                  : isDark
                                    ? "bg-white/10 backdrop-blur-sm text-gray-100 rounded-bl-sm border border-white/15"
                                    : "bg-white text-gray-800 rounded-bl-sm border border-gray-200"
                              }`}>
                                {msg.content}
                              </div>
                            )}
                          </div>

                          <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                            <span className="text-[10px] text-gray-400">{fmtTime(msg.created_at)}</span>
                          </div>

                          {/* Reactions */}
                          {rxGroups.length > 0 && (
                            <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                              {rxGroups.map(({ emoji, count, userIds }) => (
                                <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                                  className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border shadow-sm hover:scale-110 active:scale-95 transition-transform ${
                                    userIds.includes(user?.id ?? -1)
                                      ? "bg-blue-50 border-blue-300 text-blue-700"
                                      : isDark ? "bg-white/10 border-white/20 text-white" : "bg-white border-gray-200 text-gray-600"
                                  }`}>
                                  <span>{emoji}</span>
                                  <span className="text-[10px] font-semibold">{count}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {uploadError && (
        <div className="flex-shrink-0 px-4 py-2.5 bg-red-50 border-t border-red-100">
          <span className="text-xs text-red-600 font-medium">{uploadError}</span>
        </div>
      )}

      {showEmoji && (
        <div className={`flex-shrink-0 border-t px-2 py-2 grid grid-cols-8 gap-0.5 max-h-40 overflow-y-auto ${
          isDark ? "bg-slate-900 border-white/10" : "bg-white border-gray-200"
        }`}>
          {EMOJIS.map(e => (
            <button key={e} onClick={() => setInputText(prev => prev + e)}
              className="text-xl py-1 rounded-lg hover:bg-gray-100 active:scale-90 transition-all">{e}</button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className={`flex-shrink-0 border-t px-3 py-2.5 flex items-center gap-2 ${
        isDark ? "bg-slate-900/80 backdrop-blur-xl border-white/10" : "bg-white border-gray-200"
      }`}>
        <button onClick={() => imageInputRef.current?.click()}
          className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors shrink-0 ${isDark ? "text-gray-400 hover:bg-white/10" : "text-gray-500 hover:bg-gray-100"}`}>
          <ImageIcon size={20} />
        </button>
        <button onClick={() => docInputRef.current?.click()}
          className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors shrink-0 ${isDark ? "text-gray-400 hover:bg-white/10" : "text-gray-500 hover:bg-gray-100"}`}>
          <Paperclip size={20} />
        </button>
        <div className={`flex-1 flex items-center rounded-3xl px-4 py-2 gap-2 border ${isDark ? "bg-white/10 border-white/10" : "bg-gray-100 border-gray-200"}`}>
          <input ref={inputRef} type="text" placeholder="Message group..."
            value={inputText} onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            className={`flex-1 bg-transparent text-sm outline-none min-w-0 ${isDark ? "text-white placeholder:text-gray-500" : "text-gray-900 placeholder:text-gray-400"}`} />
          <button onClick={() => setShowEmoji(v => !v)}
            className={`shrink-0 transition-colors ${showEmoji ? "text-yellow-400" : isDark ? "text-gray-400 hover:text-yellow-400" : "text-gray-400 hover:text-yellow-500"}`}>
            <Smile size={18} />
          </button>
        </div>
        <button onClick={sendMessage} disabled={!inputText.trim() || sending}
          className={`w-10 h-10 flex items-center justify-center rounded-full shrink-0 transition-all active:scale-90 shadow-md ${
            inputText.trim() && !sending ? "bg-blue-600 text-white" : isDark ? "bg-white/10 text-gray-500" : "bg-gray-200 text-gray-400"
          }`}>
          {sending || uploadingFile ? <Loader size={16} className="animate-spin" /> : <Send size={18} className={inputText.trim() ? "ml-0.5" : ""} />}
        </button>
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
        <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
      </div>

      {/* Group Info Sheet */}
      {showInfo && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setShowInfo(false)} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 bg-white rounded-t-3xl shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-center pt-3"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
            {/* Group avatar + name */}
            <div className="flex flex-col items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-100">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white font-black text-2xl shadow-lg`}>
                {initials(groupName)}
              </div>
              <div className="text-center">
                <p className="font-black text-lg text-gray-900">{groupName}</p>
                <p className="text-xs text-gray-400">{memberCount} members</p>
              </div>
            </div>
            {/* Members */}
            <div className="flex-1 overflow-y-auto">
              <p className="px-4 pt-3 pb-1 text-xs font-bold text-gray-400 uppercase tracking-wide">Members</p>
              {members.map(m => (
                <div key={m.user_id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${GRAD[m.vol_role] ?? "from-gray-400 to-gray-500"} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {initials(m.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{m.name} {m.user_id === user?.id ? "(You)" : ""}</p>
                    <p className="text-xs text-gray-400">{ROLE_LABELS[m.vol_role] ?? m.vol_role}</p>
                  </div>
                  {m.role === "admin" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Admin</span>
                  )}
                </div>
              ))}
            </div>
            {/* Leave */}
            <div className="px-4 pb-6 pt-2 border-t border-gray-100">
              <button onClick={handleLeave} disabled={leaving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 active:scale-95 transition-all">
                {leaving ? <Loader size={15} className="animate-spin" /> : <LogOut size={15} />}
                Leave Group
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
