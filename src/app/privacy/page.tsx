import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Global Job Matching",
  description: "Privacy Policy for Global Job Matching.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--page-bg)] py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto glass-card p-8 sm:p-12">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-6">Privacy Policy</h1>
        <div className="text-[var(--text-secondary)] leading-relaxed space-y-6">
          <p><strong className="text-[var(--text-primary)]">Last Updated:</strong> August 20, 2026</p>
          
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">1. Information We Collect</h2>
          <p>We collect information you provide directly, such as your name, email, resume, and profile information. We also collect usage data to improve our services.</p>

          <h2 className="text-xl font-semibold text-[var(--text-primary)]">2. How We Use Your Information</h2>
          <p>We use your information to provide job matching services, communicate with you, and improve our platform. We do not sell your personal data to third parties.</p>

          <h2 className="text-xl font-semibold text-[var(--text-primary)]">3. Data Sharing</h2>
          <p>We may share your information with employers when you apply for jobs, or with service providers who assist in operating our platform.</p>

          <h2 className="text-xl font-semibold text-[var(--text-primary)]">4. Cookies</h2>
          <p>We use cookies to enhance your experience. You can manage cookie preferences through your browser settings.</p>

          <h2 className="text-xl font-semibold text-[var(--text-primary)]">5. Data Security</h2>
          <p>We implement industry-standard security measures to protect your data. However, no method of transmission over the internet is 100% secure.</p>

          <h2 className="text-xl font-semibold text-[var(--text-primary)]">6. Your Rights</h2>
          <p>You have the right to access, correct, or delete your personal information. Contact us to exercise these rights.</p>

          <h2 className="text-xl font-semibold text-[var(--text-primary)]">7. Contact Us</h2>
          <p>If you have questions about this Privacy Policy, please contact us at <a href="mailto:privacy@globaljobmatching.com" className="text-[var(--ios-blue)] hover:underline">privacy@globaljobmatching.com</a>.</p>
        </div>
      </div>
    </main>
  );
}
