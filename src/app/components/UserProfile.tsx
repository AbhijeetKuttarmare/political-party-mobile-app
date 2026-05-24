import { useState, useRef, useEffect, useCallback } from "react";
import {
  User, Settings, LogOut,
  ChevronRight, Camera, Users, MessageSquare, X,
  Bell, Shield, Globe, Moon, Eye, EyeOff, Check, Edit3,
  MapPinOff, Lock, Info, Phone, Mail, MapPin,
  UserMinus, Loader, Send, Heart, Calendar, Megaphone,
  ArrowLeft, MoreHorizontal, Trash2,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

type Sheet = "edit" | "settings" | "privacy" | "notifications" | "friends" | "posts" | null;

interface Friend {
  friendship_id: number;
  friend_id: number;
  friend_name: string;
  friend_role: string;
  friends_since: string;
}

interface MyPost {
  id: number;
  type: "post" | "event" | "campaign";
  content: string;
  created_at: string;
  like_count: number;
  comment_count: number;
  event_title?: string;
  event_date?: string;
  event_time?: string;
  event_location?: string;
  campaign_title?: string;
  campaign_goal?: string;
  campaign_progress?: number;
}

const ROLE_LABELS: Record<string, string> = {
  state_leader:    "State Leader",
  district_leader: "District Leader",
  taluka_leader:   "Taluka Leader",
  booth_worker:    "Booth Worker",
  super_admin:     "Super Admin",
};

export default function UserProfile() {
  const navigate  = useNavigate();
  const { user: authUser, logout, token } = useAuth();
  const { isDark, toggleDark } = useTheme();

  /* ── Editable user state ── */
  const [user, setUser] = useState({
    name:     authUser?.name     || "Member",
    role:     ROLE_LABELS[authUser?.role || ""] || "Volunteer",
    memberId: "NCP-SP/MH/2025/12345",
    bio:      "Proud NCP-SP member. Working for a stronger Maharashtra.",
  });

  const [draft, setDraft] = useState({ ...user });

  /* ── Notification toggles ── */
  const [pushNotif,  setPushNotif]  = useState(true);
  const [emailNotif, setEmailNotif] = useState(false);
  const [smsNotif,   setSmsNotif]   = useState(true);
  const [gpsTracking, setGpsTracking] = useState(true);
  const [profilePublic, setProfilePublic] = useState(true);
  const [showActivity,  setShowActivity]  = useState(true);
  const [showContact,   setShowContact]   = useState(false);

  /* ── Sheet control ── */
  const [activeSheet, setActiveSheet] = useState<Sheet>(null);

  /* ── Avatar ── */
  const [avatarColor]   = useState("from-orange-400 via-pink-500 to-purple-600");
  const avatarKey = `ncp_avatar_${authUser?.id ?? authUser?.mobile ?? "guest"}`;
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    () => localStorage.getItem(avatarKey)
  );
  const fileRef = useRef<HTMLInputElement>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatarPreview(dataUrl);
      localStorage.setItem(avatarKey, dataUrl);
    };
    reader.readAsDataURL(file);
  }

  /* ── Live stats from API ── */
  const [postCount,    setPostCount]    = useState<number | null>(null);
  const [friendsCount, setFriendsCount] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    const h = { Authorization: `Bearer ${token}` };

    fetch("/api/posts/me/count", { headers: h })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setPostCount(d.count))
      .catch(() => {});

    fetch("/api/friends/count", { headers: h })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setFriendsCount(d.count))
      .catch(() => {});
  }, [token]);

  /* ── Friends list ── */
  const [friendsList,    setFriendsList]    = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [unfriending,    setUnfriending]    = useState<Set<number>>(new Set());

  const loadFriends = useCallback(async () => {
    if (!token) return;
    setFriendsLoading(true);
    try {
      const res = await fetch("/api/friends", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setFriendsList(await res.json());
    } finally { setFriendsLoading(false); }
  }, [token]);

  async function handleUnfriend(friendshipId: number) {
    setUnfriending(prev => new Set([...prev, friendshipId]));
    try {
      const res = await fetch(`/api/friends/${friendshipId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFriendsList(prev => prev.filter(f => f.friendship_id !== friendshipId));
        setFriendsCount(c => (c !== null ? Math.max(0, c - 1) : null));
      }
    } finally {
      setUnfriending(prev => { const s = new Set(prev); s.delete(friendshipId); return s; });
    }
  }

  const ROLE_COLORS: Record<string, string> = {
    super_admin:     "bg-blue-100 text-blue-700",
    state_leader:    "bg-purple-100 text-purple-700",
    district_leader: "bg-emerald-100 text-emerald-700",
    taluka_leader:   "bg-orange-100 text-orange-700",
    village_leader:  "bg-cyan-100 text-cyan-700",
    booth_leader:    "bg-rose-100 text-rose-700",
    booth_worker:    "bg-indigo-100 text-indigo-700",
    karyakarta:      "bg-teal-100 text-teal-700",
  };
  const ROLE_LABELS_MAP: Record<string, string> = {
    super_admin:     "Super Admin",
    state_leader:    "State Leader",
    district_leader: "District Leader",
    taluka_leader:   "Taluka Leader",
    village_leader:  "Village Leader",
    booth_leader:    "Booth Leader",
    booth_worker:    "Booth Worker",
    karyakarta:      "Karyakarta",
  };
  function friendInitials(name: string) {
    return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  }
  const GRAD_MAP: Record<string, string> = {
    super_admin:     "from-blue-700 to-blue-500",
    state_leader:    "from-purple-600 to-pink-500",
    district_leader: "from-emerald-600 to-teal-500",
    taluka_leader:   "from-orange-500 to-amber-400",
    village_leader:  "from-cyan-600 to-blue-500",
    booth_leader:    "from-rose-500 to-pink-500",
    booth_worker:    "from-indigo-600 to-violet-500",
    karyakarta:      "from-teal-600 to-cyan-500",
  };

  /* ── My Posts list ── */
  const [myPosts,       setMyPosts]       = useState<MyPost[]>([]);
  const [postsLoading,  setPostsLoading]  = useState(false);
  const [selectedPost,  setSelectedPost]  = useState<MyPost | null>(null);
  const [deletingPost,  setDeletingPost]  = useState<number | null>(null);

  const loadMyPosts = useCallback(async () => {
    if (!token) return;
    setPostsLoading(true);
    try {
      const res = await fetch("/api/posts/me?limit=30", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setMyPosts(await res.json());
    } finally { setPostsLoading(false); }
  }, [token]);

  async function handleDeletePost(postId: number) {
    setDeletingPost(postId);
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMyPosts(prev => prev.filter(p => p.id !== postId));
        setPostCount(c => (c !== null ? Math.max(0, c - 1) : null));
        setSelectedPost(null);
      }
    } finally { setDeletingPost(null); }
  }

  function postGradient(type: string) {
    if (type === "event")    return "from-purple-500 via-indigo-500 to-blue-600";
    if (type === "campaign") return "from-orange-500 via-rose-500 to-pink-600";
    return "from-blue-500 via-cyan-500 to-teal-500";
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return "Just now";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7)  return `${d}d`;
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  const stats = [
    { label: "Posts",   value: postCount   ?? "—", icon: MessageSquare, grad: "from-blue-500 to-cyan-500",   onClick: () => { loadMyPosts(); setActiveSheet("posts"); } },
    { label: "Friends", value: friendsCount ?? "—", icon: Users,         grad: "from-orange-500 to-pink-500", onClick: () => { loadFriends(); setActiveSheet("friends"); } },
  ];

  function saveEdit() {
    setUser({ ...draft });
    setActiveSheet(null);
  }

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
    return (
      <button
        onClick={onToggle}
        className={`w-12 h-6 rounded-full transition-all duration-200 relative shrink-0 ${on ? "bg-blue-600" : "bg-gray-200"}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-200 ${on ? "left-6" : "left-0.5"}`} />
      </button>
    );
  }

  function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[390px] max-w-full z-50 bg-white rounded-t-[2rem] shadow-2xl max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
            <div className="w-10 h-1 bg-gray-200 rounded-full absolute top-3 left-1/2 -translate-x-1/2" />
            <h3 className="font-bold text-base text-gray-900 mt-1">{title}</h3>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
              <X size={16} className="text-gray-600" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1">{children}</div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">

      {/* Cover */}
      <div className={`bg-gradient-to-br ${avatarColor} h-32 relative overflow-hidden`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent)]" />
      </div>

      {/* Profile card */}
      <div className="px-4 -mt-16 pb-4">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 pt-4 pb-5 text-center relative">

            {/* Avatar */}
            <div className="relative inline-block mb-3">
              <div className={`w-28 h-28 bg-gradient-to-br ${avatarColor} rounded-full p-[3px] shadow-xl`}>
                <div className="w-full h-full bg-white rounded-full p-1">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Profile"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                      <User size={44} className="text-gray-400" />
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0.5 right-0.5 w-9 h-9 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg border-[3px] border-white hover:scale-110 active:scale-95 transition-transform"
              >
                <Camera size={15} className="text-white" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <h2 className="font-bold text-xl text-gray-900 mb-0.5">{user.name}</h2>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <p className="text-sm text-gray-500 font-semibold">{user.role}</p>
              <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                <Check size={9} className="text-white" strokeWidth={3} />
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mb-1">ID: {user.memberId}</p>
            {user.bio && <p className="text-xs text-gray-500 mb-3 leading-relaxed px-4">{user.bio}</p>}

            <div className="inline-flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-full border border-green-200 mb-4">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[11px] font-bold text-green-700">Leader Verified</span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {stats.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} onClick={s.onClick} className={`text-center group ${s.onClick ? "cursor-pointer" : ""}`}>
                    <div className={`w-11 h-11 mx-auto mb-1.5 rounded-2xl bg-gradient-to-br ${s.grad} flex items-center justify-center shadow-md transition-all ${s.onClick ? "group-hover:scale-110 group-hover:shadow-lg" : ""}`}>
                      <Icon size={18} className="text-white" />
                    </div>
                    <p className="font-bold text-lg leading-none text-gray-900">{s.value}</p>
                    <p className="text-[11px] font-medium mt-0.5 text-orange-500 underline underline-offset-2">{s.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Edit Profile button */}
            <button
              onClick={() => { setDraft({ ...user }); setActiveSheet("edit"); }}
              className="w-full h-11 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white font-bold text-sm rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Edit3 size={15} />
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* GPS / Tracking */}
      <div className="px-4 pb-4">
        <div className={`rounded-2xl shadow-md p-4 text-white ${gpsTracking ? "bg-gradient-to-br from-green-500 to-emerald-600" : "bg-gradient-to-br from-gray-400 to-gray-500"}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">GPS Tracking Status</h3>
            <Toggle on={gpsTracking} onToggle={() => setGpsTracking(v => !v)} />
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="opacity-80">Location Services</span>
              <span className="font-bold">{gpsTracking ? "Active" : "Disabled"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="opacity-80">Task Assignment</span>
              <span className="font-bold">12 Completed</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="opacity-80">Attendance Tracking</span>
              <span className="font-bold">95% This Month</span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="px-4 pb-6">
        <h3 className="font-bold text-sm text-gray-900 mb-3">Settings</h3>
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5">
          {[
            { icon: Bell,     grad: "from-blue-500 to-cyan-500",    label: "Notifications",    sheet: "notifications" as Sheet },
            { icon: Settings, grad: "from-indigo-500 to-violet-500",label: "Account Settings", sheet: "settings"      as Sheet },
            { icon: Shield,   grad: "from-purple-500 to-pink-500",  label: "Privacy",          sheet: "privacy"       as Sheet },
          ].map(({ icon: Icon, grad, label, sheet }) => (
            <button
              key={label}
              onClick={() => setActiveSheet(sheet)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 bg-gradient-to-br ${grad} rounded-xl flex items-center justify-center shadow-md`}>
                  <Icon size={16} className="text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-900">{label}</span>
              </div>
              <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
            </button>
          ))}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-4 hover:bg-red-50 active:bg-red-100 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
                <LogOut size={16} className="text-white" />
              </div>
              <span className="text-sm font-bold text-red-600">Logout</span>
            </div>
            <ChevronRight size={16} className="text-red-300 group-hover:text-red-500 transition-colors" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="pb-8 text-center">
        <p className="text-[10px] text-gray-300 font-medium">NCP-SP Connect v1.0 · © 2026 Nationalist Congress Party</p>
      </div>

      {/* ── MY POSTS SHEET ── */}
      {activeSheet === "posts" && (
        <>
          {/* Dim backdrop for desktop */}
          <div className="fixed inset-0 z-39 bg-black/30 hidden sm:block" onClick={() => setActiveSheet(null)} />
          {/* Full-screen overlay constrained to mobile width */}
          <div className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 bg-white flex flex-col shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center gap-3 px-4 pt-safe-top pt-4 pb-3 border-b border-gray-100">
              <button onClick={() => setActiveSheet(null)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors active:scale-95">
                <ArrowLeft size={20} className="text-gray-800" />
              </button>
              <div className="flex-1">
                <p className="font-bold text-base text-gray-900">{user.name}</p>
                <p className="text-[11px] text-gray-400">{postCount ?? 0} posts</p>
              </div>
            </div>

            {/* Instagram-style mini profile header */}
            <div className="px-4 py-4 flex items-center gap-4 border-b border-gray-100">
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${avatarColor} p-[2px] shadow-md shrink-0`}>
                <div className="w-full h-full bg-white rounded-full p-0.5">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                      <User size={26} className="text-gray-400" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="font-bold text-lg text-gray-900">{postCount ?? 0}</p>
                  <p className="text-xs text-gray-500">Posts</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-lg text-gray-900">{friendsCount ?? 0}</p>
                  <p className="text-xs text-gray-500">Friends</p>
                </div>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-gray-200">
              <div className="flex-1 flex items-center justify-center gap-1.5 py-3 border-b-2 border-gray-900">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-gray-900">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
                <span className="text-xs font-bold text-gray-900">Posts</span>
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto">
              {postsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader size={26} className="animate-spin text-gray-300" />
                </div>
              ) : myPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center mb-4">
                    <MessageSquare size={32} className="text-gray-200" />
                  </div>
                  <p className="font-bold text-gray-800 mb-1 text-lg">No posts yet</p>
                  <p className="text-sm text-gray-400">Start sharing your thoughts with the party network.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-[2px]">
                  {myPosts.map(post => (
                    <button
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className="relative aspect-square overflow-hidden group"
                    >
                      {/* Gradient tile */}
                      <div className={`w-full h-full bg-gradient-to-br ${postGradient(post.type)} flex flex-col items-center justify-center p-2`}>
                        {post.type === "event" && <Calendar size={16} className="text-white/70 mb-1 shrink-0" />}
                        {post.type === "campaign" && <Megaphone size={16} className="text-white/70 mb-1 shrink-0" />}
                        {post.type === "post" && <MessageSquare size={16} className="text-white/70 mb-1 shrink-0" />}
                        <p className="text-white text-[9px] font-semibold text-center leading-tight line-clamp-4">
                          {post.event_title || post.campaign_title || post.content}
                        </p>
                      </div>

                      {/* Hover overlay with stats */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <div className="flex items-center gap-1 text-white text-xs font-bold">
                          <Heart size={14} fill="white" />
                          {post.like_count}
                        </div>
                        <div className="flex items-center gap-1 text-white text-xs font-bold">
                          <MessageSquare size={14} fill="white" />
                          {post.comment_count}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Post detail modal ── */}
          {selectedPost && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center">
              <div className="w-full max-w-[430px] bg-white rounded-t-3xl max-h-[85vh] flex flex-col">
                {/* Modal header */}
                <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center`}>
                      {avatarPreview
                        ? <img src={avatarPreview} alt="" className="w-full h-full rounded-full object-cover" />
                        : <User size={16} className="text-white" />}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">{user.name}</p>
                      <p className="text-[10px] text-gray-400">{timeAgo(selectedPost.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDeletePost(selectedPost.id)}
                      disabled={deletingPost === selectedPost.id}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-red-50 hover:bg-red-100 text-red-500 transition-colors active:scale-95 disabled:opacity-50"
                    >
                      {deletingPost === selectedPost.id
                        ? <Loader size={15} className="animate-spin" />
                        : <Trash2 size={15} />}
                    </button>
                    <button onClick={() => setSelectedPost(null)} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors active:scale-95">
                      <X size={16} className="text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Post content */}
                <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4">
                  {/* Type badge */}
                  {selectedPost.type !== "post" && (
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${selectedPost.type === "event" ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700"}`}>
                      {selectedPost.type === "event" ? <Calendar size={10} /> : <Megaphone size={10} />}
                      {selectedPost.type === "event" ? "EVENT" : "CAMPAIGN"}
                    </span>
                  )}

                  {/* Event/Campaign title */}
                  {(selectedPost.event_title || selectedPost.campaign_title) && (
                    <p className="font-bold text-base text-gray-900">
                      {selectedPost.event_title || selectedPost.campaign_title}
                    </p>
                  )}

                  {/* Event meta */}
                  {selectedPost.event_date && (
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Calendar size={11} /> {new Date(selectedPost.event_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</span>
                      {selectedPost.event_time && <span>{selectedPost.event_time}</span>}
                      {selectedPost.event_location && <span className="flex items-center gap-1"><MapPin size={11} /> {selectedPost.event_location}</span>}
                    </div>
                  )}

                  {/* Campaign progress */}
                  {selectedPost.campaign_goal && (
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Goal: {selectedPost.campaign_goal}</span>
                        <span className="font-bold text-orange-600">{selectedPost.campaign_progress ?? 0}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-orange-400 to-pink-500 rounded-full transition-all" style={{ width: `${selectedPost.campaign_progress ?? 0}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Main content */}
                  <p className="text-sm text-gray-800 leading-relaxed">{selectedPost.content}</p>

                  {/* Stats row */}
                  <div className="flex items-center gap-5 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Heart size={16} className="text-red-400" fill="#f87171" />
                      <span className="font-bold text-gray-800">{selectedPost.like_count}</span>
                      <span>likes</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <MessageSquare size={16} className="text-blue-400" />
                      <span className="font-bold text-gray-800">{selectedPost.comment_count}</span>
                      <span>comments</span>
                    </div>
                  </div>
                </div>

                {/* Delete confirmation hint */}
                <div className="px-4 pb-6 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleDeletePost(selectedPost.id)}
                    disabled={deletingPost === selectedPost.id}
                    className="w-full h-11 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm rounded-2xl transition-colors active:scale-95 disabled:opacity-50"
                  >
                    {deletingPost === selectedPost.id ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    Delete Post
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── FRIENDS LIST SHEET ── */}
      {activeSheet === "friends" && (
        <BottomSheet title={`Friends${friendsCount !== null ? ` (${friendsCount})` : ""}`} onClose={() => setActiveSheet(null)}>
          <div className="pb-8">
            {friendsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader size={24} className="animate-spin text-orange-400" />
              </div>
            ) : friendsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <Users size={28} className="text-gray-300" />
                </div>
                <p className="font-bold text-gray-700 mb-1">No friends yet</p>
                <p className="text-xs text-gray-400">Send connection requests to other members to grow your network.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {friendsList.map(f => (
                  <div key={f.friendship_id} className="flex items-center gap-3 px-5 py-3.5">
                    {/* Avatar */}
                    <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${GRAD_MAP[f.friend_role] ?? "from-gray-400 to-gray-500"} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}>
                      {friendInitials(f.friend_name)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-900 truncate">{f.friend_name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[f.friend_role] ?? "bg-gray-100 text-gray-600"}`}>
                        {ROLE_LABELS_MAP[f.friend_role] ?? f.friend_role}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setActiveSheet(null);
                          navigate(`/community/${f.friend_id}`, {
                            state: { partnerName: f.friend_name, partnerRole: f.friend_role },
                          });
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-bold transition-colors active:scale-95"
                      >
                        <Send size={11} />
                        Message
                      </button>
                      <button
                        onClick={() => handleUnfriend(f.friendship_id)}
                        disabled={unfriending.has(f.friendship_id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl text-xs font-bold transition-colors active:scale-95 disabled:opacity-50"
                      >
                        {unfriending.has(f.friendship_id)
                          ? <Loader size={11} className="animate-spin" />
                          : <UserMinus size={11} />
                        }
                        Unfriend
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </BottomSheet>
      )}

      {/* ── EDIT PROFILE SHEET ── */}
      {activeSheet === "edit" && (
        <BottomSheet title="Edit Profile" onClose={() => setActiveSheet(null)}>
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Full Name</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={draft.name}
                  onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                  className="w-full h-11 pl-10 pr-4 rounded-2xl border-2 border-gray-100 bg-gray-50 text-sm text-gray-800 font-medium outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Bio</label>
              <textarea
                value={draft.bio}
                onChange={e => setDraft(d => ({ ...d, bio: e.target.value }))}
                rows={3}
                maxLength={120}
                className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 bg-gray-50 text-sm text-gray-800 outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
                placeholder="Tell others about yourself..."
              />
              <p className="text-[10px] text-gray-300 text-right mt-0.5">{draft.bio.length}/120</p>
            </div>
            <div className="flex gap-3 pt-2 pb-6">
              <button onClick={() => setActiveSheet(null)} className="flex-1 h-11 bg-gray-100 text-gray-700 font-bold text-sm rounded-2xl hover:bg-gray-200 active:scale-95 transition-all">
                Cancel
              </button>
              <button onClick={saveEdit} className="flex-1 h-11 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold text-sm rounded-2xl shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                <Check size={15} /> Save Changes
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* ── NOTIFICATIONS SHEET ── */}
      {activeSheet === "notifications" && (
        <BottomSheet title="Notifications" onClose={() => setActiveSheet(null)}>
          <div className="px-5 py-4 space-y-2 pb-8">
            {[
              { label: "Push Notifications",   sub: "Alerts on your device",           val: pushNotif,  set: setPushNotif,  icon: Bell  },
              { label: "Email Notifications",  sub: "Updates to your email",            val: emailNotif, set: setEmailNotif, icon: Mail  },
              { label: "SMS Alerts",           sub: "Text messages for urgent updates", val: smsNotif,   set: setSmsNotif,   icon: Phone },
            ].map(({ label, sub, val, set, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${val ? "bg-gradient-to-br from-blue-500 to-cyan-500" : "bg-gray-200"}`}>
                    <Icon size={16} className={val ? "text-white" : "text-gray-400"} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{label}</p>
                    <p className="text-[11px] text-gray-400">{sub}</p>
                  </div>
                </div>
                <Toggle on={val} onToggle={() => set((v: boolean) => !v)} />
              </div>
            ))}
            <div className="pt-2 px-1">
              <p className="text-[11px] text-gray-400 leading-relaxed">
                <Info size={11} className="inline mr-1" />
                Notification settings apply to all party communications and alerts.
              </p>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* ── ACCOUNT SETTINGS SHEET ── */}
      {activeSheet === "settings" && (
        <BottomSheet title="Account Settings" onClose={() => setActiveSheet(null)}>
          <div className="px-5 py-4 space-y-3 pb-8">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${isDark ? "bg-gradient-to-br from-gray-700 to-gray-900" : "bg-gray-200"}`}>
                  <Moon size={16} className={isDark ? "text-white" : "text-gray-400"} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Dark Mode</p>
                  <p className="text-[11px] text-gray-400">Reduce eye strain</p>
                </div>
              </div>
              <Toggle on={isDark} onToggle={toggleDark} />
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-sm">
                  <Globe size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Language</p>
                  <p className="text-[11px] text-gray-400">App display language</p>
                </div>
              </div>
              <div className="flex gap-2">
                {["English", "मराठी", "हिंदी"].map(lang => (
                  <button key={lang} className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${lang === "English" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"}`}>
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl">
              <p className="text-sm font-semibold text-gray-900 mb-1">Member ID</p>
              <p className="text-xs text-gray-400 font-mono bg-white px-3 py-2 rounded-xl border border-gray-100">{user.memberId}</p>
            </div>

            <button className="w-full p-4 bg-red-50 rounded-2xl flex items-center gap-3 hover:bg-red-100 active:scale-95 transition-all">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <Lock size={16} className="text-red-500" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-red-600">Change Password</p>
                <p className="text-[11px] text-red-400">Update your login credentials</p>
              </div>
              <ChevronRight size={16} className="text-red-300 ml-auto" />
            </button>
          </div>
        </BottomSheet>
      )}

      {/* ── PRIVACY SHEET ── */}
      {activeSheet === "privacy" && (
        <BottomSheet title="Privacy Settings" onClose={() => setActiveSheet(null)}>
          <div className="px-5 py-4 space-y-2 pb-8">
            {[
              { label: "Public Profile",    sub: "Anyone can view your profile",            val: profilePublic, set: setProfilePublic, icon: profilePublic ? Eye : EyeOff, grad: "from-blue-500 to-cyan-500"     },
              { label: "Show Activity",     sub: "Show your recent activity to members",    val: showActivity,  set: setShowActivity,  icon: showActivity  ? Eye : EyeOff, grad: "from-purple-500 to-pink-500"   },
              { label: "Show Contact Info", sub: "Let other members see your phone/email",  val: showContact,   set: setShowContact,   icon: Phone,                         grad: "from-emerald-500 to-teal-500"  },
              { label: "Location Sharing",  sub: "Share location during campaign events",   val: gpsTracking,   set: setGpsTracking,   icon: gpsTracking ? MapPin : MapPinOff, grad: "from-orange-500 to-amber-400" },
            ].map(({ label, sub, val, set, icon: Icon, grad }) => (
              <div key={label} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${val ? `bg-gradient-to-br ${grad}` : "bg-gray-200"}`}>
                    <Icon size={16} className={val ? "text-white" : "text-gray-400"} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{label}</p>
                    <p className="text-[11px] text-gray-400">{sub}</p>
                  </div>
                </div>
                <Toggle on={val} onToggle={() => set((v: boolean) => !v)} />
              </div>
            ))}
            <div className="pt-2 px-1">
              <p className="text-[11px] text-gray-400 leading-relaxed">
                <Info size={11} className="inline mr-1" />
                Your data is protected under the NCP-SP data privacy policy.
              </p>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
