import { ArrowLeft, Send, Paperclip, MoreVertical, Users } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useTheme } from "../context/ThemeContext";

export default function InternalChat() {
  const navigate = useNavigate();
  const { chatId } = useParams();
  const [message, setMessage] = useState("");
  const { isDark } = useTheme();

  // Mock data - would fetch based on chatId
  const chatInfo = {
    name: "Delhi Team Leaders",
    members: 24,
    color: "from-blue-400 to-cyan-400",
  };

  const messages = [
    {
      id: 1,
      sender: "Rajesh Kumar",
      avatar: "RK",
      content: "Team, we need to finalize the venue for tomorrow's meeting",
      time: "10:30 AM",
      isMe: false,
    },
    {
      id: 2,
      sender: "Priya Sharma",
      avatar: "PS",
      content: "I've shortlisted 3 options. Sharing the details in a moment",
      time: "10:32 AM",
      isMe: false,
    },
    {
      id: 3,
      sender: "You",
      avatar: "YO",
      content: "Great! Let me know if you need any help with arrangements",
      time: "10:35 AM",
      isMe: true,
    },
    {
      id: 4,
      sender: "Admin",
      avatar: "AD",
      content: "Reminder: Submit your weekly reports by Friday",
      time: "11:00 AM",
      isMe: false,
      isAdmin: true,
    },
    {
      id: 5,
      sender: "Amit Singh",
      avatar: "AS",
      content: "Can someone share the latest campaign materials?",
      time: "11:15 AM",
      isMe: false,
    },
    {
      id: 6,
      sender: "You",
      avatar: "YO",
      content: "Check the planning section, all materials are uploaded there",
      time: "11:18 AM",
      isMe: true,
    },
  ];

  const handleSend = () => {
    if (message.trim()) {
      // In real app, would send to backend
      setMessage("");
    }
  };

  return (
    <div className={`flex flex-col h-screen ${isDark ? "bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" : "bg-gray-50"}`}>
      {/* Header */}
      <div className={`p-4 flex items-center gap-3 border-b ${isDark ? "bg-slate-900/80 backdrop-blur-xl border-white/10" : "bg-white border-gray-200 shadow-sm"}`}>
        <button onClick={() => navigate(-1)} className={`p-2 rounded-full transition-colors ${isDark ? "hover:bg-white/10" : "hover:bg-gray-100"}`}>
          <ArrowLeft size={20} className={isDark ? "text-white" : "text-gray-700"} />
        </button>
        <div className={`w-12 h-12 bg-gradient-to-br ${chatInfo.color} rounded-2xl flex items-center justify-center shadow-sm`}>
          <Users size={20} className="text-white" />
        </div>
        <div className="flex-1">
          <h1 className={`font-bold text-base ${isDark ? "text-white" : "text-gray-900"}`}>{chatInfo.name}</h1>
          <p className={`text-xs flex items-center gap-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            {chatInfo.members} members • Active now
          </p>
        </div>
        <button className={`p-2 rounded-full transition-colors ${isDark ? "hover:bg-white/10" : "hover:bg-gray-100"}`}>
          <MoreVertical size={20} className={isDark ? "text-gray-400" : "text-gray-500"} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Date Divider */}
        <div className="flex items-center gap-3">
          <div className={`flex-1 h-px ${isDark ? "bg-white/10" : "bg-gray-200"}`}></div>
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${isDark ? "text-gray-400 bg-white/10" : "text-gray-500 bg-gray-200"}`}>Today</span>
          <div className={`flex-1 h-px ${isDark ? "bg-white/10" : "bg-gray-200"}`}></div>
        </div>

        {/* Messages */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.isMe ? "flex-row-reverse" : ""}`}
          >
            {!msg.isMe && (
              <div className="w-9 h-9 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xs">
                  {msg.avatar}
                </span>
              </div>
            )}
            <div className={`flex flex-col ${msg.isMe ? "items-end" : ""} max-w-[75%]`}>
              {!msg.isMe && (
                <p className={`text-xs mb-1 px-1 font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  {msg.sender}
                  {msg.isAdmin && (
                    <span className="ml-1 text-xs bg-gradient-to-r from-blue-500 to-purple-600 text-white px-2 py-0.5 rounded-full">
                      Admin
                    </span>
                  )}
                </p>
              )}
              <div
                className={`rounded-2xl px-4 py-2 shadow-sm ${
                  msg.isMe
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                    : msg.isAdmin
                    ? isDark ? "bg-blue-500/15 text-blue-200 border border-blue-500/30" : "bg-blue-50 text-blue-700 border border-blue-200"
                    : isDark ? "bg-white/10 backdrop-blur-sm text-gray-100 border border-white/15" : "bg-white text-gray-800 border border-gray-200"
                }`}
              >
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
              <p className="text-xs text-gray-500 mt-1 px-1">{msg.time}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Admin Notice */}
      <div className="px-4 py-2 bg-yellow-500/10 border-t border-yellow-500/20">
        <p className="text-xs text-yellow-300 flex items-center gap-1 font-medium">
          <span>🔒</span>
          Secure admin group • Messages are encrypted
        </p>
      </div>

      {/* Message Input */}
      <div className={`border-t p-4 ${isDark ? "bg-slate-900/80 backdrop-blur-xl border-white/10" : "bg-white border-gray-200"}`}>
        <div className="flex gap-2">
          <button className={`p-3 rounded-xl transition-colors ${isDark ? "text-gray-400 hover:bg-white/10" : "text-gray-500 hover:bg-gray-100"}`}>
            <Paperclip size={20} />
          </button>
          <Input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            className={`flex-1 h-12 rounded-xl focus:border-blue-500 ${isDark ? "border-white/20 bg-white/10 text-white placeholder:text-gray-500" : "border-gray-200 bg-gray-100 text-gray-900 placeholder:text-gray-400"}`}
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim()}
            size="icon"
            className="h-12 w-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-md"
          >
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}