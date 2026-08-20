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
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
          Profile Settings
        </h1>
        <p className="text-white/50 mt-1">
          Manage your personal information and preferences
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
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
                <span className="text-blue-400 font-semibold">85
