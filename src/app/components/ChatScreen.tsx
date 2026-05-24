import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import {
  ChevronLeft, Send, Check, CheckCheck, Loader, MoreVertical,
  Smile, ImageIcon, Paperclip, FileText, Heart,
} from "lucide-react";

interface Reaction { emoji: string; user_id: number; }

interface Message {
  id: number;
  from_user_id: number;
  to_user_id: number;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  media_name: string | null;
  is_read: boolean;
  created_at: string;
  reactions: Reaction[];
}

interface Partner { name: string; role: string; }

const EMOJIS = [
  "😀","😂","😅","🤣","😊","😇","🙂","😉","😍","🥰","😘","😎","🤩","🥳",
  "😔","😢","😭","😤","😠","😱","😮","🤔","🤗","🥺","😋","😜","🤪","😏",
  "👍","👎","👋","🤝","🙌","👏","💪","🙏","👌","🤞","🫡",
  "❤️","💛","💚","💙","💜","🖤","💔","💯",
  "🔥","✨","⭐","🌟","🎉","🎊","🎁","🎯","🚀","💡","🌈","🎵","📷","📄",
];

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍", "🙏", "🔥"];

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin", state_leader: "State Leader",
  district_leader: "District Leader", taluka_leader: "Taluka Leader",
  village_leader: "Village Leader", booth_leader: "Booth Leader",
  booth_worker: "Booth Worker", karyakarta: "Karyakarta",
};

const GRAD: Record<string, string> = {
  super_admin:     "from-blue-700 to-blue-500",
  state_leader:    "from-purple-600 to-pink-500",
  district_leader: "from-emerald-600 to-teal-500",
  taluka_leader:   "from-orange-500 to-amber-400",
  village_leader:  "from-cyan-600 to-blue-500",
  booth_leader:    "from-rose-500 to-pink-500",
  booth_worker:    "from-indigo-600 to-violet-500",
  karyakarta:      "from-teal-600 to-cyan-500",
};

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
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

