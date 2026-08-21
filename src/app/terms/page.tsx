import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Global Job Matching",
  description: "Terms of Service for Global Job Matching.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
        <div className="prose prose-gray max-w-none text-gray-600">
          <p className="mb-4"><strong>Last Updated:</strong> August 20, 2026</p>
          
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">1. Acceptance of Terms</h2>
          <p className="mb-4">
            By accessing or using Global Job Matching, you agree to be bound by these Terms of Service. 
            If you do not agree, please do not use our platform.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">2. User Accounts</h2>
          <p className="mb-4">
            You are responsible for maintaining the confidentiality of your account credentials. 
            You agree to provide accurate and complete information when creating an account.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">3. Job Listings</h2>
          <p className="mb-4">
            Employers are solely responsible for the accuracy of job listings. 
            Global Job Matching does not guarantee the validity of any job posting.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">4. Prohibited Conduct</h2>
          <p className="mb-4">
            You may not use the platform for any unlawful purpose, including fraud, harassment, 
            or distribution of malicious software.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">5. Limitation of Liability</h2>
          <p className="mb-4">
            Global Job Matching is provided &quot;as is&quot; without warranties of any kind. 
            We are not liable for any damages arising from your use of the platform.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">6. Changes to Terms</h2>
          <p className="mb-4">
            We reserve the right to modify these terms at any time. Continued use of the platform 
            after changes constitutes acceptance of the new terms.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">7. Contact</h2>
          <p>
            For questions about these terms, please contact us at{" "}
            <a href="mailto:legal@globaljobmatching.com" className="text-indigo-600 hover:underline">
              legal@globaljobmatching.com
            </a>.
          </p>
        </div>
      </div>
    </main>
  );
}
