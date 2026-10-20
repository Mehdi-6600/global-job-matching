import { Suspense } from "react";
import { PaymentContent } from "./payment-content";

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="gjm-page flex min-h-[60vh] items-center justify-center">
          <div className="glass rounded-2xl p-8 text-center border border-[var(--border)]">
            <div className="w-8 h-8 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[var(--text-muted)] text-sm">Loading...</p>
          </div>
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
