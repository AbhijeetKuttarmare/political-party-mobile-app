import { ArrowLeft, Bell, Heart, MessageCircle, UserPlus, Calendar, FileText, CheckCheck } from "lucide-react";
import { Link } from "react-router";
import { useState } from "react";
import { useTheme } from "../context/ThemeContext";

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "like",
      user: "Priya Sharma",
      action: "liked your post",
      content: "Great turnout at today's street corner meeting...",
      time: "2h ago",
      read: false,
      avatar: "PS",
    },
    {
      id: 2,
      type: "comment",
      user: "Amit Singh",
      action: "commented on your post",
      content: "This is exactly what we need more of!",
      time: "3h ago",
      read: false,
      avatar: "AS",
    },
    {
      id: 3,
      type: "follow",
      user: "Rajesh Kumar",
      action: "started following you",
      content: "",
      time: "5h ago",
      read: false,
      avatar: "RK",
    },
    {
      id: 4,
      type: "event",
      user: "NCP-SP Maharashtra",
      action: "invited you to an event",
      content: "Town Hall Meeting - Mar 10, 2026",
      time: "1d ago",
      read: true,
      avatar: "NM",
    },
    {
      id: 5,
      type: "announcement",
      user: "National Convener",
      action: "posted an announcement",
      content: "National Campaign Launch - Electoral Reforms",
      time: "1d ago",
      read: true,
      avatar: "NC",
    },
    {
      id: 6,
      type: "document",
      user: "Internal Team",
      action: "shared a document",
      content: "March Campaign Strategy",
      time: "2d ago",
      read: true,
      avatar: "IT",
    },
  ]);

  const getIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart size={16} className="text-white" fill="white" />;
      case "comment":
        return <MessageCircle size={16} className="text-white" />;
      case "follow":
        return <UserPlus size={16} className="text-white" />;
      case "event":
        return <Calendar size={16} className="text-white" />;
      case "announcement":
        return <Bell size={16} className="text-white" />;
      case "document":
        return <FileText size={16} className="text-white" />;
      default:
        return <Bell size={16} className="text-white" />;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case "like":
        return "from-red-500 to-pink-600";
      case "comment":
        return "from-blue-900 to-cyan-600";
      case "follow":
        return "from-orange-500 to-orange-600";
      case "event":
        return "from-emerald-600 to-emerald-500";
      case "announcement":
        return "from-purple-600 to-purple-700";
      case "document":
        return "from-blue-700 to-blue-800";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(notif => ({ ...notif, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const { isDark } = useTheme();

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" : "bg-gray-50"}`}>
      {/* Header with Gradient */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-700 to-cyan-600 text-white p-4 pb-6 rounded-b-3xl shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <Link to="/" className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-2xl mb-1">Notifications</h1>
            <p className="text-sm text-blue-100">
              {unreadCount > 0 ? `${unreadCount} new notifications` : "All caught up!"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1 text-xs bg-white/15 backdrop-blur-sm px-3 py-2 rounded-full hover:bg-white/25 transition-all border border-white/20"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4 pb-3">
        <div className={`flex gap-2 rounded-2xl p-1 border ${isDark ? "bg-white/5 border-white/10" : "bg-gray-200 border-gray-300"}`}>
          <button className="flex-1 py-2 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold shadow-sm">
            All
          </button>
          <button className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition-colors ${isDark ? "text-gray-400 hover:bg-white/10" : "text-gray-500 hover:bg-gray-300"}`}>
            Unread
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="px-4 space-y-2 pb-6">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`rounded-2xl p-4 border transition-all ${
              isDark
                ? notification.read ? "bg-white/5 border-white/10 backdrop-blur-sm" : "bg-blue-500/10 border-blue-500/30 backdrop-blur-sm"
                : notification.read ? "bg-white border-gray-200 shadow-sm" : "bg-blue-50 border-blue-200"
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-700 to-cyan-600 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white font-semibold text-xs">{notification.avatar}</span>
                </div>
                {/* Icon Badge */}
                <div className={`absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-gradient-to-br ${getIconColor(notification.type)} rounded-full flex items-center justify-center shadow-md border-2 ${isDark ? "border-slate-900" : "border-gray-50"}`}>
                  {getIcon(notification.type)}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm">
                    <span className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{notification.user}</span>{" "}
                    <span className={isDark ? "text-gray-400" : "text-gray-500"}>{notification.action}</span>
                  </p>
                  {!notification.read && (
                    <div className="w-2.5 h-2.5 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex-shrink-0 mt-1 shadow-sm"></div>
                  )}
                </div>
                {notification.content && (
                  <p className={`text-sm mb-2 line-clamp-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{notification.content}</p>
                )}
                <p className="text-xs text-gray-500">{notification.time}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State - if no notifications */}
      {notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 ${isDark ? "bg-white/10" : "bg-gray-200"}`}>
            <Bell size={40} className="text-gray-400" />
          </div>
          <h3 className={`font-bold text-lg mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>No notifications yet</h3>
          <p className={`text-sm text-center max-w-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            We'll notify you when there's something new
          </p>
        </div>
      )}
    </div>
  );
}
