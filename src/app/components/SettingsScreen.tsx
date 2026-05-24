import { ArrowLeft, Bell, Lock, Globe, Palette, Shield, HelpCircle, LogOut, ChevronRight, User, Mail, Phone } from "lucide-react";
import { Link } from "react-router";
import { useState } from "react";
import { useTheme } from "../context/ThemeContext";

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);
  const { isDark } = useTheme();

  const settingsSections = [
    {
      title: "Account",
      items: [
        { icon: User, label: "Edit Profile", link: "/profile/edit", color: "from-blue-900 to-cyan-600" },
        { icon: Mail, label: "Email Preferences", link: "/settings/email", color: "from-blue-900 to-cyan-600" },
        { icon: Phone, label: "Phone Number", link: "/settings/phone", color: "from-blue-900 to-cyan-600" },
      ],
    },
    {
      title: "Preferences",
      items: [
        { icon: Bell, label: "Notifications", toggle: true, value: notificationsEnabled, onChange: setNotificationsEnabled, color: "from-orange-500 to-orange-600" },
        { icon: Globe, label: "Language", link: "/settings/language", color: "from-orange-500 to-orange-600" },
        { icon: Palette, label: "Appearance", link: "/settings/appearance", color: "from-orange-500 to-orange-600" },
      ],
    },
    {
      title: "Privacy & Security",
      items: [
        { icon: Lock, label: "Privacy Settings", link: "/settings/privacy", color: "from-emerald-600 to-emerald-500" },
        { icon: Shield, label: "Security", link: "/settings/security", color: "from-emerald-600 to-emerald-500" },
        { icon: Globe, label: "Public Profile", toggle: true, value: publicProfile, onChange: setPublicProfile, color: "from-emerald-600 to-emerald-500" },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: HelpCircle, label: "Help Center", link: "/help", color: "from-purple-600 to-purple-700" },
        { icon: Mail, label: "Contact Support", link: "/support", color: "from-purple-600 to-purple-700" },
      ],
    },
  ];

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" : "bg-gray-50"}`}>
      {/* Header with Gradient */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-700 to-cyan-600 text-white p-4 pb-6 rounded-b-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <Link to="/profile" className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="font-bold text-2xl mb-1">Settings</h1>
            <p className="text-sm text-blue-100">Manage your account</p>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="px-4 space-y-6 py-6">
        {settingsSections.map((section, idx) => (
          <section key={idx}>
            <h2 className="font-bold text-sm text-gray-500 mb-3 px-1">{section.title}</h2>
            <div className={`rounded-2xl overflow-hidden border ${isDark ? "bg-white/5 backdrop-blur-sm border-white/10" : "bg-white border-gray-200 shadow-sm"}`}>
              {section.items.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index}>
                    {item.toggle ? (
                      <button
                        onClick={() => item.onChange && item.onChange(!item.value)}
                        className={`w-full flex items-center gap-3 p-4 transition-colors ${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"}`}
                      >
                        <div className={`w-10 h-10 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center shadow-sm`}>
                          <Icon size={18} className="text-white" />
                        </div>
                        <span className={`flex-1 text-sm font-medium text-left ${isDark ? "text-white" : "text-gray-900"}`}>{item.label}</span>
                        <div className={`w-12 h-7 rounded-full transition-all ${item.value ? 'bg-gradient-to-r from-blue-600 to-cyan-600' : isDark ? 'bg-white/20' : 'bg-gray-300'} relative`}>
                          <div className={`absolute top-1 ${item.value ? 'right-1' : 'left-1'} w-5 h-5 bg-white rounded-full shadow-md transition-all`}></div>
                        </div>
                      </button>
                    ) : (
                      <Link
                        to={item.link || "#"}
                        className={`flex items-center gap-3 p-4 transition-colors ${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"}`}
                      >
                        <div className={`w-10 h-10 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center shadow-sm`}>
                          <Icon size={18} className="text-white" />
                        </div>
                        <span className={`flex-1 text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{item.label}</span>
                        <ChevronRight size={18} className="text-gray-500" />
                      </Link>
                    )}
                    {index < section.items.length - 1 && (
                      <div className={`mx-4 border-t ${isDark ? "border-white/5" : "border-gray-100"}`}></div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {/* Logout Button */}
        <div className={`rounded-2xl overflow-hidden border ${isDark ? "bg-white/5 backdrop-blur-sm border-white/10" : "bg-white border-gray-200 shadow-sm"}`}>
          <button
            onClick={() => {
              localStorage.removeItem("isLoggedIn");
              window.location.href = "/login";
            }}
            className="w-full flex items-center gap-3 p-4 hover:bg-red-500/10 transition-colors"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-sm">
              <LogOut size={18} className="text-white" />
            </div>
            <span className="flex-1 text-sm font-medium text-left text-red-400">Log Out</span>
          </button>
        </div>

        {/* App Version */}
        <div className="text-center text-xs text-gray-500 pt-4 pb-8">
          NCP-SP Connect v1.0.0
        </div>
      </div>
    </div>
  );
}
