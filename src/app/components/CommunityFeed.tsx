import { Plus, Heart, MessageCircle, MoreVertical, Bookmark, Send, Loader, X, Flag, UserPlus, UserCheck, AlertTriangle } from "lucide-react";
import { Link } from "react-router";
import { useState, useEffect } from "react";
import { postsAPI, friendsAPI } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

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
  event_title?: string;
  event_date?: string;
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

export default function CommunityFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [liking, setLiking] = useState<Set<number>>(new Set());
  const [bookmarking, setBookmarking] = useState<Set<number>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [reportTarget, setReportTarget] = useState<{ type: "post" | "comment"; id: number } | null>(null);
  const [reportReason, setReportReason] = useState("spam");
  const [submittingReport, setSubmittingReport] = useState(false);
  // friend request tracking: Set of author_ids to whom we've sent requests
  const [friendRequests, setFriendRequests] = useState<Set<number>>(new Set());
  const [sendingFriend, setSendingFriend] = useState<Set<number>>(new Set());
  // spam reporting uses string keys "post:id" or "comment:id"
  const [spamReporting, setSpamReporting] = useState<Set<string>>(new Set());
  const [spamReported, setSpamReported] = useState<Set<string>>(new Set());
  const { isDark } = useTheme();

  // Fetch posts on component mount
  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await postsAPI.getFeed(20, 0);
      setPosts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts");
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (postId: number) => {
    try {
      setLoadingComments(true);
      const data = await postsAPI.getComments(postId);
      setComments(data);
    } catch (err) {
      console.error("Error fetching comments:", err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleLike = async (postId: number) => {
    try {
      setLiking(prev => new Set([...prev, postId]));
      const result = await postsAPI.toggleLike(postId);
      
      // Update local state
      setPosts(posts.map(post =>
        post.id === postId
          ? {
              ...post,
              liked_by_me: result.liked,
              like_count: result.count,
            }
          : post
      ));
    } catch (err) {
      console.error("Error toggling like:", err);
      alert("Failed to like post");
    } finally {
      setLiking(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  };

  const handleBookmark = async (postId: number) => {
    try {
      setBookmarking(prev => new Set([...prev, postId]));
      await postsAPI.toggleBookmark(postId);
      
      // Update local state
      setPosts(posts.map(post =>
        post.id === postId
          ? { ...post, bookmarked_by_me: !post.bookmarked_by_me }
          : post
      ));
    } catch (err) {
      console.error("Error toggling bookmark:", err);
      alert("Failed to bookmark post");
    } finally {
      setBookmarking(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  };

  const handleOpenComments = async (postId: number) => {
    setSelectedPostId(postId);
    await fetchComments(postId);
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !selectedPostId) return;

    try {
      setPostingComment(true);
      const newComment = await postsAPI.addComment(selectedPostId, commentText.trim());
      
      // Update comments list
      setComments([...comments, newComment]);
      
      // Update post comment count
      setPosts(posts.map(post =>
        post.id === selectedPostId
          ? { ...post, comment_count: post.comment_count + 1 }
          : post
      ));
      
      setCommentText("");
    } catch (err) {
      console.error("Error adding comment:", err);
      alert("Failed to add comment");
    } finally {
      setPostingComment(false);
    }
  };

  const handleReport = async () => {
    if (!reportTarget) return;
    try {
      setSubmittingReport(true);
      if (reportTarget.type === "post") {
        await postsAPI.reportPost(reportTarget.id, reportReason);
      } else {
        await postsAPI.reportComment(reportTarget.id, reportReason);
      }
      setReportTarget(null);
      setReportReason("spam");
      alert("Report submitted. Our moderation team will review it.");
    } catch {
      alert("Failed to submit report");
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleReportSpam = async (type: "post" | "comment", id: number) => {
    const key = `${type}:${id}`;
    setSpamReporting(prev => new Set([...prev, key]));
    setOpenMenuId(null);
    try {
      if (type === "post") await postsAPI.reportPost(id, "spam");
      else await postsAPI.reportComment(id, "spam");
      setSpamReported(prev => new Set([...prev, key]));
    } catch {
      // silent — spam report best-effort
    } finally {
      setSpamReporting(prev => { const s = new Set(prev); s.delete(key); return s; });
    }
  };

  const handleAddFriend = async (authorId: number) => {
    setSendingFriend(prev => new Set([...prev, authorId]));
    setFriendRequests(prev => new Set([...prev, authorId])); // optimistic
    try {
      await friendsAPI.sendRequest(authorId);
    } catch {
      // keep optimistic state — request likely sent even if API returns error
    } finally {
      setSendingFriend(prev => { const s = new Set(prev); s.delete(authorId); return s; });
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" : "bg-gray-50"}`}>
      {/* Header with Vibrant Gradient */}
      <div className="bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 text-white p-6 pb-8 rounded-b-[2rem] shadow-2xl relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(251,146,60,0.2),transparent_50%)]"></div>
        
        <div className="relative z-10">
          <h1 className="font-bold text-2xl mb-1 tracking-tight">Community</h1>
          <p className="text-sm text-purple-50">Connect with party members</p>
        </div>
      </div>

      {/* Create Post Button - Enhanced Floating Style */}
      <div className="px-4 -mt-4 mb-5">
        <Link
          to="/community/create"
          className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-xl border border-slate-100 hover:shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-sm">You</span>
          </div>
          <span className="text-slate-400 flex-1 font-medium">What's on your mind?</span>
          <div className="w-11 h-11 bg-gradient-to-br from-orange-500 via-orange-400 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform">
            <Plus size={20} className="text-white" />
          </div>
        </Link>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="px-4 pb-6">
          <div className="bg-white rounded-2xl shadow-md p-8 flex flex-col items-center justify-center gap-3">
            <Loader className="animate-spin text-purple-600" size={32} />
            <p className="text-slate-600 font-medium">Loading posts...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="px-4 pb-6">
          <div className="bg-red-50 border border-red-200 rounded-2xl shadow-md p-4">
            <p className="text-red-700 font-medium">Error: {error}</p>
            <button
              onClick={fetchPosts}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Posts Feed */}
      <div className="space-y-4 px-4 pb-6">
        {!loading && posts.length === 0 && (
          <div className="bg-white rounded-2xl shadow-md p-8 text-center">
            <p className="text-slate-500">No posts yet. Start the conversation!</p>
          </div>
        )}

        {posts.map((post) => (
          <div key={post.id} className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-xl hover:border-purple-200 transition-all">
            {/* Post Header */}
            <div className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-md shrink-0">
                <span className="text-white font-bold text-sm">{post.author_name.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm text-slate-900 truncate">{post.author_name}</h3>
                <p className="text-xs text-slate-500">{post.author_role} · {new Date(post.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}</p>
              </div>

              {/* Add Friend button — only for other users' posts */}
              {post.author_id !== user?.id && (
                <button
                  onClick={() => !friendRequests.has(post.author_id) && handleAddFriend(post.author_id)}
                  disabled={sendingFriend.has(post.author_id)}
                  className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 disabled:opacity-60 ${
                    friendRequests.has(post.author_id)
                      ? "bg-green-50 border-green-200 text-green-600 cursor-default"
                      : "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"
                  }`}
                >
                  {friendRequests.has(post.author_id)
                    ? <><UserCheck size={12} /> Added</>
                    : sendingFriend.has(post.author_id)
                      ? <Loader size={12} className="animate-spin" />
                      : <><UserPlus size={12} /> Add</>
                  }
                </button>
              )}

              {/* Three-dot menu */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <MoreVertical size={18} className="text-slate-400" />
                </button>
                {openMenuId === post.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                    <div className="absolute right-0 top-9 z-20 bg-white rounded-2xl shadow-xl border border-gray-100 py-1 min-w-[180px]">
                      {/* Quick spam report */}
                      <button
                        onClick={() => handleReportSpam("post", post.id)}
                        disabled={spamReporting.has(`post:${post.id}`) || spamReported.has(`post:${post.id}`)}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-50"
                      >
                        {spamReported.has(`post:${post.id}`)
                          ? <><AlertTriangle size={14} className="text-orange-400" /> Reported as Spam</>
                          : spamReporting.has(`post:${post.id}`)
                            ? <><Loader size={14} className="animate-spin" /> Reporting…</>
                            : <><AlertTriangle size={14} /> Report as Spam</>
                        }
                      </button>
                      <div className="mx-3 h-px bg-gray-100" />
                      {/* Full report dialog */}
                      <button
                        onClick={() => {
                          setReportReason("inappropriate");
                          setReportTarget({ type: "post", id: post.id });
                          setOpenMenuId(null);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Flag size={14} />
                        Report Post
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Post Content */}
            <div className="px-4 pb-3">
              <p className="text-sm text-slate-700 leading-relaxed">{post.content}</p>
            </div>

            {/* Post Stats */}
            <div className="px-4 py-3 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-1">
                  <div className="w-5 h-5 bg-gradient-to-br from-red-400 to-pink-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                    <Heart size={10} className="text-white" fill="white" />
                  </div>
                  <div className="w-5 h-5 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full border-2 border-white shadow-sm"></div>
                </div>
                <span className="ml-1 font-semibold text-gray-700">{post.like_count}</span>
              </div>
              <div className="flex gap-4">
                <span className="font-semibold text-gray-700">{post.comment_count} comments</span>
              </div>
            </div>

            {/* Post Actions */}
            <div className="px-2 py-1 flex items-center border-t border-slate-100">
              <button
                onClick={() => handleLike(post.id)}
                disabled={liking.has(post.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all disabled:opacity-50 ${
                  post.liked_by_me
                    ? 'text-pink-600 bg-gradient-to-r from-pink-50 to-orange-50'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Heart size={18} fill={post.liked_by_me ? 'currentColor' : 'none'} strokeWidth={2.5} />
                <span className="text-sm font-bold">Like</span>
              </button>
              <button
                onClick={() => handleOpenComments(post.id)}
                className="flex-1 flex items-center justify-center gap-2 text-slate-600 py-3 px-4 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 hover:text-blue-600 transition-all"
              >
                <MessageCircle size={18} strokeWidth={2.5} />
                <span className="text-sm font-bold">Comment</span>
              </button>
              <button
                onClick={() => handleBookmark(post.id)}
                disabled={bookmarking.has(post.id)}
                className={`p-3 rounded-xl transition-all disabled:opacity-50 ${
                  post.bookmarked_by_me
                    ? 'text-blue-600 bg-gradient-to-br from-blue-50 to-cyan-50'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Bookmark size={18} fill={post.bookmarked_by_me ? 'currentColor' : 'none'} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Comments Modal */}
      {selectedPostId !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end z-50">
          <div className="bg-white w-full rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-10">
            {/* Modal Header */}
            <div className="p-4 flex items-center justify-between border-b border-slate-100">
              <h2 className="font-bold text-lg">Comments ({comments.length})</h2>
              <button
                onClick={() => {
                  setSelectedPostId(null);
                  setComments([]);
                  setCommentText("");
                }}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={20} className="text-slate-600" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingComments && (
                <div className="flex justify-center py-8">
                  <Loader className="animate-spin text-purple-600" size={24} />
                </div>
              )}

              {!loadingComments && comments.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-slate-500">No comments yet. Be the first!</p>
                </div>
              )}

              {comments.map((comment) => (
                <div key={comment.id} className="border border-slate-100 rounded-2xl p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-900">{comment.author_name}</p>
                      <p className="text-xs text-slate-500">{comment.author_role}</p>
                    </div>
                    {/* Comment report buttons */}
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {spamReported.has(`comment:${comment.id}`) ? (
                        <span className="text-[10px] text-orange-500 font-semibold px-2 py-0.5 bg-orange-50 rounded-full border border-orange-200">
                          Reported
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleReportSpam("comment", comment.id)}
                            disabled={spamReporting.has(`comment:${comment.id}`)}
                            title="Report as Spam"
                            className="p-1.5 rounded-lg hover:bg-orange-50 transition-colors text-slate-300 hover:text-orange-500 disabled:opacity-50"
                          >
                            {spamReporting.has(`comment:${comment.id}`)
                              ? <Loader size={12} className="animate-spin text-orange-400" />
                              : <AlertTriangle size={12} />
                            }
                          </button>
                          <button
                            onClick={() => {
                              setReportReason("inappropriate");
                              setReportTarget({ type: "comment", id: comment.id });
                            }}
                            title="Report Comment"
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-slate-300 hover:text-red-500"
                          >
                            <Flag size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 mb-2">{comment.content}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <Heart
                      size={14}
                      className={comment.liked_by_me ? "text-pink-600" : "text-slate-400"}
                      fill={comment.liked_by_me ? "currentColor" : "none"}
                    />
                    <span className="text-slate-500">{comment.like_count}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Comment Input */}
            <div className="border-t border-slate-100 p-4 flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
              />
              <button
                onClick={handleAddComment}
                disabled={postingComment || !commentText.trim()}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {postingComment ? (
                  <Loader size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Report Bottom Sheet ────────────────────────────── */}
      {reportTarget && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setReportTarget(null)}
          />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm z-50 bg-white rounded-t-3xl shadow-2xl p-6">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-2xl flex items-center justify-center">
                <Flag size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900">Report {reportTarget.type === "post" ? "Post" : "Comment"}</h3>
                <p className="text-xs text-gray-400">Help us keep the community safe</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-3 font-medium">Why are you reporting this?</p>
            <div className="space-y-2 mb-5">
              {[
                { value: "inappropriate", label: "Inappropriate content" },
                { value: "spam",          label: "Spam or misleading" },
                { value: "hate_speech",   label: "Hate speech" },
                { value: "misinformation",label: "Misinformation" },
                { value: "other",         label: "Other" },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setReportReason(opt.value)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    reportReason === opt.value
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {opt.label}
                  {reportReason === opt.value && (
                    <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setReportTarget(null)}
                className="flex-1 h-11 bg-gray-100 text-gray-700 font-bold text-sm rounded-2xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReport}
                disabled={submittingReport}
                className="flex-1 h-11 bg-gradient-to-r from-red-500 to-pink-600 text-white font-bold text-sm rounded-2xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submittingReport ? <Loader size={16} className="animate-spin" /> : <Flag size={16} />}
                Submit Report
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}