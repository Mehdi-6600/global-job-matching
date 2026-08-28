import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Global Job Matching",
  description: "Terms of Service for Global Job Matching.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto glass rounded-2xl p-8 sm:p-12 border border-white/10">
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-slate-500 text-sm mb-8">Last updated: August 28, 2026</p>

        <div className="text-slate-300 leading-relaxed space-y-6 text-sm sm:text-base">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using Global Job Matching (&quot;the Platform&quot;),
              you agree to these Terms of Service. If you do not agree, do not
              use the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              2. User Accounts
            </h2>
            <p>
              You are responsible for keeping your account credentials secure
              and for providing accurate information. You must be at least 16
              years old (or the legal age in your country) to create an account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              3. Job Listings &amp; Applications
            </h2>
            <p>
              Employers are responsible for the accuracy of their job posts.
              We do not guarantee that any listing is still open, legitimate, or
              suitable for you. Applicants are responsible for the content of
              their applications and profiles.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              4. Prohibited Conduct
            </h2>
            <p>
              You may not use the Platform for fraud, spam, harassment,
              scraping without permission, or any illegal activity. We may
              suspend or terminate accounts that violate these rules.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              5. Paid Plans
            </h2>
            <p>
              Optional paid plans (including crypto payments) are subject to
              verification. Features may change; refunds are handled case by
              case according to our policies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              6. Limitation of Liability
            </h2>
            <p>
              The Platform is provided &quot;as is&quot; without warranties of
              any kind. To the fullest extent allowed by law, Global Job Matching
              is not liable for indirect, incidental, or consequential damages
              arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              7. Changes
            </h2>
            <p>
              We may update these terms. Continued use after changes means you
              accept the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">8. Contact</h2>
            <p>
              Questions:{" "}
              <a
                href="mailto:legal@globaljobmatching.com"
                className="text-sky-400 hover:underline"
              >
                legal@globaljobmatching.com
              </a>{" "}
              or our{" "}
              <Link href="/contact" className="text-sky-400 hover:underline">
                Contact page
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
