"use client";

import { useState } from "react";
import Link from "next/link";
import { Briefcase, Eye, EyeOff, Mail, Lock, User, ArrowRight, CheckCircle2 } from "lucide-react";

const steps = [
  { label: "Account", number: 1 },
  { label: "Profile", number: 2 },
  { label: "Preferences", number: 3 },
];

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    title: "",
    location: "",
    jobType: "Full-time",
    remote: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      // اینجا منطق ثبت‌نام واقعی‌ت رو بذار
      console.log("Register data:", formData);
    }
  };

  return (
    <main className="min-h-screen bg-[#f0f2f5] dark:bg-[#0b0d12] flex items-center justify-center py-10 px-4 transition-colors duration-300">
      <div className="w-full max-w-lg">
        {/* لوگو بالای صفحه */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#3478F5] flex items-center justify-center shadow-lg">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              Global<span className="text-[#3478F5]">Job</span>
            </span>
          </Link>
        </div>

        {/* استپ‌ها */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, i) => (
            <div key={step.number} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all
                  ${
                    currentStep === step.number
                      ? "bg-[#3478F5] text-white shadow-lg shadow-blue-500/30"
                      : currentStep > step.number
                      ? "bg-blue-100 dark:bg-blue-900/40 text-[#3478F5]"
                      : "bg-gray-200 dark:bg-[#1e2330] text-gray-500 dark:text-gray-400"
                  }`}
              >
                {currentStep > step.number ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  step.number
                )}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-12 h-1 mx-2 rounded-full transition-all ${
                    currentStep > step.number
                      ? "bg-[#3478F5]"
                      : "bg-gray-200 dark:bg-[#1e2330]"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* کارت اصلی */}
        <div className="rounded-3xl p-8 sm:p-10 
          bg-white dark:bg-[#13151c] 
          border border-gray-200/60 dark:border-[#1e2330]
          shadow-[0_10px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)]
          transition-all duration-300">
          
          <h2 className="text-xl font-bold text-center text-gray-900 dark:text-gray-100 mb-1">
            {currentStep === 1 && "Create your account"}
            {currentStep === 2 && "Tell us about yourself"}
            {currentStep === 3 && "Set your preferences"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
            {currentStep === 1 && "Start your journey to find your dream job"}
            {currentStep === 2 && "Help us match you with the best opportunities"}
            {currentStep === 3 && "Customize your job search experience"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* مرحله ۱ */}
            {currentStep === 1 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      required
                      className="w-full py-3.5 pl-11 pr-5 rounded-full outline-none transition-all
                        bg-[#f0f2f5] dark:bg-[#0b0d12]
                        text-gray-900 dark:text-gray-100
                        placeholder:text-gray-400 dark:placeholder:text-gray-500
                        shadow-[inset_4px_4px_8px_#d1d5db,inset_-4px_-4px_8px_#ffffff]
                        dark:shadow-[inset_4px_4px_8px_#050608,inset_-4px_-4px_8px_#1a1d24]
                        focus:shadow-[inset_2px_2px_5px_#d1d5db,inset_-2px_-2px_5px_#ffffff]
                        dark:focus:shadow-[inset_2px_2px_5px_#050608,inset_-2px_-2px_5px_#1a1d24]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      required
                      className="w-full py-3.5 pl-11 pr-5 rounded-full outline-none transition-all
                        bg-[#f0f2f5] dark:bg-[#0b0d12]
                        text-gray-900 dark:text-gray-100
                        placeholder:text-gray-400 dark:placeholder:text-gray-500
                        shadow-[inset_4px_4px_8px_#d1d5db,inset_-4px_-4px_8px_#ffffff]
                        dark:shadow-[inset_4px_4px_8px_#050608,inset_-4px_-4px_8px_#1a1d24]
                        focus:shadow-[inset_2px_2px_5px_#d1d5db,inset_-2px_-2px_5px_#ffffff]
                        dark:focus:shadow-[inset_2px_2px_5px_#050608,inset_-2px_-2px_5px_#1a1d24]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Create a strong password"
                      required
                      className="w-full py-3.5 pl-11 pr-11 rounded-full outline-none transition-all
                        bg-[#f0f2f5] dark:bg-[#0b0d12]
                        text-gray-900 dark:text-gray-100
                        placeholder:text-gray-400 dark:placeholder:text-gray-500
                        shadow-[inset_4px_4px_8px_#d1d5db,inset_-4px_-4px_8px_#ffffff]
                        dark:shadow-[inset_4px_4px_8px_#050608,inset_-4px_-4px_8px_#1a1d24]
                        focus:shadow-[inset_2px_2px_5px_#d1d5db,inset_-2px_-2px_5px_#ffffff]
                        dark:focus:shadow-[inset_2px_2px_5px_#050608,inset_-2px_-2px_5px_#1a1d24]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* مرحله ۲ */}
            {currentStep === 2 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. Senior Developer"
                    required
                    className="w-full py-3.5 px-5 rounded-full outline-none transition-all
                      bg-[#f0f2f5] dark:bg-[#0b0d12]
                      text-gray-900 dark:text-gray-100
                      placeholder:text-gray-400 dark:placeholder:text-gray-500
                      shadow-[inset_4px_4px_8px_#d1d5db,inset_-4px_-4px_8px_#ffffff]
                      dark:shadow-[inset_4px_4px_8px_#050608,inset_-4px_-4px_8px_#1a1d24]
                      focus:shadow-[inset_2px_2px_5px_#d1d5db,inset_-2px_-2px_5px_#ffffff]
                      dark:focus:shadow-[inset_2px_2px_5px_#050608,inset_-2px_-2px_5px_#1a1d24]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                    Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g. San Francisco, CA"
                    className="w-full py-3.5 px-5 rounded-full outline-none transition-all
                      bg-[#f0f2f5] dark:bg-[#0b0d12]
                      text-gray-900 dark:text-gray-100
                      placeholder:text-gray-400 dark:placeholder:text-gray-500
                      shadow-[inset_4px_4px_8px_#d1d5db,inset_-4px_-4px_8px_#ffffff]
                      dark:shadow-[inset_4px_4px_8px_#050608,inset_-4px_-4px_8px_#1a1d24]
                      focus:shadow-[inset_2px_2px_5px_#d1d5db,inset_-2px_-2px_5px_#ffffff]
                      dark:focus:shadow-[inset_2px_2px_5px_#050608,inset_-2px_-2px_5px_#1a1d24]"
                  />
                </div>
              </>
            )}

            {/* مرحله ۳ */}
            {currentStep === 3 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                    Preferred Job Type
                  </label>
                  <select
                    name="jobType"
                    value={formData.jobType}
                    onChange={handleChange}
                    className="w-full py-3.5 px-5 rounded-full outline-none transition-all appearance-none
                      bg-[#f0f2f5] dark:bg-[#0b0d12]
                      text-gray-900 dark:text-gray-100
                      shadow-[inset_4px_4px_8px_#d1d5db,inset_-4px_-4px_8px_#ffffff]
                      dark:shadow-[inset_4px_4px_8px_#050608,inset_-4px_-4px_8px_#1a1d24]"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#f0f2f5] dark:bg-[#0b0d12]">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">Remote Jobs</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Include remote opportunities</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, remote: !formData.remote })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.remote ? "bg-[#3478F5]" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.remote ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </>
            )}

            {/* دکمه‌ها */}
            <div className="flex gap-3 pt-2">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="flex-1 py-3.5 rounded-full border border-gray-300 dark:border-gray-600 
                    text-gray-700 dark:text-gray-300 font-medium
                    hover:bg-gray-50 dark:hover:bg-[#1a1d24] transition-all"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                className="flex-1 py-3.5 rounded-full bg-[#3478F5] text-white font-semibold
                  shadow-[0_6px_20px_rgba(52,120,245,0.35)]
                  hover:bg-[#5B9BF7] active:scale-[0.98]
                  transition-all flex items-center justify-center gap-2"
              >
                {currentStep === 3 ? (
                  <>
                    Complete <CheckCircle2 className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Continue <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {currentStep === 1 && (
            <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-blue-500 hover:underline">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
