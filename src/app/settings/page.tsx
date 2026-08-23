"use client";

import { useState, useEffect } from "react";
import {
  User,
  Lock,
  Bell,
  Shield,
  Trash2,
  Save,
  Camera,
  Mail,
  Smartphone,
  Eye,
  EyeOff,
  AlertTriangle,
  Check,
} from "lucide-react";

type Tab = "profile" | "security" | "notifications" | "account";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Profile state
  const [profile, setProfile] = useState({
    name: "John Doe",
    email: "john@example.com",
    phone: "+1 234 567 890",
    location: "San Francisco, USA",
    bio: "Full-stack developer with 5 years of experience in React and Node.js.",
    title: "Senior Frontend Developer",
  });

  // Security state
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState({
    emailApplications: true,
    emailMessages: true,
    emailInterviews: true,
    emailJobAlerts: false,
    pushApplications: true,
    pushMessages: true,
    pushInterviews: true,
    pushJobAlerts: true,
  });

  // Load from localStorage
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem("settings_profile");
      const savedNotifs = localStorage.getItem("settings_notifications");
      if (savedProfile) setProfile(JSON.parse(savedProfile));
      if (savedNotifs) setNotifPrefs(JSON.parse(savedNotifs));
    } catch {
      // ignore parse errors
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save profile
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("settings_profile", JSON.stringify(profile));
    }
  }, [profile, isLoaded]);

  // Save notifications
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("settings_notifications", JSON.stringify(notifPrefs));
    }
  }, [notifPrefs, isLoaded]);

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: Lock },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "account", label: "Account", icon: Shield },
  ];

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Settings</h1>
          <p className="text-slate-400 text-sm">Manage your account preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64 shrink-0">
            <div className="glass rounded-2xl p-2 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div className="glass rounded-2xl p-6 flex items-center gap-5">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
                      <User className="w-8 h-8 text-cyan-400" />
                    </div>
                    <button
                      type="button"
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-cyan-500 text-white flex items-center justify-center hover:bg-cyan-600 transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{profile.name}</h3>
                    <p className="text-slate-400 text-sm">{profile.title}</p>
                  </div>
                </div>

                <div className="glass rounded-2xl p-6 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Full Name</label>
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Job Title</label>
                      <input
                        type="text"
                        value={profile.title}
                        onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Email</label>
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Phone</label>
                      <input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-slate-400 mb-1.5">Location</label>
                      <input
                        type="text"
                        value={profile.location}
                        onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-slate-400 mb-1.5">Bio</label>
                      <textarea
                        value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        rows={4}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                    >
                      <Save className="w-4 h-4" />
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div className="glass rounded-2xl p-6">
                  <h3 className="text-white font-semibold mb-5">Change Password</h3>
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Current Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={passwords.current}
                          onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white text-sm outline-none focus:border-cyan-500/50 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">New Password</label>
                      <input
                        type="password"
                        value={passwords.new}
                        onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Confirm New Password</label>
                      <input
                        type="password"
                        value={passwords.confirm}
                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all"
                      />
                    </div>
                    <button
                      type="button"
                      className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                    >
                      <Lock className="w-4 h-4" />
                      Update Password
                    </button>
                  </div>
                </div>

                <div className="glass rounded-2xl p-6">
                  <h3 className="text-white font-semibold mb-4">Two-Factor Authentication</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">Enable 2FA</p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <button
                      type="button"
                      className="relative w-12 h-6 rounded-full bg-slate-700 transition-colors"
                    >
                      <span className="absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div className="glass rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-5">Notification Preferences</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Mail className="w-4 h-4 text-cyan-400" />
                      <h4 className="text-white text-sm font-medium">Email Notifications</h4>
                    </div>
                    <div className="space-y-3 pl-6">
                      {[
                        { key: "emailApplications", label: "Application updates" },
                        { key: "emailMessages", label: "New messages" },
                        { key: "emailInterviews", label: "Interview invitations" },
                        { key: "emailJobAlerts", label: "Job alerts & recommendations" },
                      ].map((item) => (
                        <label
                          key={item.key}
                          className="flex items-center justify-between cursor-pointer"
                        >
                          <span className="text-slate-300 text-sm">{item.label}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setNotifPrefs((prev) => ({
                                ...prev,
                                [item.key]: !prev[item.key as keyof typeof prev],
                              }))
                            }
                            className={`relative w-11 h-6 rounded-full transition-colors ${
                              notifPrefs[item.key as keyof typeof notifPrefs]
                                ? "bg-cyan-500"
                                : "bg-slate-700"
                            }`}
                          >
                            <span
                              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                notifPrefs[item.key as keyof typeof notifPrefs]
                                  ? "translate-x-6"
                                  : "translate-x-1"
                              }`}
                            />
                          </button>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-white/5" />

                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Smartphone className="w-4 h-4 text-purple-400" />
                      <h4 className="text-white text-sm font-medium">Push Notifications</h4>
                    </div>
                    <div className="space-y-3 pl-6">
                      {[
                        { key: "pushApplications", label: "Application updates" },
                        { key: "pushMessages", label: "New messages" },
                        { key: "pushInterviews", label: "Interview invitations" },
                        { key: "pushJobAlerts", label: "Job alerts & recommendations" },
                      ].map((item) => (
                        <label
                          key={item.key}
                          className="flex items-center justify-between cursor-pointer"
                        >
                          <span className="text-slate-300 text-sm">{item.label}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setNotifPrefs((prev) => ({
                                ...prev,
                                [item.key]: !prev[item.key as keyof typeof prev],
                              }))
                            }
                            className={`relative w-11 h-6 rounded-full transition-colors ${
                              notifPrefs[item.key as keyof typeof notifPrefs]
                                ? "bg-purple-500"
                                : "bg-slate-700"
                            }`}
                          >
                            <span
                              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                notifPrefs[item.key as keyof typeof notifPrefs]
                                  ? "translate-x-6"
                                  : "translate-x-1"
                              }`}
                            />
                          </button>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    type="button"
                    className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                  >
                    <Save className="w-4 h-4" />
                    Save Preferences
                  </button>
                </div>
              </div>
            )}

            {/* Account Tab */}
            {activeTab === "account" && (
              <div className="space-y-6">
                <div className="glass rounded-2xl p-6">
                  <h3 className="text-white font-semibold mb-4">Account Status</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 text-sm">Account is active</span>
                  </div>
                  <p className="text-slate-400 text-xs">Member since January 2024</p>
                </div>

                <div className="glass rounded-2xl p-6 border border-red-500/10">
                  <h3 className="text-white font-semibold mb-4">Danger Zone</h3>
                  <p className="text-slate-400 text-sm mb-5 leading-relaxed">
                    Once you delete your account, there is no going back. All your data including
                    applications, messages, and profile will be permanently removed.
                  </p>

                  {!showDeleteConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Account
                    </button>
                  ) : (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                      <div className="flex items-start gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-red-300 text-sm">
                          Are you sure? This action cannot be undone.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-medium hover:bg-red-600 transition-colors"
                        >
                          Yes, Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="bg-white/5 border border-white/10 text-slate-300 px-4 py-2 rounded-xl text-xs transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
