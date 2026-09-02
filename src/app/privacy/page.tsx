import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Global Job Matching",
  description:
    "Privacy Policy and GDPR information for Global Job Matching users.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto glass rounded-2xl p-8 sm:p-12 border border-white/10">
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-slate-500 text-sm mb-8">
          Last updated: September 3, 2026
        </p>

        <div className="text-slate-300 leading-relaxed space-y-8 text-sm sm:text-base">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              1. Who we are
            </h2>
            <p>
              Global Job Matching (&quot;we&quot;, &quot;us&quot;) operates a
              job board and career tools at this website. For privacy questions
              contact us via the{" "}
              <Link href="/contact" className="text-cyan-400 hover:underline">
                Contact
              </Link>{" "}
              page.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              2. Information we collect
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Account data:</strong> name, email, password hash, role
                (job seeker / employer), plan.
              </li>
              <li>
                <strong>Profile data:</strong> bio, skills, experience,
                education, location, optional links, resume file metadata.
              </li>
              <li>
                <strong>Activity data:</strong> applications, saved jobs, job
                alerts, messages, interviews, notifications.
              </li>
              <li>
                <strong>Employer data:</strong> company profile and job posts.
              </li>
              <li>
                <strong>Payment data:</strong> plan, amount, crypto type, and
                transaction hash you submit (we do not store card numbers).
              </li>
              <li>
                <strong>Technical data:</strong> approximate IP for rate
                limiting (hashed where applicable), user agent, and basic page
                analytics paths.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              3. Why we process data (purposes &amp; legal bases)
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Provide the service (contract): accounts, jobs, applications.
              </li>
              <li>
                Security and abuse prevention (legitimate interests): rate
                limits, fraud checks on crypto submissions.
              </li>
              <li>
                Product improvement (legitimate interests): aggregated analytics.
              </li>
              <li>
                Legal obligations where applicable (e.g. responding to lawful
                requests).
              </li>
              <li>
                Optional emails you request (consent / contract), such as job
                alerts.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              4. Sharing
            </h2>
            <p className="mb-2">We do not sell personal data.</p>
            <p>
              When you apply to a job, the employer may see your application and
              relevant profile information. We use processors such as hosting
              (e.g. Vercel), database (e.g. Neon), and email (e.g. Resend) only
              to run the product.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              5. International transfers
            </h2>
            <p>
              Servers and subprocessors may be located outside your country
              (including the EU/EEA and the United States). Where required, we
              rely on appropriate safeguards offered by those providers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              6. Retention
            </h2>
            <p>
              We keep account and application data while your account is active
              and for a reasonable period afterward for security, disputes, and
              legal requirements. You may request deletion (see below).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              7. Your rights (including GDPR)
            </h2>
            <p className="mb-2">
              Depending on your location, you may have the right to:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Access a copy of your personal data</li>
              <li>Rectify inaccurate data</li>
              <li>Request erasure (&quot;right to be forgotten&quot;)</li>
              <li>Restrict or object to certain processing</li>
              <li>Data portability for data you provided</li>
              <li>Withdraw consent where processing is based on consent</li>
              <li>Lodge a complaint with a supervisory authority</li>
            </ul>
            <p className="mt-3">
              To exercise these rights, use the{" "}
              <Link href="/contact" className="text-cyan-400 hover:underline">
                Contact
              </Link>{" "}
              form with the subject &quot;Privacy request&quot; and the email of
              your account. We may need to verify your identity.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              8. Cookies &amp; local storage
            </h2>
            <p>
              We use essential cookies/session storage for login and security,
              and may store language preference (e.g. locale) in local storage or
              a cookie. We do not use third-party advertising cookies on the
              core product.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              9. Security
            </h2>
            <p>
              Passwords are stored hashed. Access to admin tools is restricted by
              role. No method of transmission over the Internet is 100% secure;
              please use a strong unique password.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              10. Children
            </h2>
            <p>
              The service is not directed to children under 16. If you believe a
              child provided data, contact us to delete it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              11. Changes
            </h2>
            <p>
              We may update this policy. The &quot;Last updated&quot; date at the
              top will change. Continued use after updates means you accept the
              revised policy where permitted by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              12. Contact
            </h2>
            <p>
              Privacy requests:{" "}
              <Link href="/contact" className="text-cyan-400 hover:underline">
                /contact
              </Link>
              . Also see our{" "}
              <Link href="/terms" className="text-cyan-400 hover:underline">
                Terms of Service
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
