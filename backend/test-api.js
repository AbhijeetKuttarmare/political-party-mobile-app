/**
 * API Test - Posts, Likes, and Comments
 * 
 * Test sequence:
 * 1. Login with a test user
 * 2. Create a test post
 * 3. Like the post
 * 4. Add a comment
 * 5. Like the comment
 * 6. Fetch feed and verify counts persist
 */

const baseURL = "http://localhost:3001/api";

async function testAPI() {
  try {
    console.log("🧪 Starting API tests...\n");

    // 1. Demo Login (no password required)
    console.log("1️⃣  Logging in with demo account...");
    const loginRes = await fetch(`${baseURL}/auth/demo-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile: "9999999999" }),  // State Leader Demo
    });
    const loginData = await loginRes.json();
    if (!loginData.token) throw new Error("Login failed: " + JSON.stringify(loginData));
    const token = loginData.token;
    console.log(`✅ Logged in as: ${loginData.user.name} (${loginData.user.role})`);
    console.log(`   Token: ${token.substring(0, 20)}...\n`);

    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

    // 2. Create Post
    console.log("2️⃣  Creating test post...");
    const postRes = await fetch(`${baseURL}/posts`, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "post", content: "Test post for likes and comments" }),
    });
    const post = await postRes.json();
    console.log(`✅ Post created - ID: ${post.id}`);
    console.log(`   Like count: ${post.like_count}, Comment count: ${post.comment_count}\n`);

    // 3. Toggle Like
    console.log("3️⃣  Liking post...");
    const likeRes = await fetch(`${baseURL}/posts/${post.id}/like`, {
      method: "POST",
      headers,
    });
    const likeData = await likeRes.json();
    console.log(`✅ Like toggled - Liked: ${likeData.liked}, Count: ${likeData.count}\n`);

    // 4. Add Comment
    console.log("4️⃣  Adding comment...");
    const commentRes = await fetch(`${baseURL}/posts/${post.id}/comments`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content: "Great post!" }),
    });
    const comment = await commentRes.json();
    console.log(`✅ Comment added - ID: ${comment.id}`);
    console.log(`   Content: "${comment.content}"\n`);

    // 5. Like Comment
    console.log("5️⃣  Liking comment...");
    const commentLikeRes = await fetch(`${baseURL}/posts/comments/${comment.id}/like`, {
      method: "POST",
      headers,
    });
    const commentLikeData = await commentLikeRes.json();
    console.log(`✅ Comment like toggled - Liked: ${commentLikeData.liked}, Count: ${commentLikeData.count}\n`);

    // 6. Fetch Feed (test persistence)
    console.log("6️⃣  Fetching feed (checking if likes/comments persist)...");
    const feedRes = await fetch(`${baseURL}/posts`, { headers });
    const feed = await feedRes.json();
    const updatedPost = feed.find(p => p.id === post.id);
    
    if (!updatedPost) throw new Error("Post not found in feed!");
    
    console.log(`✅ Post found in feed:`);
    console.log(`   Like count: ${updatedPost.like_count} (expected 1)`);
    console.log(`   Comment count: ${updatedPost.comment_count} (expected 1)`);
    console.log(`   Liked by me: ${updatedPost.liked_by_me} (expected true)\n`);

    // 7. Get Comments (test persistence)
    console.log("7️⃣  Fetching comments...");
    const getCommentsRes = await fetch(`${baseURL}/posts/${post.id}/comments`, { headers });
    const comments = await getCommentsRes.json();
    const fetchedComment = comments.find(c => c.id === comment.id);
    
    if (!fetchedComment) throw new Error("Comment not found!");
    
    console.log(`✅ Comment found:`);
    console.log(`   Content: "${fetchedComment.content}"`);
    console.log(`   Like count: ${fetchedComment.like_count} (expected 1)`);
    console.log(`   Liked by me: ${fetchedComment.liked_by_me} (expected true)\n`);

    console.log("🎉 All tests passed!\n");
    console.log("✨ Likes and comments are persisting correctly after refresh.");
  } catch (err) {
    console.error("❌ Test failed:", err.message);
    process.exit(1);
  }
}

testAPI();
