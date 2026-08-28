import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Global Job Matching",
  description: "Privacy Policy for Global Job Matching.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto glass rounded-2xl p-8 sm:p-12 border border-white/10">
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-slate-500 text-sm mb-8">Last updated: August 28, 2026</p>

        <div className="text-slate-300 leading-relaxed space-y-6 text-sm sm:text-base">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              1. Information We Collect
            </h2>
            <p>
              We collect information you provide (name, email, password hash,
              profile details, applications, resume filename if uploaded) and
              technical data such as IP-related rate limits and basic usage logs
              needed to run the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              2. How We Use Information
            </h2>
            <p>
              We use data to operate accounts, show jobs, process applications,
              send service-related messages (e.g. status updates), improve the
              product, and prevent abuse. We do not sell your personal data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              3. Sharing
            </h2>
            <p>
              When you apply to a job, relevant profile and application data may
              be visible to that employer. We may use infrastructure providers
              (hosting, database, email) that process data on our behalf under
              appropriate agreements.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              4. Cookies &amp; Sessions
            </h2>
            <p>
              We use session cookies / tokens for authentication and security.
              You can clear cookies in your browser; doing so may log you out.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              5. Security
            </h2>
            <p>
              We use industry-standard practices (hashed passwords, HTTPS,
              access controls). No system is 100% secure; use a strong unique
              password.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              6. Your Rights
            </h2>
            <p>
              Depending on your location, you may request access, correction, or
              deletion of your personal data. Contact us to exercise these
              rights. Some data may be retained where required by law or for
              legitimate security reasons.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">7. Contact</h2>
            <p>
              Privacy questions:{" "}
              <a
                href="mailto:privacy@globaljobmatching.com"
                className="text-sky-400 hover:underline"
              >
                privacy@globaljobmatching.com
              </a>{" "}
              or{" "}
              <Link href="/contact" className="text-sky-400 hover:underline">
                Contact
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
