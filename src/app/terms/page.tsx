import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Global Job Matching",
  description: "Terms of Service for Global Job Matching.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[var(--page-bg)] py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto glass-card p-8 sm:p-12">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-6">Terms of Service</h1>
        <div className="text-[var(--text-secondary)] leading-relaxed space-y-6">
          <p><strong className="text-[var(--text-primary)]">Last Updated:</strong> August 20, 2026</p>
          
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">1. Acceptance of Terms</h2>
          <p>By accessing or using Global Job Matching, you agree to be bound by these Terms of Service. If you do not agree, please do not use our platform.</p>

          <h2 className="text-xl font-semibold text-[var(--text-primary)]">2. User Accounts</h2>
          <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate and complete information when creating an account.</p>

          <h2 className="text-xl font-semibold text-[var(--text-primary)]">3. Job Listings</h2>
          <p>Employers are solely responsible for the accuracy of job listings. Global Job Matching does not guarantee the validity of any job posting.</p>

          <h2 className="text-xl font-semibold text-[var(--text-primary)]">4. Prohibited Conduct</h2>
          <p>You may not use the platform for any unlawful purpose, including fraud, harassment, or distribution of malicious software.</p>

          <h2 className="text-xl font-semibold text-[var(--text-primary)]">5. Limitation of Liability</h2>
          <p>Global Job Matching is provided &quot;as is&quot; without warranties of any kind. We are not liable for any damages arising from your use of the platform.</p>

          <h2 className="text-xl font-semibold text-[var(--text-primary)]">6. Changes to Terms</h2>
          <p>We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the new terms.</p>

          <h2 className="text-xl font-semibold text-[var(--text-primary)]">7. Contact</h2>
          <p>For questions about these terms, please contact us at <a href="mailto:legal@globaljobmatching.com" className="text-[var(--ios-blue)] hover:underline">legal@globaljobmatching.com</a>.</p>
        </div>
      </div>
    </main>
  );
}
