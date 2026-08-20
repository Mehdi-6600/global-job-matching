"use client";

import { useState } from "react";
import {
  User,
  Mail,
  MapPin,
  Briefcase,
  Link as LinkIcon,
  Camera,
  Save,
  Globe,
  Github,
  Linkedin,
  Twitter,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("general");

  const tabs = [
    { id: "general", label: "General" },
    { id: "experience", label: "Experience" },
    { id: "skills", label: "Skills" },
    { id: "social", label: "Social" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
      <Navbar />

      <div className="pt-24 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              Profile Settings
            </h1>
            <p className="text-white/50 mt-1">
              Manage your personal information and preferences
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Sidebar - Avatar Card */}
            <div className="lg:col-span-1">
              <div className="glass rounded-2xl p-6 text-center">
                <div className="relative w-28 h-28 mx-auto mb-4">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-2 border-white/10 flex items-center justify-center">
                    <User className="w-12 h-12 text-white/40" />
                  </div>
                  <button className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                    <Camera className="w-4 h-4 text-white" />
                  </button>
                </div>
                <h2 className="text-lg font-semibold text-white">John Doe</h2>
                <p className="text-sm text-white/50 mb-4">
                  Senior Frontend Engineer
                </p>

                <div className="space-y-3 text-left">
                  <div className="flex items-center gap-3 text-sm text-white/60">
                    <Mail className="w-4 h-4 text-white/30" />
                    john@example.com
                  </div>
                  <div className="flex items-center gap-3 text-sm text-white/60">
                    <MapPin className="w-4 h-4 text-white/30" />
                    San Francisco, CA
                  </div>
                  <div className="flex items-center gap-3 text-sm text-white/60">
                    <Briefcase className="w-4 h-4 text-white/30" />
                    Open to work
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white/50">Profile Completion</span>
                    <span className="text-blue-400 font-semibold">85%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full w-[85%] bg-gradient-to-r from-blue-500 to-purple-600 rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="glass rounded-2xl overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-white/10 overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors relative ${
                        activeTab === tab.id
                          ? "text-blue-400"
                          : "text-white/50 hover:text-white/70"
                      }`}
                    >
                      {tab.label}
                      {activeTab === tab.id && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="p-6 sm:p-8">
                  {activeTab === "general" && (
                    <div className="space-y-6">
                      <div className="grid sm:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-white/70 mb-2">
                            First Name
                          </label>
                          <input
                            type="text"
                            defaultValue="John"
                            className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white/70 mb-2">
                            Last Name
                          </label>
                          <input
                            type="text"
                            defaultValue="Doe"
                            className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          defaultValue="john@example.com"
                          className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">
                          Headline
                        </label>
                        <input
                          type="text"
                          defaultValue="Senior Frontend Engineer"
                          className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">
                          Bio
                        </label>
                        <textarea
                          rows={4}
                          defaultValue="Passionate frontend engineer with 8+ years of experience building scalable web applications."
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                        />
                      </div>

                      <div className="grid sm:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-white/70 mb-2">
                            Location
                          </label>
                          <input
                            type="text"
                            defaultValue="San Francisco, CA"
                            className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white/70 mb-2">
                            Phone
                          </label>
                          <input
                            type="tel"
                            defaultValue="+1 (555) 123-4567"
                            className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "experience" && (
                    <div className="space-y-6">
                      {[
                        {
                          role: "Senior Frontend Engineer",
                          company: "TechCorp",
                          period: "2021 - Present",
                        },
                        {
                          role: "Frontend Developer",
                          company: "StartupXYZ",
                          period: "2018 - 2021",
                        },
                      ].map((exp, i) => (
                        <div
                          key={i}
                          className="p-4 rounded-xl bg-white/5 border border-white/10"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-white">
                                {exp.role}
                              </h4>
                              <p className="text-sm text-white/50">
                                {exp.company}
                              </p>
                            </div>
                            <span className="text-xs text-white/30 bg-white/5 px-2 py-1 rounded-full">
                              {exp.period}
                            </span>
                          </div>
                          <p className="text-sm text-white/40">
                            Led frontend development for core product features,
                            improving performance by 40%.
                          </p>
                        </div>
                      ))}
                      <button className="w-full h-11 glass rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors border border-dashed border-white/20">
                        + Add Experience
                      </button>
                    </div>
                  )}

                  {activeTab === "skills" && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {[
                          "React",
                          "TypeScript",
                          "Next.js",
                          "Tailwind CSS",
                          "Node.js",
                          "GraphQL",
                          "PostgreSQL",
                          "AWS",
                          "Docker",
                          "Figma",
                        ].map((skill) => (
                          <span
                            key={skill}
                            className="px-4 py-2 rounded-xl text-sm font-medium bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-colors cursor-pointer"
                          >
                            {skill}
                          </span>
                        ))}
                        <button className="px-4 py-2 rounded-xl text-sm text-white/40 border border-dashed border-white/20 hover:text-white/60 hover:border-white/30 transition-colors">
                          + Add Skill
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === "social" && (
                    <div className="space-y-5">
                      {[
                        {
                          icon: Globe,
                          label: "Website",
                          placeholder: "https://yourwebsite.com",
                        },
                        {
                          icon: Github,
                          label: "GitHub",
                          placeholder: "https://github.com/username",
                        },
                        {
                          icon: Linkedin,
                          label: "LinkedIn",
                          placeholder: "https://linkedin.com/in/username",
                        },
                        {
                          icon: Twitter,
                          label: "Twitter",
                          placeholder: "https://twitter.com/username",
                        },
                      ].map((social) => (
                        <div key={social.label}>
                          <label className="block text-sm font-medium text-white/70 mb-2">
                            {social.label}
                          </label>
                          <div className="relative">
                            <social.icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            <input
                              type="url"
                              placeholder={social.placeholder}
                              className="w-full h-11 pl-11 pr-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                    <button className="h-11 px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl font-semibold text-sm text-white shadow-lg shadow-blue-500/25 transition-all duration-300 flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
