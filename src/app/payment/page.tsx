import { Suspense } from "react";
import { PaymentContent } from "./payment-content";

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="glass rounded-2xl p-8 text-center border border-white/10">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400 text-sm">Loading...</p>
          </div>
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
