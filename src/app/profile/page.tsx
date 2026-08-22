"use client";

import { useState } from "react";
import {
  User,
  Mail,
  MapPin,
  Briefcase,
  Link as LinkIcon,
  Github,
  Linkedin,
  Globe,
  Camera,
  Save,
  Edit3,
  FileText,
  Award,
  BookOpen,
  Building2,
  Plus,
  X,
} from "lucide-react";

interface UserProfile {
  name: string;
  title: string;
  email: string;
  location: string;
  bio: string;
  website: string;
  github: string;
  linkedin: string;
  skills: string[];
  experience: {
    id: string;
    role: string;
    company: string;
    period: string;
    description: string;
  }[];
  education: {
    id: string;
    degree: string;
    school: string;
    year: string;
  }[];
}

const initialProfile: UserProfile = {
  name: "John Doe",
  title: "Senior Frontend Developer",
  email: "john.doe@example.com",
  location: "San Francisco, CA",
  bio: "Passionate frontend developer with 6+ years of experience building modern web applications. Specialized in React, Next.js, and TypeScript.",
  website: "https://johndoe.dev",
  github: "github.com/johndoe",
  linkedin: "linkedin.com/in/johndoe",
  skills: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Node.js", "GraphQL", "Docker"],
  experience: [
    {
      id: "1",
      role: "Senior Frontend Developer",
      company: "TechCorp Global",
      period: "2022 - Present",
      description: "Leading the frontend team, architecting scalable React applications.",
    },
    {
      id: "2",
      role: "Frontend Developer",
      company: "StartupHub",
      period: "2020 - 2022",
      description: "Built and maintained multiple client projects using Next.js and TypeScript.",
    },
  ],
  education: [
    {
      id: "1",
      degree: "B.S. Computer Science",
      school: "Stanford University",
      year: "2016 - 2020",
    },
  ],
};

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [newSkill, setNewSkill] = useState("");

  const handleChange = (field: keyof UserProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const addSkill = () => {
    if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
      setProfile((prev) => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }));
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    setProfile((prev) => ({ ...prev, skills: prev.skills.filter((s) => s !== skill) }));
  };

  const handleSave = () => {
    setIsEditing(false);
    console.log("Saving profile:", profile);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Profile Header */}
        <div className="glass rounded-2xl p-6 md:p-8 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="relative">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-3xl md:text-4xl font-bold shadow-2xl">
                {profile.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              {isEditing && (
                <button className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-cyan-500 text-white flex items-center justify-center shadow-lg hover:bg-cyan-600 transition-colors">
                  <Camera className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="flex-1 text-center md:text-left">
              {isEditing ? (
                <div className="space-y-3 max-w-md">
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xl font-bold outline-none focus:border-cyan-500/50"
                  />
                  <input
                    type="text"
                    value={profile.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-slate-300 outline-none focus:border-cyan-500/50"
                  />
                </div>
              ) : (
                <>
                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">{profile.name}</h1>
                  <p className="text-cyan-400 font-medium mb-3">{profile.title}</p>
                </>
              )}

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {profile.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4" />
                  {profile.email}
                </span>
              </div>
            </div>

            <button
              onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
                isEditing
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                  : "glass text-slate-300 hover:text-white hover:bg-white/10 border border-white/10"
              }`}
            >
              {isEditing ? (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4" />
                  Edit Profile
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Bio */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                About
              </h3>
              {isEditing ? (
                <textarea
                  value={profile.bio}
                  onChange={(e) => handleChange("bio", e.target.value)}
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-300 text-sm outline-none focus:border-cyan-500/50 resize-none"
                />
              ) : (
                <p className="text-slate-300 text-sm leading-relaxed">{profile.bio}</p>
              )}
            </div>

            {/* Links */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-cyan-400" />
                Links
              </h3>
              <div className="space-y-3">
                {isEditing ? (
                  <>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={profile.website}
                        onChange={(e) => handleChange("website", e.target.value)}
                        placeholder="Website"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    <div className="relative">
                      <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={profile.github}
                        onChange={(e) => handleChange("github", e.target.value)}
                        placeholder="GitHub"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    <div className="relative">
                      <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={profile.linkedin}
                        onChange={(e) => handleChange("linkedin", e.target.value)}
                        placeholder="LinkedIn"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-slate-300 hover:text-cyan-400 transition-colors text-sm"
                    >
                      <Globe className="w-4 h-4 text-cyan-400" />
                      {profile.website}
                    </a>
                    <a
                      href={`https://${profile.github}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-slate-300 hover:text-cyan-400 transition-colors text-sm"
                    >
                      <Github className="w-4 h-4 text-cyan-400" />
                      {profile.github}
                    </a>
                    <a
                      href={`https://${profile.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-slate-300 hover:text-cyan-400 transition-colors text-sm"
                    >
                      <Linkedin className="w-4 h-4 text-cyan-400" />
                      {profile.linkedin}
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Skills */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-cyan-400" />
                Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 text-xs border border-white/10"
                  >
                    {skill}
                    {isEditing && (
                      <button
                        onClick={() => removeSkill(skill)}
                        className="ml-1 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {isEditing && (
                <div className="flex gap-2 mt-4">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                    placeholder="Add a skill..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-cyan-500/50"
                  />
                  <button
                    onClick={addSkill}
                    className="px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Experience */}
            <div className="glass rounded-2xl p-6 md:p-8">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-cyan-400" />
                Experience
              </h3>
              <div className="space-y-6">
                {profile.experience.map((exp) => (
                  <div key={exp.id} className="relative pl-6 border-l-2 border-white/10">
                    <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-cyan-500" />
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="text-white font-semibold">{exp.role}</h4>
                        <p className="text-slate-400 text-sm flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5" />
                          {exp.company}
                        </p>
                      </div>
                      <span className="text-xs text-slate-500 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                        {exp.period}
                      </span>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">{exp.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Education */}
            <div className="glass rounded-2xl p-6 md:p-8">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                Education
              </h3>
              <div className="space-y-6">
                {profile.education.map((edu) => (
                  <div key={edu.id} className="relative pl-6 border-l-2 border-white/10">
                    <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-purple-500" />
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-1">
                      <div>
                        <h4 className="text-white font-semibold">{edu.degree}</h4>
                        <p className="text-slate-400 text-sm">{edu.school}</p>
                      </div>
                      <span className="text-xs text-slate-500 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                        {edu.year}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
