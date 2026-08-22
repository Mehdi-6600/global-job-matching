"use client";

import { useState } from "react";
import {
  User,
  Bell,
  Shield,
  Save,
  Check,
  Mail,
  MapPin,
  FileText,
  Lock,
  Eye,
  EyeOff,
  Smartphone,
} from "lucide-react";

type Tab = "general" | "notifications" | "security";

const tabs = [
  { id: "general" as Tab, label: "General", icon: User },
  { id: "notifications" as Tab, label: "Notifications", icon: Bell },
  { id: "security" as Tab, label: "Security", icon: Shield },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const [general, setGeneral] = useState({
    name: "John Doe",
    email: "john.doe@example.com",
    location: "San Francisco, CA",
    bio: "Passionate frontend developer with 6+ years of experience.",
  });

  const [notifications, setNotifications] = useState({
    emailJobs: true,
    emailMessages: true,
    emailMarketing: false,
    pushJobs: true,
    pushMessages: true,
    pushReminders: false,
  });

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const handleSave = () => {
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  const toggleNotif = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-slate-400 text-sm">Manage your account preferences and security</p>
        </div>

        <div className="glass rounded-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-white/10 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-4 text-sm font-medium transition-all whitespace-nowrap border-b-2 ${
                    activeTab === tab.id
                      ? "text-cyan-400 border-cyan-500 bg-cyan-500/5"
                      : "text-slate-400 border-transparent hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="p-6 md:p-8">
            {/* General Tab */}
            {activeTab === "general" && (
              <div className="space-y-5 max-w-lg">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={general.name}
                      onChange={(e) => setGeneral({ ...general, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={general.email}
                      onChange={(e) => setGeneral({ ...general, email: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={general.location}
                      onChange={(e) => setGeneral({ ...general, location: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Bio</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <textarea
                      value={general.bio}
                      onChange={(e) => setGeneral({ ...general, bio: e.target.value })}
                      rows={4}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div className="space-y-6 max-w-lg">
                <div>
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-cyan-400" />
                    Email Notifications
                  </h3>
                  <div className="space-y-3">
                    {[
                      { key: "emailJobs" as const, label: "New job recommendations" },
                      { key: "emailMessages" as const, label: "New messages from employers" },
                      { key: "emailMarketing" as const, label: "Marketing and newsletter" },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/[0.07] transition-colors"
                      >
                        <span className="text-slate-300 text-sm">{item.label}</span>
                        <button
                          type="button"
                          onClick={() => toggleNotif(item.key)}
                          className={`w-11 h-6 rounded-full transition-colors relative ${
                            notifications[item.key] ? "bg-cyan-500" : "bg-white/10"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                              notifications[item.key] ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-cyan-400" />
                    Push Notifications
                  </h3>
                  <div className="space-y-3">
                    {[
                      { key: "pushJobs" as const, label: "Job alerts" },
                      { key: "pushMessages" as const, label: "Direct messages" },
                      { key: "pushReminders" as const, label: "Application reminders" },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/[0.07] transition-colors"
                      >
                        <span className="text-slate-300 text-sm">{item.label}</span>
                        <button
                          type="button"
                          onClick={() => toggleNotif(item.key)}
                          className={`w-11 h-6 rounded-full transition-colors relative ${
                            notifications[item.key] ? "bg-cyan-500" : "bg-white/10"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                              notifications[item.key] ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="space-y-5 max-w-lg">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Current Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={passwords.current}
                      onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-12 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={passwords.new}
                      onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-12 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-4">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-cyan-500/20"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
              {savedMsg && (
                <span className="flex items-center gap-1.5 text-emerald-400 text-sm">
                  <Check className="w-4 h-4" />
                  Saved successfully
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
