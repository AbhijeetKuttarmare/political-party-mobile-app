import { Search, X, TrendingUp, Hash, Users, FileText, Calendar, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useTheme } from "../context/ThemeContext";

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "people" | "posts" | "events">("all");

  const trendingTopics = [
    { tag: "NCPSPWorks", posts: "2.3K", color: "from-blue-900 to-cyan-600" },
    { tag: "ElectoralReforms", posts: "1.8K", color: "from-orange-500 to-orange-600" },
    { tag: "MaharashtraModel", posts: "1.5K", color: "from-emerald-600 to-emerald-500" },
    { tag: "YouthForChange", posts: "987", color: "from-purple-600 to-purple-700" },
  ];

  const recentSearches = [
    "Sharad Pawar",
    "Town Hall Meeting",
    "Campaign Strategy",
    "Volunteer Training",
  ];

  const searchResults = {
    people: [
      { id: 1, name: "Arvind Kejriwal", role: "National Convener", avatar: "AK" },
      { id: 2, name: "Manish Sisodia", role: "Former Deputy CM", avatar: "MS" },
      { id: 3, name: "Atishi", role: "Minister", avatar: "AT" },
    ],
    posts: [
      {
        id: 1,
        author: "Rajesh Kumar",
        content: "Great turnout at today's street corner meeting in East Delhi!",
        time: "2h ago",
      },
      {
        id: 2,
        author: "Priya Sharma",
        content: "Organized health camp in our locality. Free checkups for 150+ families.",
        time: "5h ago",
      },
    ],
    events: [
      {
        id: 1,
        title: "Town Hall Meeting",
        location: "Delhi",
        date: "Mar 10, 2026",
      },
      {
        id: 2,
        title: "Youth Workers Conference",
        location: "Punjab",
        date: "Mar 15, 2026",
      },
    ],
  };

  const tabs = [
    { id: "all", label: "All" },
    { id: "people", label: "People" },
    { id: "posts", label: "Posts" },
    { id: "events", label: "Events" },
  ];

  const filteredResults = searchQuery.length > 0;
  const { isDark } = useTheme();

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" : "bg-gray-50"}`}>
      {/* Header with Gradient */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-700 to-cyan-600 text-white p-4 pb-6 rounded-b-3xl shadow-xl">
        <h1 className="font-bold text-2xl mb-4">Search</h1>

        {/* Search Input */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Search size={20} />
          </div>
          <input
            type="text"
            placeholder="Search people, posts, events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl pl-12 pr-12 py-3.5 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs - Show when there are search results */}
      {filteredResults && (
        <div className="px-4 pt-4 pb-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md"
                    : isDark ? "bg-white/10 text-gray-300 border border-white/15 hover:bg-white/15" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 space-y-6 pb-6">
        {!filteredResults ? (
          <>
            {/* Trending Topics */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={18} className="text-orange-400" />
                <h2 className="font-bold text-white">Trending Topics</h2>
              </div>
              <div className="space-y-2">
                {trendingTopics.map((topic, index) => (
                  <button
                    key={index}
                    onClick={() => setSearchQuery(`#${topic.tag}`)}
                    className={`w-full rounded-2xl p-4 flex items-center gap-3 border transition-all active:scale-98 ${isDark ? "bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 hover:border-white/20" : "bg-white border-gray-200 shadow-sm hover:shadow-md"}`}
                  >
                    <div className={`w-12 h-12 bg-gradient-to-br ${topic.color} rounded-xl flex items-center justify-center shadow-sm`}>
                      <Hash size={20} className="text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className={`font-semibold text-sm mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>#{topic.tag}</h3>
                      <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{topic.posts} posts</p>
                    </div>
                    <ArrowRight size={18} className="text-gray-500" />
                  </button>
                ))}
              </div>
            </section>

            {/* Recent Searches */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Recent Searches</h2>
                <button className="text-sm text-blue-400 font-semibold hover:text-blue-300 transition-colors">
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => setSearchQuery(search)}
                    className={`px-4 py-2 rounded-full text-sm transition-all border ${isDark ? "bg-white/10 border-white/15 text-gray-300 hover:bg-white/20" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100"}`}
                  >
                    {search}
                  </button>
                ))}
              </div>
            </section>

            {/* Quick Access */}
            <section>
              <h2 className={`font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>Quick Access</h2>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/ministers"
                  className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl p-5 flex flex-col items-center gap-3 shadow-lg hover:shadow-xl transition-all active:scale-95 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.2),transparent)]"></div>
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center relative z-10">
                    <Users size={24} className="text-white" />
                  </div>
                  <span className="text-sm font-semibold text-white relative z-10">Ministers</span>
                </Link>
                <Link
                  to="/community"
                  className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 flex flex-col items-center gap-3 shadow-lg hover:shadow-xl transition-all active:scale-95 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.2),transparent)]"></div>
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center relative z-10">
                    <FileText size={24} className="text-white" />
                  </div>
                  <span className="text-sm font-semibold text-white relative z-10">Posts</span>
                </Link>
              </div>
            </section>
          </>
        ) : (
          <>
            {/* Search Results */}
            {(activeTab === "all" || activeTab === "people") && (
              <section>
                <h2 className={`font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>People</h2>
                <div className="space-y-2">
                  {searchResults.people.map((person) => (
                    <Link
                      key={person.id}
                      to={`/ministers/${person.id}`}
                      className={`rounded-2xl p-4 flex items-center gap-3 border transition-all active:scale-98 ${isDark ? "bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 hover:border-white/20" : "bg-white border-gray-200 shadow-sm hover:shadow-md"}`}
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-700 to-cyan-600 rounded-full flex items-center justify-center shadow-md">
                        <span className="text-white font-semibold text-xs">{person.avatar}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-semibold text-sm mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>{person.name}</h3>
                        <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{person.role}</p>
                      </div>
                      <ArrowRight size={18} className="text-gray-500" />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {(activeTab === "all" || activeTab === "posts") && (
              <section>
                <h2 className={`font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>Posts</h2>
                <div className="space-y-2">
                  {searchResults.posts.map((post) => (
                    <div
                      key={post.id}
                      className={`rounded-2xl p-4 border ${isDark ? "bg-white/5 backdrop-blur-sm border-white/10" : "bg-white border-gray-200 shadow-sm"}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-700 to-cyan-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">
                            {post.author.split(" ").map(n => n[0]).join("")}
                          </span>
                        </div>
                        <div>
                          <h3 className={`font-semibold text-xs ${isDark ? "text-white" : "text-gray-900"}`}>{post.author}</h3>
                          <p className={`text-[10px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>{post.time}</p>
                        </div>
                      </div>
                      <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>{post.content}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(activeTab === "all" || activeTab === "events") && (
              <section>
                <h2 className={`font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>Events</h2>
                <div className="space-y-2">
                  {searchResults.events.map((event) => (
                    <div
                      key={event.id}
                      className={`rounded-2xl p-4 border ${isDark ? "bg-white/5 backdrop-blur-sm border-white/10" : "bg-white border-gray-200 shadow-sm"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
                          <Calendar size={20} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-semibold text-sm mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>{event.title}</h3>
                          <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                            {event.location} • {event.date}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
