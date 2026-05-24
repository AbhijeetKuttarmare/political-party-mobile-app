import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Edit, MessageCircle, Users, Loader, X, Plus, Check } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

interface Conversation {
  partner_id: number;
  partner_name: string;
  partner_role: string;
  last_message: string;
  last_message_at: string;
  last_sender_id: number;
  unread_count: number;
}

interface Friend {
  friendship_id: number;
  friend_id: number;
  friend_name: string;
  friend_role: string;
}

interface Group {
  id: number;
  name: string;
  description: string | null;
  avatar_color: string;
  member_count: number;
  last_message: string;
  last_message_at: string | null;
  last_sender_name: string | null;
  unread_count: number;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin:     "Super Admin",
  state_leader:    "State Leader",
  district_leader: "District Leader",
  taluka_leader:   "Taluka Leader",
  village_leader:  "Village Leader",
  booth_leader:    "Booth Leader",
  booth_worker:    "Booth Worker",
  karyakarta:      "Karyakarta",
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

function timeAgo(iso: string) {
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

export default function ChatListScreen() {
  const { token, user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [tab, setTab] = useState<"chats" | "groups">("chats");

  /* ── Chats state ── */
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [search, setSearch] = useState("");

  /* ── New chat sheet ── */
  const [showNewChat, setShowNewChat] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");

  /* ── Groups state ── */
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupSearch, setGroupSearch] = useState("");

  /* ── Create group sheet ── */
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<number>>(new Set());
  const [memberSearch, setMemberSearch] = useState("");
  const [groupFriends, setGroupFriends] = useState<Friend[]>([]);
  const [groupFriendsLoading, setGroupFriendsLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const authHdr = { Authorization: `Bearer ${token}` };

  /* ── Load chats ── */
  const loadConversations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/messages/conversations", { headers: authHdr });
      if (res.ok) setConversations(await res.json());
    } finally { setChatsLoading(false); }
  }, [token]);

