import { Suspense } from "react";
import { PaymentContent } from "./payment-content";

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-900 flex items-center justify-center">
          <div className="glass rounded-2xl p-8 text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 dark:text-white/50">Loading payment details...</p>
          </div>
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
