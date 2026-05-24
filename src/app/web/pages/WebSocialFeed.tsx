import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { postsAPI } from "../../services/api";
import {
  Heart, MessageCircle, Bookmark, Send, Loader,
  MoreVertical, Trash2, X, RefreshCw, Users,
  TrendingUp, Hash, Rss, Flag, CheckCircle2, XCircle,
} from "lucide-react";

interface Post {
  id: number;
  author_id: number;
  author_name: string;
  author_role: string;
  content: string;
  type: string;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  bookmarked_by_me: boolean;
  created_at: string;
}

interface Report {
  report_id: number;
  reason: string;
  status: "pending" | "reviewed" | "dismissed";
  reported_at: string;
  reviewed_at: string | null;
  reporter_name: string;
  reporter_role: string;
  // post report fields
  post_id: number | null;
  post_content: string | null;
  post_author_name: string | null;
  post_author_role: string | null;
  post_created_at: string | null;
  // comment report fields
  comment_id: number | null;
  comment_content: string | null;
  comment_author_name: string | null;
  comment_author_role: string | null;
  comment_created_at: string | null;
  comment_post_id: number | null;
}

interface Comment {
  id: number;
  content: string;
  author_name: string;
  author_role: string;
  like_count: number;
  liked_by_me: boolean;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin:     "Super Admin",
  state_leader:    "State Leader",
  district_leader: "District Leader",
  observer:        "Observer",
  booth_worker:    "Booth Worker",
  taluka_leader:   "Taluka Leader",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin:     "bg-red-100 text-red-700",
  state_leader:    "bg-blue-100 text-blue-700",
  district_leader: "bg-purple-100 text-purple-700",
  observer:        "bg-gray-100 text-gray-600",
  booth_worker:    "bg-green-100 text-green-700",
  taluka_leader:   "bg-orange-100 text-orange-700",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "from-blue-600 to-cyan-500",
  "from-purple-600 to-pink-500",
  "from-emerald-600 to-teal-500",
  "from-orange-500 to-amber-400",
  "from-rose-500 to-pink-600",
  "from-indigo-600 to-violet-500",
];
function avatarColor(name: string) {
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

export default function WebSocialFeed() {
  const { user } = useAuth();
  const isAdmin = user?.role === "super_admin";

  const [activeTab, setActiveTab] = useState<"feed" | "reported">("feed");
  const [posts, setPosts]         = useState<Post[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [reports, setReports]     = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [updatingReport, setUpdatingReport] = useState<Set<number>>(new Set());
  const [liking, setLiking]       = useState<Set<number>>(new Set());
  const [bookmarking, setBookmarking] = useState<Set<number>>(new Set());
  const [deleting, setDeleting]   = useState<Set<number>>(new Set());
  const [openMenu, setOpenMenu]   = useState<number | null>(null);

  // Comment slide-over
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments]         = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText]   = useState("");
  const [postingComment, setPostingComment] = useState(false);

  // Create post
  const [newContent, setNewContent]   = useState("");
  const [creatingPost, setCreatingPost] = useState(false);

  useEffect(() => { fetchPosts(); }, []);
  useEffect(() => { if (isAdmin && activeTab === "reported") fetchReports(); }, [activeTab]);

  async function fetchReports() {
    try {
      setLoadingReports(true);
      const data = await postsAPI.getReported();
      setReports(data);
    } catch { /* silent */ }
    finally { setLoadingReports(false); }
  }

  async function handleUpdateReport(reportId: number, status: "reviewed" | "dismissed") {
    try {
      setUpdatingReport(prev => new Set([...prev, reportId]));
      await postsAPI.updateReport(reportId, status);
      setReports(prev => prev.map(r =>
        r.report_id === reportId ? { ...r, status, reviewed_at: new Date().toISOString() } : r
      ));
    } catch { alert("Failed to update report"); }
    finally {
      setUpdatingReport(prev => { const s = new Set(prev); s.delete(reportId); return s; });
    }
  }

  async function fetchPosts() {
    try {
      setLoading(true);
      setError(null);
      const data = await postsAPI.getFeed(50, 0);
      setPosts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePost() {
    if (!newContent.trim()) return;
    try {
      setCreatingPost(true);
      const post = await postsAPI.createPost(newContent.trim());
      setPosts(prev => [post, ...prev]);
      setNewContent("");
    } catch { alert("Failed to create post"); }
    finally { setCreatingPost(false); }
  }

  async function handleLike(postId: number) {
    try {
      setLiking(prev => new Set([...prev, postId]));
      const result = await postsAPI.toggleLike(postId);
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, liked_by_me: result.liked, like_count: result.count } : p
      ));
    } catch { alert("Failed to like post"); }
    finally { setLiking(prev => { const s = new Set(prev); s.delete(postId); return s; }); }
  }

  async function handleBookmark(postId: number) {
    try {
      setBookmarking(prev => new Set([...prev, postId]));
      await postsAPI.toggleBookmark(postId);
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, bookmarked_by_me: !p.bookmarked_by_me } : p
      ));
    } catch { alert("Failed to bookmark post"); }
    finally { setBookmarking(prev => { const s = new Set(prev); s.delete(postId); return s; }); }
  }

  async function handleDelete(postId: number) {
    if (!confirm("Delete this post?")) return;
    try {
      setDeleting(prev => new Set([...prev, postId]));
      await postsAPI.deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      if (selectedPost?.id === postId) closeComments();
    } catch { alert("Failed to delete post"); }
    finally {
      setDeleting(prev => { const s = new Set(prev); s.delete(postId); return s; });
      setOpenMenu(null);
    }
  }

  async function openComments(post: Post) {
    setSelectedPost(post);
    setComments([]);
    setLoadingComments(true);
    try {
      const data = await postsAPI.getComments(post.id);
      setComments(data);
    } catch { /* silent */ }
    finally { setLoadingComments(false); }
  }

  function closeComments() {
    setSelectedPost(null);
    setComments([]);
    setCommentText("");
  }

  async function handleAddComment() {
    if (!commentText.trim() || !selectedPost) return;
    try {
      setPostingComment(true);
      const c = await postsAPI.addComment(selectedPost.id, commentText.trim());
      setComments(prev => [...prev, c]);
      setPosts(prev => prev.map(p =>
        p.id === selectedPost.id ? { ...p, comment_count: p.comment_count + 1 } : p
      ));
      setCommentText("");
    } catch { alert("Failed to add comment"); }
    finally { setPostingComment(false); }
  }

  // Derived stats for sidebar
  const totalLikes = posts.reduce((s, p) => s + p.like_count, 0);
  const totalComments = posts.reduce((s, p) => s + p.comment_count, 0);
  const uniqueAuthors = new Set(posts.map(p => p.author_name)).size;

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Social Feed</h1>
          <p className="text-sm text-gray-400 mt-0.5">Community posts from all party members</p>
        </div>
        <button
          onClick={activeTab === "feed" ? fetchPosts : fetchReports}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
        >
          <RefreshCw size={14} className={(loading || loadingReports) ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Tabs ────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        <button
          onClick={() => setActiveTab("feed")}
          className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === "feed"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <span className="flex items-center gap-2">
            <Rss size={14} />
            All Posts
          </span>
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab("reported")}
            className={`px-5 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === "reported"
                ? "bg-white text-red-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Flag size={14} />
            Reported
            {reports.filter(r => r.status === "pending").length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {reports.filter(r => r.status === "pending").length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* ── Reported Posts tab (super_admin only) ───────────── */}
      {activeTab === "reported" && isAdmin && (
        <div className="flex gap-6 items-start">
          <div className="flex-1 min-w-0 space-y-4">

            {loadingReports && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center py-12 text-gray-400">
                <Loader className="animate-spin mb-3" size={24} />
                <p className="text-sm">Loading reports...</p>
              </div>
            )}

            {!loadingReports && reports.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm text-center py-16">
                <p className="text-4xl mb-3">✅</p>
                <p className="font-bold text-gray-700">No reports</p>
                <p className="text-sm text-gray-400 mt-1">The community is behaving well!</p>
              </div>
            )}

            {!loadingReports && reports.map(r => (
              <div
                key={r.report_id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                  r.status === "pending" ? "border-red-200" : "border-gray-200"
                }`}
              >
                {/* Report meta */}
                <div className={`px-5 py-3 flex items-center justify-between ${
                  r.status === "pending" ? "bg-red-50" : "bg-gray-50"
                }`}>
                  <div className="flex items-center gap-2">
                    <Flag size={14} className={r.status === "pending" ? "text-red-500" : "text-gray-400"} />
                    <span className="text-xs font-bold text-gray-700">
                      Reported by <span className="text-gray-900">{r.reporter_name}</span>
                    </span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500">{timeAgo(r.reported_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full capitalize ${
                      r.status === "pending"   ? "bg-red-100 text-red-700" :
                      r.status === "reviewed"  ? "bg-green-100 text-green-700" :
                                                 "bg-gray-100 text-gray-500"
                    }`}>
                      {r.status}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                      r.reason === "inappropriate" ? "bg-orange-100 text-orange-700" :
                      r.reason === "spam"          ? "bg-yellow-100 text-yellow-700" :
                      r.reason === "hate_speech"   ? "bg-red-100 text-red-700" :
                      r.reason === "misinformation"? "bg-purple-100 text-purple-700" :
                                                     "bg-gray-100 text-gray-600"
                    }`}>
                      {r.reason.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Reported content */}
                <div className="px-5 py-4">
                  {r.post_id && (
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Reported Post</p>
                      <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor(r.post_author_name ?? "")} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                          {initials(r.post_author_name ?? "")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-sm text-gray-900">{r.post_author_name}</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[r.post_author_role ?? ""] ?? "bg-gray-100 text-gray-600"}`}>
                              {ROLE_LABELS[r.post_author_role ?? ""] ?? r.post_author_role}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 leading-snug">{r.post_content}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {r.comment_id && (
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Reported Comment</p>
                      <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor(r.comment_author_name ?? "")} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                          {initials(r.comment_author_name ?? "")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-sm text-gray-900">{r.comment_author_name}</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[r.comment_author_role ?? ""] ?? "bg-gray-100 text-gray-600"}`}>
                              {ROLE_LABELS[r.comment_author_role ?? ""] ?? r.comment_author_role}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 leading-snug">{r.comment_content}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {r.status === "pending" && (
                  <div className="flex border-t border-gray-100">
                    <button
                      onClick={() => handleUpdateReport(r.report_id, "reviewed")}
                      disabled={updatingReport.has(r.report_id)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50 border-r border-gray-100"
                    >
                      {updatingReport.has(r.report_id)
                        ? <Loader size={14} className="animate-spin" />
                        : <CheckCircle2 size={14} />}
                      Mark Reviewed
                    </button>
                    <button
                      onClick={() => handleUpdateReport(r.report_id, "dismissed")}
                      disabled={updatingReport.has(r.report_id)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {updatingReport.has(r.report_id)
                        ? <Loader size={14} className="animate-spin" />
                        : <XCircle size={14} />}
                      Dismiss
                    </button>
                  </div>
                )}

                {r.status !== "pending" && r.reviewed_at && (
                  <div className="px-5 py-2 border-t border-gray-100 text-xs text-gray-400">
                    {r.status === "reviewed" ? "✅" : "⛔"} {r.status === "reviewed" ? "Reviewed" : "Dismissed"} {timeAgo(r.reviewed_at)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Sidebar: report stats */}
          <div className="w-72 shrink-0 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-black text-sm text-gray-900 mb-4 flex items-center gap-2">
                <Flag size={15} className="text-red-500" />
                Report Summary
              </h3>
              <div className="space-y-3">
                {[
                  { label: "Total Reports",   count: reports.length,                                    color: "text-gray-900" },
                  { label: "Pending Review",  count: reports.filter(r => r.status === "pending").length,  color: "text-red-600" },
                  { label: "Reviewed",        count: reports.filter(r => r.status === "reviewed").length, color: "text-green-600" },
                  { label: "Dismissed",       count: reports.filter(r => r.status === "dismissed").length,color: "text-gray-400" },
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{label}</span>
                    <span className={`font-black text-base ${color}`}>{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-red-800 mb-1 flex items-center gap-1">
                <Flag size={11} /> Moderation Guide
              </p>
              <p className="text-xs text-red-600 leading-relaxed">
                Review flagged content and mark it as reviewed (action taken) or dismissed (false report). Reviewed reports can still have the post deleted from the All Posts tab.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Two-column desktop layout ────────────────────────── */}
      {activeTab === "feed" && <div className="flex gap-6 items-start">

        {/* ── Left: main feed ─────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Create post */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex gap-3">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor(user?.name ?? "U")} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                {initials(user?.name ?? "U")}
              </div>
              <div className="flex-1">
                <textarea
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="Share an update with party members..."
                  rows={3}
                  className="w-full resize-none text-sm text-gray-800 placeholder:text-gray-400 outline-none border border-gray-200 rounded-xl px-3 py-2.5 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                />
                <div className="flex justify-between items-center mt-2.5">
                  <span className="text-xs text-gray-400">{newContent.length} characters</span>
                  <button
                    onClick={handleCreatePost}
                    disabled={!newContent.trim() || creatingPost}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    {creatingPost
                      ? <Loader size={14} className="animate-spin" />
                      : <Rss size={14} />}
                    Publish Post
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-16 text-gray-400">
              <Loader className="animate-spin mb-3" size={28} />
              <p className="text-sm font-medium">Loading posts...</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
              <p className="text-sm text-red-700 font-medium">{error}</p>
              <button onClick={fetchPosts} className="text-sm text-red-600 font-semibold hover:text-red-800 ml-4 shrink-0">
                Retry
              </button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && posts.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm text-center py-16 text-gray-400">
              <p className="text-5xl mb-3">📭</p>
              <p className="font-semibold text-gray-600">No posts yet</p>
              <p className="text-sm mt-1">Be the first to share something!</p>
            </div>
          )}

          {/* Posts */}
          {posts.map(post => (
            <div
              key={post.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Post header */}
              <div className="flex items-center gap-3 p-5 pb-3">
                <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarColor(post.author_name)} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                  {initials(post.author_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900">{post.author_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[post.author_role] ?? "bg-gray-100 text-gray-600"}`}>
                      {ROLE_LABELS[post.author_role] ?? post.author_role}
                    </span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-400">{timeAgo(post.created_at)}</span>
                  </div>
                </div>

                {/* Menu */}
                <div className="relative">
                  <button
                    onClick={() => setOpenMenu(openMenu === post.id ? null : post.id)}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {openMenu === post.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                      <div className="absolute right-0 top-10 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[160px]">
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(post.id)}
                            disabled={deleting.has(post.id)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            {deleting.has(post.id)
                              ? <Loader size={13} className="animate-spin" />
                              : <Trash2 size={13} />}
                            Delete Post
                          </button>
                        )}
                        <button
                          onClick={() => setOpenMenu(null)}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          <X size={13} />
                          Close
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="px-5 pb-4">
                <p className="text-sm text-gray-800 leading-relaxed">{post.content}</p>
              </div>

              {/* Stats row */}
              <div className="px-5 py-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-gradient-to-br from-red-400 to-pink-500 rounded-full flex items-center justify-center">
                    <Heart size={8} className="text-white" fill="white" />
                  </div>
                  <span className="font-semibold text-gray-700">{post.like_count} likes</span>
                </div>
                <button
                  onClick={() => openComments(post)}
                  className="hover:text-blue-600 transition-colors font-semibold"
                >
                  {post.comment_count} comment{post.comment_count !== 1 ? "s" : ""}
                </button>
              </div>

              {/* Action bar */}
              <div className="flex border-t border-gray-100">
                <button
                  onClick={() => handleLike(post.id)}
                  disabled={liking.has(post.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors disabled:opacity-50 ${
                    post.liked_by_me
                      ? "text-pink-600 bg-pink-50 hover:bg-pink-100"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                  }`}
                >
                  <Heart size={15} fill={post.liked_by_me ? "currentColor" : "none"} />
                  Like
                </button>
                <button
                  onClick={() => openComments(post)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-gray-500 hover:bg-blue-50 hover:text-blue-700 transition-colors border-l border-r border-gray-100"
                >
                  <MessageCircle size={15} />
                  Comment
                </button>
                <button
                  onClick={() => handleBookmark(post.id)}
                  disabled={bookmarking.has(post.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors disabled:opacity-50 ${
                    post.bookmarked_by_me
                      ? "text-blue-600 bg-blue-50 hover:bg-blue-100"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                  }`}
                >
                  <Bookmark size={15} fill={post.bookmarked_by_me ? "currentColor" : "none"} />
                  Save
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ── Right: sidebar ──────────────────────────────── */}
        <div className="w-72 shrink-0 space-y-4">

          {/* Feed stats */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-black text-sm text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp size={15} className="text-blue-600" />
              Feed Stats
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Hash size={13} className="text-gray-400" />
                  Total Posts
                </div>
                <span className="font-black text-gray-900">{posts.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Heart size={13} className="text-pink-400" />
                  Total Likes
                </div>
                <span className="font-black text-gray-900">{totalLikes}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MessageCircle size={13} className="text-blue-400" />
                  Total Comments
                </div>
                <span className="font-black text-gray-900">{totalComments}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users size={13} className="text-emerald-400" />
                  Active Members
                </div>
                <span className="font-black text-gray-900">{uniqueAuthors}</span>
              </div>
            </div>
          </div>

          {/* Most active authors */}
          {posts.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-black text-sm text-gray-900 mb-4 flex items-center gap-2">
                <Users size={15} className="text-blue-600" />
                Top Contributors
              </h3>
              <div className="space-y-3">
                {(() => {
                  const counts: Record<string, { name: string; role: string; count: number }> = {};
                  posts.forEach(p => {
                    if (!counts[p.author_name]) counts[p.author_name] = { name: p.author_name, role: p.author_role, count: 0 };
                    counts[p.author_name].count++;
                  });
                  return Object.values(counts)
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5)
                    .map(({ name, role, count }) => (
                      <div key={name} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColor(name)} flex items-center justify-center text-white font-bold text-[10px] shrink-0`}>
                          {initials(name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">{name}</p>
                          <p className="text-[10px] text-gray-400">{ROLE_LABELS[role] ?? role}</p>
                        </div>
                        <span className="text-xs font-bold text-blue-600 shrink-0">{count} post{count !== 1 ? "s" : ""}</span>
                      </div>
                    ));
                })()}
              </div>
            </div>
          )}

          {/* Platform note */}
          <div className="bg-gradient-to-br from-blue-700 to-cyan-600 rounded-2xl p-5 text-white shadow-sm">
            <Rss size={18} className="mb-2 opacity-80" />
            <p className="font-black text-sm mb-1">Community Feed</p>
            <p className="text-xs text-blue-100 leading-relaxed">
              Posts are visible to all party members. Promote party activities and keep members informed.
            </p>
          </div>
        </div>
      </div>}

      {/* ── Comment slide-over panel ────────────────────────── */}
      {selectedPost && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30"
            onClick={closeComments}
          />
          <div className="fixed right-0 top-0 h-full w-[440px] bg-white shadow-2xl z-40 flex flex-col border-l border-gray-200">

            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="font-black text-base text-gray-900">
                Comments
                <span className="text-gray-400 font-normal text-sm ml-1.5">({comments.length})</span>
              </h2>
              <button
                onClick={closeComments}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            {/* Original post preview */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 shrink-0">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor(selectedPost.author_name)} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                  {initials(selectedPost.author_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900">{selectedPost.author_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{timeAgo(selectedPost.created_at)}</p>
                  <p className="text-sm text-gray-700 mt-2 leading-snug line-clamp-3">{selectedPost.content}</p>
                </div>
              </div>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {loadingComments && (
                <div className="flex justify-center py-8">
                  <Loader className="animate-spin text-blue-600" size={22} />
                </div>
              )}

              {!loadingComments && comments.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <MessageCircle size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No comments yet. Start the conversation!</p>
                </div>
              )}

              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColor(c.author_name)} flex items-center justify-center text-white font-bold text-[10px] shrink-0 mt-0.5`}>
                    {initials(c.author_name)}
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-xs text-gray-900">{c.author_name}</p>
                      <span className="text-[10px] text-gray-400">·</span>
                      <p className="text-[10px] text-gray-400">{timeAgo(c.created_at)}</p>
                      {c.like_count > 0 && (
                        <span className="ml-auto flex items-center gap-0.5 text-[10px] text-pink-500">
                          <Heart size={10} fill="currentColor" />
                          {c.like_count}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 leading-snug">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Comment input */}
            <div className="px-6 py-4 border-t border-gray-100 shrink-0">
              <div className="flex gap-3">
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor(user?.name ?? "U")} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                  {initials(user?.name ?? "U")}
                </div>
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                    className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={postingComment || !commentText.trim()}
                    className="w-10 h-10 flex items-center justify-center bg-blue-700 text-white rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-40 shrink-0"
                  >
                    {postingComment ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
