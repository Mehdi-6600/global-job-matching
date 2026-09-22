"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Mail,
  MapPin,
  Briefcase,
  Link as LinkIcon,
  Github,
  Linkedin,
  Globe,
  Save,
  Edit3,
  FileText,
  Award,
  Loader2,
  AlertCircle,
  Plus,
  X,
  ArrowLeft,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { messageFromApiError } from "@/lib/api-error-i18n";

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
  phone: string;
}

const EMPTY_PROFILE: UserProfile = {
  name: "",
  title: "",
  email: "",
  location: "",
  bio: "",
  website: "",
  github: "",
  linkedin: "",
  skills: [],
  phone: "",
};

function splitSkills(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,|;،\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)
    .slice(0, 40);
}

export default function ProfilePage() {
  const { t } = useLocale();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [originalProfile, setOriginalProfile] =
    useState<UserProfile>(EMPTY_PROFILE);
  const [newSkill, setNewSkill] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  /* -------------------------------------------------------------- */
  /* Load profile from API                                          */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    fetch("/api/profile", { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = "/login?callbackUrl=/profile";
          return null;
        }
        const data = await res.json().catch(() => ({}));
        if (cancelled) return null;
        if (!res.ok) {
          setLoadError(messageFromApiError(res.status, data, t));
          setLoading(false);
          return null;
        }
        return data as {
          profile?: {
            name?: string | null;
            title?: string | null;
            email?: string | null;
            location?: string | null;
            bio?: string | null;
            phone?: string | null;
            skills?: string | null;
            linkedin?: string | null;
            github?: string | null;
            portfolio?: string | null;
          };
        };
      })
      .then((data) => {
        if (cancelled || !data?.profile) return;
        const p = data.profile;

        const loaded: UserProfile = {
          name: p.name || "",
          title: p.title || "",
          email: p.email || "",
          location: p.location || "",
          bio: p.bio || "",
          phone: p.phone || "",
          website: p.portfolio || "",
          github: p.github || "",
          linkedin: p.linkedin || "",
          skills: splitSkills(p.skills),
        };

        setProfile(loaded);
        setOriginalProfile(loaded);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(
            t(
              "Common.errorNetwork",
              "Network error. Please try again.",
            ),
          );
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  /* -------------------------------------------------------------- */
  /* Handlers                                                       */
  /* -------------------------------------------------------------- */
  const handleChange = useCallback(
    (field: keyof UserProfile, value: string) => {
      setProfile((prev) => ({ ...prev, [field]: value }));
      setSaveError("");
      setSaveSuccess(false);
    },
    [],
  );

  const addSkill = useCallback(() => {
    const trimmed = newSkill.trim();
    if (trimmed && !profile.skills.includes(trimmed)) {
      setProfile((prev) => ({
        ...prev,
        skills: [...prev.skills, trimmed],
      }));
      setNewSkill("");
      setSaveError("");
      setSaveSuccess(false);
    }
  }, [newSkill, profile.skills]);

  const removeSkill = useCallback((skill: string) => {
    setProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }));
    setSaveError("");
    setSaveSuccess(false);
  }, []);

  const handleCancel = useCallback(() => {
    setProfile(originalProfile);
    setIsEditing(false);
    setSaveError("");
    setSaveSuccess(false);
    setNewSkill("");
  }, [originalProfile]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaveError("");
    setSaveSuccess(false);
    setSaving(true);

    try {
      const payload = {
        name: profile.name.trim(),
        title: profile.title.trim(),
        bio: profile.bio.trim(),
        location: profile.location.trim(),
        phone: profile.phone.trim(),
        linkedin: profile.linkedin.trim(),
        github: profile.github.trim(),
        portfolio: profile.website.trim(),
        skills: profile.skills.join(", "),
      };

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        window.location.href = "/login?callbackUrl=/profile";
        return;
      }

      if (!res.ok) {
        setSaveError(messageFromApiError(res.status, data, t));
        return;
      }

      setOriginalProfile(profile);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError(
        t("Common.errorNetwork", "Network error. Please try again."),
      );
    } finally {
      setSaving(false);
    }
  }, [profile, saving, t]);

  /* -------------------------------------------------------------- */
  /* Loading / error states                                         */
  /* -------------------------------------------------------------- */
  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">
            {t("Profile.loading", "Loading profile...")}
          </p>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 flex items-center justify-center px-4">
        <div className="text-center glass rounded-2xl p-8 border border-red-500/20 max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 font-medium mb-4">{loadError}</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-cyan-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("Common.back", "Back")}
          </Link>
        </div>
      </main>
    );
  }

  /* -------------------------------------------------------------- */
  /* Derived values                                                 */
  /* -------------------------------------------------------------- */
  const displayName =
    profile.name || t("Profile.anonymous", "Anonymous");

  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  const hasAnyLink =
    Boolean(profile.website) ||
    Boolean(profile.github) ||
    Boolean(profile.linkedin);

  /* -------------------------------------------------------------- */
  /* Render                                                         */
  /* -------------------------------------------------------------- */
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Success / error banners */}
        {saveSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center gap-2">
            <Save className="w-4 h-4" />
            {t("Profile.saved", "Profile saved")}
          </div>
        )}

        {saveError && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {saveError}
          </div>
        )}

        {/* Header card */}
        <div className="glass rounded-2xl p-6 md:p-8 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="relative">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-3xl md:text-4xl font-bold shadow-2xl">
                {initials}
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              {isEditing ? (
                <div className="space-y-3 max-w-md mx-auto md:mx-0">
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder={t("Profile.name", "Full name")}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xl font-bold outline-none focus:border-cyan-500/50"
                  />
                  <input
                    type="text"
                    value={profile.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    placeholder={t("Profile.headline", "Headline / title")}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-slate-300 outline-none focus:border-cyan-500/50"
                  />
                </div>
              ) : (
                <>
                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                    {displayName}
                  </h1>
                  {profile.title && (
                    <p className="text-cyan-400 font-medium mb-3">
                      {profile.title}
                    </p>
                  )}
                </>
              )}

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-slate-400 mt-3">
                {isEditing ? (
                  <>
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <input
                        type="text"
                        value={profile.location}
                        onChange={(e) =>
                          handleChange("location", e.target.value)
                        }
                        placeholder={t("Profile.location", "Location")}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-cyan-500/50 flex-1"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <Mail className="w-4 h-4 shrink-0" />
                      <span className="text-slate-400">{profile.email}</span>
                    </div>
                  </>
                ) : (
                  <>
                    {profile.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        {profile.location}
                      </span>
                    )}
                    {profile.email && (
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-4 h-4" />
                        {profile.email}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              {isEditing && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all glass text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 disabled:opacity-60"
                >
                  <X className="w-4 h-4" />
                  {t("Common.cancel", "Cancel")}
                </button>
              )}
              <button
                type="button"
                onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
                disabled={saving}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all disabled:opacity-60 ${
                  isEditing
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                    : "glass text-slate-300 hover:text-white hover:bg-white/10 border border-white/10"
                }`}
              >
                {isEditing ? (
                  saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("Common.loading", "Loading...")}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {t("Profile.saveChanges", "Save Changes")}
                    </>
                  )
                ) : (
                  <>
                    <Edit3 className="w-4 h-4" />
                    {t("Profile.editProfile", "Edit Profile")}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            {/* About */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                {t("Profile.about", "About")}
              </h3>
              {isEditing ? (
                <textarea
                  value={profile.bio}
                  onChange={(e) => handleChange("bio", e.target.value)}
                  rows={4}
                  placeholder={t(
                    "Profile.bioPlaceholder",
                    "Write something about yourself...",
                  )}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-300 text-sm outline-none focus:border-cyan-500/50 resize-none"
                />
              ) : profile.bio ? (
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                  {profile.bio}
                </p>
              ) : (
                <p className="text-slate-500 text-sm italic">
                  {t("Profile.bioEmpty", "No bio yet.")}
                </p>
              )}
            </div>

            {/* Links */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-cyan-400" />
                {t("Profile.links", "Links")}
              </h3>
              <div className="space-y-3">
                {isEditing ? (
                  <>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={profile.website}
                        onChange={(e) =>
                          handleChange("website", e.target.value)
                        }
                        placeholder={t(
                          "Profile.websitePlaceholder",
                          "Website",
                        )}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    <div className="relative">
                      <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={profile.github}
                        onChange={(e) =>
                          handleChange("github", e.target.value)
                        }
                        placeholder={t(
                          "Profile.githubPlaceholder",
                          "GitHub",
                        )}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    <div className="relative">
                      <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={profile.linkedin}
                        onChange={(e) =>
                          handleChange("linkedin", e.target.value)
                        }
                        placeholder={t(
                          "Profile.linkedinPlaceholder",
                          "LinkedIn",
                        )}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50"
                      />
                    </div>
                  </>
                ) : hasAnyLink ? (
                  <>
                    {profile.website && (
                      <a
                        href={
                          profile.website.startsWith("http")
                            ? profile.website
                            : `https://${profile.website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-slate-300 hover:text-cyan-400 transition-colors text-sm break-all"
                      >
                        <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                        {profile.website}
                      </a>
                    )}
                    {profile.github && (
                      <a
                        href={
                          profile.github.startsWith("http")
                            ? profile.github
                            : `https://${profile.github}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-slate-300 hover:text-cyan-400 transition-colors text-sm break-all"
                      >
                        <Github className="w-4 h-4 text-cyan-400 shrink-0" />
                        {profile.github}
                      </a>
                    )}
                    {profile.linkedin && (
                      <a
                        href={
                          profile.linkedin.startsWith("http")
                            ? profile.linkedin
                            : `https://${profile.linkedin}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-slate-300 hover:text-cyan-400 transition-colors text-sm break-all"
                      >
                        <Linkedin className="w-4 h-4 text-cyan-400 shrink-0" />
                        {profile.linkedin}
                      </a>
                    )}
                  </>
                ) : (
                  <p className="text-slate-500 text-sm italic">
                    {t("Profile.linksEmpty", "No links added yet.")}
                  </p>
                )}
              </div>
            </div>

            {/* Skills */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-cyan-400" />
                {t("Profile.skills", "Skills")}
              </h3>
              {profile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 text-xs border border-white/10"
                    >
                      {skill}
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="ml-1 text-slate-400 hover:text-red-400 transition-colors"
                          aria-label={t(
                            "Profile.removeSkill",
                            "Remove skill",
                          )}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm italic">
                  {t("Profile.skillsEmpty", "No skills added yet.")}
                </p>
              )}
              {isEditing && (
                <div className="flex gap-2 mt-4">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                    placeholder={t(
                      "Profile.addSkillPlaceholder",
                      "Add a skill...",
                    )}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-cyan-500/50"
                  />
                  <button
                    type="button"
                    onClick={addSkill}
                    className="px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white transition-colors"
                    aria-label={t("Profile.addSkill", "Add skill")}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {/* Experience */}
            <div className="glass rounded-2xl p-6 md:p-8">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-cyan-400" />
                {t("Profile.experience", "Experience")}
              </h3>
              {isEditing ? (
                <textarea
                  value={profile.bio}
                  onChange={(e) => handleChange("bio", e.target.value)}
                  rows={8}
                  placeholder={t(
                    "Profile.experiencePlaceholder",
                    "Roles, years, achievements",
                  )}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-300 text-sm outline-none focus:border-cyan-500/50 resize-none"
                />
              ) : profile.bio ? (
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                  {profile.bio}
                </p>
              ) : (
                <p className="text-slate-500 text-sm italic">
                  {t(
                    "Profile.experienceEmpty",
                    "No experience added yet.",
                  )}
                </p>
              )}
            </div>

            {/* Education */}
            <div className="glass rounded-2xl p-6 md:p-8">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                {t("Profile.education", "Education")}
              </h3>
              {t("Profile.educationPlaceholder", "Your education details")}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
