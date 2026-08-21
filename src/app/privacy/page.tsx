import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Global Job Matching",
  description: "Privacy Policy for Global Job Matching.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        <div className="prose prose-gray max-w-none text-gray-600">
          <p className="mb-4"><strong>Last Updated:</strong> August 20, 2026</p>
          
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">1. Information We Collect</h2>
          <p className="mb-4">
            We collect information you provide directly, such as your name, email, resume, 
            and profile information. We also collect usage data to improve our services.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">2. How We Use Your Information</h2>
          <p className="mb-4">
            We use your information to provide job matching services, communicate with you, 
            and improve our platform. We do not sell your personal data to third parties.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">3. Data Sharing</h2>
          <p className="mb-4">
            We may share your information with employers when you apply for jobs, or with 
            service providers who assist in operating our platform.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">4. Cookies</h2>
          <p className="mb-4">
            We use cookies to enhance your experience. You can manage cookie preferences 
            through your browser settings.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">5. Data Security</h2>
          <p className="mb-4">
            We implement industry-standard security measures to protect your data. 
            However, no method of transmission over the internet is 100% secure.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">6. Your Rights</h2>
          <p className="mb-4">
            You have the right to access, correct, or delete your personal information. 
            Contact us to exercise these rights.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">7. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at{" "}
            <a href="mailto:privacy@globaljobmatching.com" className="text-indigo-600 hover:underline">
              privacy@globaljobmatching.com
            </a>.
          </p>
        </div>
      </div>
    </main>
  );
}