export default function ChatScreen() {
  const { chatId }  = useParams<{ chatId: string }>();
  const navigate    = useNavigate();
  const location    = useLocation();
  const { token, user } = useAuth();
  const { isDark }  = useTheme();

  const partnerId = parseInt(chatId ?? "0");
  const stateInfo = (location.state as { partnerName?: string; partnerRole?: string } | null);

  const [partner,       setPartner]       = useState<Partner>({
    name: stateInfo?.partnerName ?? "...", role: stateInfo?.partnerRole ?? "",
  });
  const [messages,      setMessages]      = useState<Message[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [sending,       setSending]       = useState(false);
  const [inputText,     setInputText]     = useState("");
  const [showEmoji,     setShowEmoji]     = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError,   setUploadError]   = useState<string | null>(null);
  const [reactionMsgId, setReactionMsgId] = useState<number | null>(null);

  const bottomRef     = useRef<HTMLDivElement>(null);
  const inputRef      = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef   = useRef<HTMLInputElement>(null);
  const pressTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (stateInfo?.partnerName || !token || !partnerId) return;
    fetch(`/api/volunteers/${partnerId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setPartner({ name: d.name, role: d.role }))
      .catch(() => {});
  }, [partnerId, token]);

  const fetchMessages = useCallback(async (markRead = false) => {
    if (!token || !partnerId) return;
    try {
      const res = await fetch(`/api/messages/${partnerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: Message[] = await res.json();
        setMessages(data.map(m => ({ ...m, reactions: m.reactions ?? [] })));
        if (markRead) {
          fetch(`/api/messages/${partnerId}/read`, {
            method: "PATCH", headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {});
        }
      }
    } finally { setLoading(false); }
  }, [token, partnerId]);

  useEffect(() => { fetchMessages(true); }, [fetchMessages]);

  useEffect(() => {
    const interval = setInterval(() => fetchMessages(true), 4000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close reaction picker on outside click
  useEffect(() => {
    if (!reactionMsgId) return;
    const close = () => setReactionMsgId(null);
    document.addEventListener("click", close, { once: true });
    return () => document.removeEventListener("click", close);
  }, [reactionMsgId]);

  async function sendMessage() {
    const text = inputText.trim();
    if (!text || sending) return;
    setInputText("");
    setShowEmoji(false);
    setSending(true);
    try {
      const res = await fetch(`/api/messages/${partnerId}`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body:    JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const msg: Message = await res.json();
        setMessages(prev => [...prev, { ...msg, reactions: msg.reactions ?? [] }]);
      }
    } finally { setSending(false); }
  }

  function showUploadError(msg: string) {
    setUploadError(msg);
    setTimeout(() => setUploadError(null), 4000);
  }

  async function handleFileUpload(file: File) {
    setUploadingFile(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await fetch("/api/messages/upload", {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}` },
        body:    form,
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        showUploadError(err.error ?? "Upload failed. Please try again.");
        return;
      }
      const { url, media_type, original_name } = await uploadRes.json();
      const res = await fetch(`/api/messages/${partnerId}`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body:    JSON.stringify({ content: null, media_url: url, media_type, media_name: original_name }),
      });
      if (res.ok) {
        const msg: Message = await res.json();
        setMessages(prev => [...prev, { ...msg, reactions: msg.reactions ?? [] }]);
      } else {
        showUploadError("Couldn't send file. Please try again.");
      }
    } catch {
      showUploadError("Network error. Check your connection.");
    } finally {
      setUploadingFile(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (docInputRef.current)   docInputRef.current.value   = "";
    }
  }

  async function toggleReaction(msgId: number, emoji: string) {
    setReactionMsgId(null);
    const res = await fetch(`/api/messages/${msgId}/reactions`, {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ emoji }),
    }).catch(() => null);
    if (!res?.ok) return;
    const { action } = await res.json();
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const reactions =
        action === "added"
          ? [...m.reactions, { emoji, user_id: user?.id ?? 0 }]
          : m.reactions.filter(r => !(r.emoji === emoji && r.user_id === user?.id));
      return { ...m, reactions };
    }));
  }

  function handlePressStart(msgId: number) {
    pressTimer.current = setTimeout(() => setReactionMsgId(msgId), 500);
  }
  function handlePressEnd() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }

  // Group messages by day
  const grouped: { label: string; msgs: Message[] }[] = [];
  messages.forEach(m => {
    const label = fmtDate(m.created_at);
    const last  = grouped[grouped.length - 1];
    if (last && last.label === label) last.msgs.push(m);
    else grouped.push({ label, msgs: [m] });
  });

  const grad = GRAD[partner.role] ?? "from-gray-400 to-gray-500";

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
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0`}>
            {partner.name !== "..." ? initials(partner.name) : "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base leading-tight truncate">{partner.name}</p>
            <p className="text-xs mt-0.5 text-blue-200">{ROLE_LABELS[partner.role] ?? partner.role}</p>
          </div>
          <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors">
            <MoreVertical size={18} />
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
            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-xl shadow-lg mb-3`}>
              {partner.name !== "..." ? initials(partner.name) : "?"}
            </div>
            <p className={`font-bold text-base mb-1 ${isDark ? "text-white" : "text-gray-800"}`}>{partner.name}</p>
            <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-400"}`}>
              This is the beginning of your conversation.<br />Say hi! 👋
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
                  const prevMine = i > 0 && msgs[i - 1].from_user_id === user?.id;
                  const gap      = isMine !== (i > 0 && msgs[i - 1].from_user_id === user?.id);
                  const rxGroups = groupReactions(msg.reactions);
                  const iLiked   = msg.reactions.some(r => r.emoji === "❤️" && r.user_id === user?.id);

                  return (
                    <div key={msg.id} className={`${gap && i > 0 ? "mt-3" : "mt-0.5"}`}>
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
                        {!isMine && !prevMine ? (
                          <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white text-[8px] font-bold shrink-0 mb-1`}>
                            {initials(partner.name)}
                          </div>
                        ) : !isMine ? <div className="w-6 shrink-0" /> : null}

                        <div className={`max-w-[75%] flex flex-col ${isMine ? "items-end" : "items-start"}`}>
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
                                {/* ❤️ Like overlay */}
                                <button
                                  onClick={e => { e.preventDefault(); toggleReaction(msg.id, "❤️"); }}
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

                          {/* Time + read status */}
                          <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                            <span className="text-[10px] text-gray-400">{fmtTime(msg.created_at)}</span>
                            {isMine && (
                              msg.is_read
                                ? <CheckCheck size={11} className="text-blue-400" />
                                : <Check size={11} className="text-gray-400" />
                            )}
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

      {/* Upload error */}
      {uploadError && (
        <div className="flex-shrink-0 px-4 py-2.5 bg-red-50 border-t border-red-100">
          <span className="text-xs text-red-600 font-medium">{uploadError}</span>
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div className={`flex-shrink-0 border-t px-2 py-2 grid grid-cols-8 gap-0.5 max-h-40 overflow-y-auto ${
          isDark ? "bg-slate-900 border-white/10" : "bg-white border-gray-200"
        }`}>
          {EMOJIS.map(e => (
            <button key={e} onClick={() => setInputText(prev => prev + e)}
              className="text-xl py-1 rounded-lg hover:bg-gray-100 active:scale-90 transition-all">
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className={`flex-shrink-0 border-t px-3 py-2.5 flex items-center gap-2 ${
        isDark ? "bg-slate-900/80 backdrop-blur-xl border-white/10" : "bg-white border-gray-200"
      }`}>
        <button onClick={() => imageInputRef.current?.click()}
          className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors shrink-0 ${
            isDark ? "text-gray-400 hover:bg-white/10" : "text-gray-500 hover:bg-gray-100"
          }`}>
          <ImageIcon size={20} />
        </button>
        <button onClick={() => docInputRef.current?.click()}
          className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors shrink-0 ${
            isDark ? "text-gray-400 hover:bg-white/10" : "text-gray-500 hover:bg-gray-100"
          }`}>
          <Paperclip size={20} />
        </button>

        <div className={`flex-1 flex items-center rounded-3xl px-4 py-2 gap-2 border ${
          isDark ? "bg-white/10 border-white/10" : "bg-gray-100 border-gray-200"
        }`}>
          <input ref={inputRef} type="text" placeholder="Message..."
            value={inputText} onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            className={`flex-1 bg-transparent text-sm outline-none min-w-0 ${
              isDark ? "text-white placeholder:text-gray-500" : "text-gray-900 placeholder:text-gray-400"
            }`} />
          <button onClick={() => setShowEmoji(v => !v)}
            className={`shrink-0 transition-colors ${showEmoji ? "text-yellow-400" : isDark ? "text-gray-400 hover:text-yellow-400" : "text-gray-400 hover:text-yellow-500"}`}>
            <Smile size={18} />
          </button>
        </div>

        <button onClick={sendMessage}
          disabled={(!inputText.trim() || sending)}
          className={`w-10 h-10 flex items-center justify-center rounded-full shrink-0 transition-all active:scale-90 shadow-md ${
            inputText.trim() && !sending ? "bg-blue-600 text-white" : isDark ? "bg-white/10 text-gray-500" : "bg-gray-200 text-gray-400"
          }`}>
          {sending || uploadingFile
            ? <Loader size={16} className="animate-spin" />
            : <Send size={18} className={inputText.trim() ? "ml-0.5" : ""} />
          }
        </button>

        <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
        <input ref={docInputRef} type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
      </div>
    </div>
  );
}
