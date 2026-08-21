import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="text-xl font-bold text-indigo-600">
              Global Job Matching
            </Link>
            <p className="mt-4 text-sm text-gray-500">
              AI-powered job matching for the modern workforce.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
              Platform
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/jobs" className="text-sm text-gray-500 hover:text-indigo-600 transition">
                  Browse Jobs
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-gray-500 hover:text-indigo-600 transition">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-sm text-gray-500 hover:text-indigo-600 transition">
                  About Us
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
              Support
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/contact" className="text-sm text-gray-500 hover:text-indigo-600 transition">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-gray-500 hover:text-indigo-600 transition">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-gray-500 hover:text-indigo-600 transition">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
              Account
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/login" className="text-sm text-gray-500 hover:text-indigo-600 transition">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-sm text-gray-500 hover:text-indigo-600 transition">
                  Create Account
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-sm text-gray-500 hover:text-indigo-600 transition">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-400 text-center">
            &copy; {new Date().getFullYear()} Global Job Matching. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
