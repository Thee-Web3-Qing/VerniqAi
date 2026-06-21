import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useVerifyVoicePayment } from "@workspace/api-client-react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function PaymentCallback() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");
  const [errorMsg, setErrorMsg] = useState("");
  const verifyPayment = useVerifyVoicePayment();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("status");
    const transactionId = params.get("transaction_id");
    const creatorId = params.get("creatorId");

    if (paymentStatus !== "successful" || !transactionId || !creatorId) {
      setStatus("failed");
      setErrorMsg(paymentStatus === "cancelled" ? "Payment was cancelled." : "Payment incomplete.");
      return;
    }

    verifyPayment.mutate(
      { transactionId, creatorId },
      {
        onSuccess: () => {
          setStatus("success");
          setTimeout(() => {
            setLocation(`/creators/${creatorId}?unlocked=1`);
          }, 2000);
        },
        onError: () => {
          setStatus("failed");
          setErrorMsg("Could not verify payment. If you were charged, contact support.");
        },
      }
    );
  }, []);

  return (
    <div className="w-full px-6 md:px-10 lg:px-16 py-24 flex flex-col items-center justify-center min-h-[60vh]">
      {status === "verifying" && (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-lg font-bold font-sans">Verifying your payment…</p>
          <p className="text-sm font-mono text-muted-foreground">This takes just a second.</p>
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <CheckCircle2 className="w-14 h-14 text-green-500" />
          <h1 className="text-2xl font-black font-sans">Payment confirmed!</h1>
          <p className="text-sm font-mono text-muted-foreground">Redirecting you back to the creator profile…</p>
        </div>
      )}

      {status === "failed" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <XCircle className="w-14 h-14 text-destructive" />
          <h1 className="text-2xl font-black font-sans">Payment not verified</h1>
          <p className="text-sm font-mono text-muted-foreground max-w-md">{errorMsg}</p>
          <button
            onClick={() => setLocation("/creators")}
            className="mt-4 px-6 py-3 border border-border text-sm font-bold hover:border-primary transition-colors"
          >
            Back to Marketplace
          </button>
        </div>
      )}
    </div>
  );
}