  /* ── Load groups ── */
  const loadGroups = useCallback(async () => {
    if (!token) return;
    setGroupsLoading(true);
    try {
      const res = await fetch("/api/groups", { headers: authHdr });
      if (res.ok) setGroups(await res.json());
    } finally { setGroupsLoading(false); }
  }, [token]);

  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => { loadGroups(); }, [loadGroups]);

  /* ── New chat friends ── */
  async function loadFriends() {
    setFriendsLoading(true);
    try {
      const res = await fetch("/api/friends", { headers: authHdr });
      if (res.ok) setFriends(await res.json());
    } finally { setFriendsLoading(false); }
  }

  function openNewChat() {
    setShowNewChat(true);
    setFriendSearch("");
    loadFriends();
  }

  /* ── Create group ── */
  async function openCreateGroup() {
    setShowCreateGroup(true);
    setGroupName("");
    setGroupDesc("");
    setSelectedMemberIds(new Set());
    setMemberSearch("");
    setGroupFriendsLoading(true);
    try {
      const res = await fetch("/api/friends", { headers: authHdr });
      if (res.ok) setGroupFriends(await res.json());
    } finally { setGroupFriendsLoading(false); }
  }

  function toggleMember(id: number) {
    setSelectedMemberIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleCreateGroup() {
    if (!groupName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { ...authHdr, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName.trim(),
          description: groupDesc.trim() || undefined,
          member_ids: [...selectedMemberIds],
        }),
      });
      if (res.ok) {
        const group: Group & { id: number } = await res.json();
        setShowCreateGroup(false);
        await loadGroups();
        setTab("groups");
        navigate(`/community/group/${group.id}`, {
          state: { groupName: group.name, memberCount: group.member_count, avatarColor: group.avatar_color },
        });
      }
    } finally { setCreating(false); }
  }

  const totalUnread = conversations.reduce((a, c) => a + c.unread_count, 0);
  const totalGroupUnread = groups.reduce((a, g) => a + g.unread_count, 0);

  const filteredConvs = conversations.filter(c =>
    c.partner_name.toLowerCase().includes(search.toLowerCase()) ||
    c.last_message.toLowerCase().includes(search.toLowerCase())
  );

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(groupSearch.toLowerCase())
  );

  const filteredFriends = friends.filter(f =>
    f.friend_name.toLowerCase().includes(friendSearch.toLowerCase())
  );

  const filteredGroupFriends = groupFriends.filter(f =>
    f.friend_name.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div className={`flex flex-col h-full ${isDark ? "bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" : "bg-gray-50"}`}>

      {/* Header */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 text-white px-4 pt-6 pb-0 relative overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-black tracking-tight">Messages</h1>
              {(totalUnread + totalGroupUnread) > 0 && (
                <p className="text-xs text-blue-100 mt-0.5">
                  {totalUnread + totalGroupUnread} unread
                </p>
              )}
            </div>
            {tab === "chats" ? (
              <button
                onClick={openNewChat}
                className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors active:scale-90"
              >
                <Edit size={16} />
              </button>
            ) : (
              <button
                onClick={openCreateGroup}
                className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors active:scale-90"
              >
                <Plus size={18} />
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            <button
              onClick={() => setTab("chats")}
              className={`flex-1 py-2.5 text-sm font-bold transition-all rounded-t-xl ${tab === "chats" ? "bg-white/20 text-white" : "text-white/60 hover:text-white/80"}`}
            >
              Chats
              {totalUnread > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("groups")}
              className={`flex-1 py-2.5 text-sm font-bold transition-all rounded-t-xl ${tab === "groups" ? "bg-white/20 text-white" : "text-white/60 hover:text-white/80"}`}
            >
              Groups
              {totalGroupUnread > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                  {totalGroupUnread > 99 ? "99+" : totalGroupUnread}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className={`px-4 py-3 flex-shrink-0 ${isDark ? "bg-slate-900/80" : "bg-white"} shadow-sm`}>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            placeholder={tab === "chats" ? "Search chats..." : "Search groups..."}
            value={tab === "chats" ? search : groupSearch}
            onChange={e => tab === "chats" ? setSearch(e.target.value) : setGroupSearch(e.target.value)}
            className={`w-full h-9 pl-10 pr-4 rounded-2xl text-sm outline-none ${isDark ? "bg-white/10 text-white placeholder:text-gray-500" : "bg-gray-100 text-gray-700 placeholder:text-gray-400"}`}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "chats" ? (
          /* ── Chats tab ── */
          chatsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader size={24} className="animate-spin text-blue-400" />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                <MessageCircle size={28} className="text-blue-300" />
              </div>
              <p className={`font-bold text-base mb-1 ${isDark ? "text-white" : "text-gray-700"}`}>
                {search ? "No chats found" : "No messages yet"}
              </p>
              <p className="text-xs text-gray-400">
                {search ? "Try a different search" : "Tap the pencil icon to start a conversation."}
              </p>
            </div>
          ) : (
            filteredConvs.map(conv => (
              <Link
                key={conv.partner_id}
                to={`/community/${conv.partner_id}`}
                state={{ partnerName: conv.partner_name, partnerRole: conv.partner_role }}
                className={`flex items-center gap-3 px-4 py-3 transition-colors border-b ${isDark ? "hover:bg-white/5 active:bg-white/10 border-white/5" : "hover:bg-gray-100 border-gray-100"}`}
              >
                <div className="relative shrink-0">
                  <div className={`w-[52px] h-[52px] rounded-full bg-gradient-to-br ${GRAD[conv.partner_role] ?? "from-gray-400 to-gray-500"} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                    {initials(conv.partner_name)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={`font-bold text-sm truncate pr-2 ${isDark ? "text-white" : "text-gray-900"}`}>{conv.partner_name}</p>
                    <p className={`text-[11px] shrink-0 ${conv.unread_count > 0 ? "text-blue-500 font-bold" : "text-gray-400"}`}>
                      {timeAgo(conv.last_message_at)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs truncate pr-2 leading-snug ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      {conv.last_sender_id === user?.id ? "You: " : ""}{conv.last_message}
                    </p>
                    {conv.unread_count > 0 && (
                      <span className="shrink-0 min-w-[20px] h-5 px-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {conv.unread_count > 99 ? "99+" : conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))
          )
        ) : (
          /* ── Groups tab ── */
          groupsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader size={24} className="animate-spin text-blue-400" />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                <Users size={28} className="text-blue-300" />
              </div>
              <p className={`font-bold text-base mb-1 ${isDark ? "text-white" : "text-gray-700"}`}>
                {groupSearch ? "No groups found" : "No groups yet"}
              </p>
              <p className="text-xs text-gray-400 mb-4">
                {groupSearch ? "Try a different search" : "Tap the + button to create a group."}
              </p>
              {!groupSearch && (
                <button
                  onClick={openCreateGroup}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-2xl shadow-md active:scale-95 transition-transform"
                >
                  Create Group
                </button>
              )}
            </div>
          ) : (
            filteredGroups.map(group => (
              <Link
                key={group.id}
                to={`/community/group/${group.id}`}
                state={{ groupName: group.name, memberCount: group.member_count, avatarColor: group.avatar_color }}
                className={`flex items-center gap-3 px-4 py-3 transition-colors border-b ${isDark ? "hover:bg-white/5 active:bg-white/10 border-white/5" : "hover:bg-gray-100 border-gray-100"}`}
              >
                <div className={`w-[52px] h-[52px] rounded-full bg-gradient-to-br ${group.avatar_color} flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0`}>
                  {initials(group.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={`font-bold text-sm truncate pr-2 ${isDark ? "text-white" : "text-gray-900"}`}>{group.name}</p>
                    <p className={`text-[11px] shrink-0 ${group.unread_count > 0 ? "text-blue-500 font-bold" : "text-gray-400"}`}>
                      {group.last_message_at ? timeAgo(group.last_message_at) : ""}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs truncate pr-2 leading-snug ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      {group.last_sender_name ? `${group.last_sender_name}: ` : ""}{group.last_message}
                    </p>
                    {group.unread_count > 0 ? (
                      <span className="shrink-0 min-w-[20px] h-5 px-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {group.unread_count > 99 ? "99+" : group.unread_count}
                      </span>
                    ) : (
                      <span className={`text-[10px] shrink-0 ${isDark ? "text-gray-600" : "text-gray-300"}`}>
                        {group.member_count} members
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))
          )
        )}

        <div className="py-6 text-center text-xs text-gray-400 font-medium">
          End-to-end encrypted · NCP-SP Party Portal
        </div>
      </div>

      {/* ── New Chat sheet ── */}
      {showNewChat && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setShowNewChat(false)} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 bg-white rounded-t-3xl shadow-2xl max-h-[75vh] flex flex-col">
            <div className="flex justify-center pt-3"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900">New Message</h3>
              <button onClick={() => setShowNewChat(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                <X size={15} className="text-gray-600" />
              </button>
            </div>
            <div className="px-4 py-2 border-b border-gray-100">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search friends..."
                  value={friendSearch}
                  onChange={e => setFriendSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-xl bg-gray-100 text-sm text-gray-700 outline-none placeholder:text-gray-400"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {friendsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader size={20} className="animate-spin text-blue-400" />
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                  <Users size={32} className="text-gray-200 mb-2" />
                  <p className="text-sm font-semibold text-gray-500">
                    {friends.length === 0 ? "No friends yet" : "No match found"}
                  </p>
                </div>
              ) : (
                filteredFriends.map(f => (
                  <button
                    key={f.friend_id}
                    onClick={() => {
                      setShowNewChat(false);
                      navigate(`/community/${f.friend_id}`, {
                        state: { partnerName: f.friend_name, partnerRole: f.friend_role },
                      });
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-50"
                  >
                    <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${GRAD[f.friend_role] ?? "from-gray-400 to-gray-500"} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}>
                      {initials(f.friend_name)}
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-sm text-gray-900">{f.friend_name}</p>
                      <p className="text-[11px] text-gray-400">{ROLE_LABELS[f.friend_role] ?? f.friend_role}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Create Group sheet ── */}
      {showCreateGroup && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => !creating && setShowCreateGroup(false)} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-center pt-3"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>

            {/* Sheet header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900">New Group</h3>
              <button onClick={() => setShowCreateGroup(false)} disabled={creating} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                <X size={15} className="text-gray-600" />
              </button>
            </div>

            {/* Group name + description */}
            <div className="px-4 py-3 border-b border-gray-100 space-y-2">
              <input
                type="text"
                placeholder="Group name (required)"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                maxLength={60}
                className="w-full h-10 px-4 rounded-xl bg-gray-100 text-sm text-gray-800 outline-none placeholder:text-gray-400 font-medium"
                autoFocus
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={groupDesc}
                onChange={e => setGroupDesc(e.target.value)}
                maxLength={120}
                className="w-full h-9 px-4 rounded-xl bg-gray-100 text-sm text-gray-700 outline-none placeholder:text-gray-400"
              />
            </div>

            {/* Member count indicator */}
            <div className="px-4 py-2 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500">Add Members</p>
                {selectedMemberIds.size > 0 && (
                  <span className="text-xs font-bold text-blue-600">{selectedMemberIds.size} selected</span>
                )}
              </div>
              <div className="relative mt-2">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search friends to add..."
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 rounded-xl bg-gray-100 text-xs text-gray-700 outline-none placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Friends list for group */}
            <div className="flex-1 overflow-y-auto">
              {groupFriendsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader size={20} className="animate-spin text-blue-400" />
                </div>
              ) : filteredGroupFriends.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-6 text-center">
                  <Users size={28} className="text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400">
                    {groupFriends.length === 0 ? "No friends to add" : "No match found"}
                  </p>
                </div>
              ) : (
                filteredGroupFriends.map(f => {
                  const selected = selectedMemberIds.has(f.friend_id);
                  return (
                    <button
                      key={f.friend_id}
                      onClick={() => toggleMember(f.friend_id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-50"
                    >
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${GRAD[f.friend_role] ?? "from-gray-400 to-gray-500"} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}>
                        {initials(f.friend_name)}
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-bold text-sm text-gray-900">{f.friend_name}</p>
                        <p className="text-[11px] text-gray-400">{ROLE_LABELS[f.friend_role] ?? f.friend_role}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${selected ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}>
                        {selected && <Check size={13} className="text-white" strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Create button */}
            <div className="px-4 py-4 border-t border-gray-100">
              <button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || creating}
                className="w-full h-12 bg-blue-600 disabled:bg-gray-300 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
              >
                {creating ? (
                  <Loader size={18} className="animate-spin" />
                ) : (
                  <>
                    <Users size={16} />
                    Create Group
                    {selectedMemberIds.size > 0 && ` (${selectedMemberIds.size + 1})`}
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
