/**
 * API Service - Handles all backend API calls
 * Base URL: http://localhost:3001/api (configurable via environment)
 */

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

// Get stored auth token from localStorage
const getAuthToken = (): string | null => {
  try {
    const stored = localStorage.getItem("ncp_auth");
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed.token || null;
  } catch {
    return null;
  }
};

// Make authenticated API call
async function apiCall(
  endpoint: string,
  method: string = "GET",
  body?: any
): Promise<any> {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Not authenticated. Please login first.");
  }

  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  return response.json();
}

/**
 * POSTS API
 */
export const postsAPI = {
  // Get feed with posts
  getFeed: (limit = 20, offset = 0) =>
    apiCall(`/posts?limit=${limit}&offset=${offset}`),

  // Create new post
  createPost: (content: string, type = "post", details?: any) =>
    apiCall("/posts", "POST", { type, content, ...details }),

  // Delete post
  deletePost: (postId: number) =>
    apiCall(`/posts/${postId}`, "DELETE"),

  // Toggle like on post
  toggleLike: (postId: number) =>
    apiCall(`/posts/${postId}/like`, "POST"),

  // Toggle bookmark on post
  toggleBookmark: (postId: number) =>
    apiCall(`/posts/${postId}/bookmark`, "POST"),

  // Get all comments for a post
  getComments: (postId: number) =>
    apiCall(`/posts/${postId}/comments`),

  // Add comment to post
  addComment: (postId: number, content: string, parent_id?: number) =>
    apiCall(`/posts/${postId}/comments`, "POST", { content, parent_id }),

  // Toggle like on comment
  toggleCommentLike: (commentId: number) =>
    apiCall(`/posts/comments/${commentId}/like`, "POST"),

  // Report a post
  reportPost: (postId: number, reason: string) =>
    apiCall(`/posts/${postId}/report`, "POST", { reason }),

  // Report a comment
  reportComment: (commentId: number, reason: string) =>
    apiCall(`/posts/comments/${commentId}/report`, "POST", { reason }),

  // Get all reported posts/comments (super_admin only)
  getReported: () =>
    apiCall("/posts/reported"),

  // Update report status: 'reviewed' | 'dismissed'
  updateReport: (reportId: number, status: "reviewed" | "dismissed") =>
    apiCall(`/posts/reports/${reportId}`, "PATCH", { status }),
};

/**
 * CAMPAIGN EVENTS API
 */
export const eventsAPI = {
  // Get all events
  getEvents: (limit = 50, offset = 0) =>
    apiCall(`/campaign/events?limit=${limit}&offset=${offset}`),

  // Toggle like on event
  toggleEventLike: (eventId: number) =>
    apiCall(`/campaign/events/${eventId}/like`, "POST"),

  // Set RSVP status
  setRsvp: (eventId: number, status: "going" | "interested" | "declined") =>
    apiCall(`/campaign/events/${eventId}/rsvp`, "POST", { status }),
};

/**
 * FRIENDS API
 */
export const friendsAPI = {
  // Send a friend / connection request to another user
  sendRequest: (toUserId: number) =>
    apiCall("/friends/request", "POST", { to_user_id: toUserId }),
};

export default { postsAPI, eventsAPI, friendsAPI };
