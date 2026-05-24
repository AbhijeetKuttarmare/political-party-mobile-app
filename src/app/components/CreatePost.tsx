import { ArrowLeft, Image as ImageIcon, X, Smile } from "lucide-react";
import { useNavigate } from "react-router";
import { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useTheme } from "../context/ThemeContext";

export default function CreatePost() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [content, setContent] = useState("");
  const [hasImage, setHasImage] = useState(false);

  const handlePost = () => {
    // In real app, would submit to backend
    navigate("/community");
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? "bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" : "bg-gray-50"}`}>
      {/* Header */}
      <div className={`p-4 flex items-center justify-between sticky top-0 z-10 ${isDark ? "bg-slate-900/80 backdrop-blur-xl border-b border-white/10" : "bg-white border-b border-gray-200 shadow-sm"}`}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className={`p-2 rounded-full transition-colors ${isDark ? "hover:bg-white/10" : "hover:bg-gray-100"}`}>
            <ArrowLeft size={20} className={isDark ? "text-white" : "text-gray-700"} />
          </button>
          <h1 className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>Create Post</h1>
        </div>
        <Button
          onClick={handlePost}
          disabled={!content.trim()}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-semibold shadow-md px-6"
          size="sm"
        >
          Post
        </Button>
      </div>

      {/* Author Info */}
      <div className={`p-4 flex items-center gap-3 border-b ${isDark ? "bg-white/5 backdrop-blur-sm border-white/10" : "bg-white border-gray-100"}`}>
        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">You</span>
        </div>
        <div>
          <h3 className={`font-semibold text-sm ${isDark ? "text-white" : "text-gray-900"}`}>Your Name</h3>
          <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>Posting to Community</p>
        </div>
      </div>

      {/* Content Editor */}
      <div className={`flex-1 p-4 ${isDark ? "bg-white/5 backdrop-blur-sm" : "bg-white"}`}>
        <Textarea
          placeholder="What's happening in your area? Share updates with party members..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className={`min-h-[200px] border-none focus-visible:ring-0 resize-none text-base bg-transparent ${isDark ? "text-white placeholder:text-gray-500" : "text-gray-900 placeholder:text-gray-400"}`}
        />

        {/* Image Preview */}
        {hasImage && (
          <div className="mt-4 relative">
            <div className="h-64 bg-white/5 rounded-2xl flex items-center justify-center relative overflow-hidden border border-dashed border-white/20">
              <span className="text-gray-400 text-sm z-10">Uploaded Image</span>
            </div>
            <button
              onClick={() => setHasImage(false)}
              className="absolute top-3 right-3 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-all"
            >
              <X size={18} className="text-white" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className={`border-t p-4 ${isDark ? "bg-slate-900/80 backdrop-blur-xl border-white/10" : "bg-white border-gray-200"}`}>
        <div className={`rounded-2xl p-4 mb-4 border ${isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"}`}>
          <p className={`text-sm font-semibold mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Add to your post</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setHasImage(true)}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all active:scale-95 ${isDark ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-white border-gray-200 hover:bg-gray-100"}`}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <ImageIcon size={18} className="text-white" />
              </div>
              <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-700"}`}>Photo</span>
            </button>
            <button className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all active:scale-95 ${isDark ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-white border-gray-200 hover:bg-gray-100"}`}>
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                <Smile size={18} className="text-white" />
              </div>
              <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-700"}`}>Emoji</span>
            </button>
          </div>
        </div>

        {/* Post Guidelines */}
        <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
          <p className="text-xs text-blue-300 font-bold mb-1 flex items-center gap-1">
            <span>ℹ️</span>
            Community Guidelines
          </p>
          <p className="text-xs text-blue-400 leading-relaxed">
            Be respectful, stay on topic, and follow party values
          </p>
        </div>
      </div>
    </div>
  );
}