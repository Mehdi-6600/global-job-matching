"use client";

import { useState } from "react";
import {
  User,
  Mail,
  MapPin,
  Briefcase,
  GraduationCap,
  Link as LinkIcon,
  Save,
  Camera,
  Pencil,
} from "lucide-react";
import { Navbar } from "@/components/navbar";

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "John Doe",
    email: "john@example.com",
    location: "San Francisco, CA",
    title: "Senior Frontend Developer",
    bio: "Passionate developer with 5+ years of experience building modern web applications.",
    website: "https://johndoe.dev",
    skills: "React, TypeScript, Next.js, Node.js, Tailwind CSS",
    experience: "5+ years",
    education: "B.S. Computer Science",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
      <Navbar />

      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="glass-section p-8 mb-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl ios-blue-bg flex items-center justify-center text-3xl font-bold text-white shadow-glow">
                  {formData.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <button className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg glass flex items-center justify-center text-[var(--text-muted)] hover:text-[#3478F5] transition-colors">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl font-bold">{formData.name}</h1>
                <p className="text-[var(--text-secondary)]">{formData.title}</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2 text-sm text-[var(--text-muted)]">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{formData.location}</span>
                  <span className="flex items-center gap-1"><LinkIcon className="w-3.5 h-3.5" />{formData.website}</span>
                </div>
              </div>
              <button onClick={() => (isEditing ? handleSave() : setIsEditing(true))} className="btn-primary flex items-center gap-2">
                {isEditing ? <><Save className="w-4 h-4" />Save Changes</> : <><Pencil className="w-4 h-4" />Edit Profile</>}
              </button>
            </div>
          </div>

          <div className="glass-section p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: "Full Name", name: "name", icon: User, type: "text" },
                { label: "Email", name: "email", icon: Mail, type: "email" },
                { label: "Job Title", name: "title", icon: Briefcase, type: "text" },
                { label: "Location", name: "location", icon: MapPin, type: "text" },
                { label: "Website", name: "website", icon: LinkIcon, type: "url" },
                { label: "Experience", name: "experience", icon: Briefcase, type: "text" },
                { label: "Education", name: "education", icon: GraduationCap, type: "text" },
                { label: "Skills", name: "skills", icon: null, type: "text" },
              ].map((field) => (
                <div key={field.name} className={field.name === "bio" ? "md:col-span-2" : ""}>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">{field.label}</label>
                  <div className="relative">
                    {field.icon && <field.icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />}
                    <input
                      type={field.type}
                      name={field.name}
                      value={(formData as any)[field.name]}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={`glass-input w-full ${field.icon ? "pl-11" : ""}`}
                    />
                  </div>
                </div>
              ))}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  disabled={!isEditing}
                  rows={4}
                  className="glass-input w-full resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
