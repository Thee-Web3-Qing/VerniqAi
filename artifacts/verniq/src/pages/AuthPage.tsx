import { useLocation } from "wouter";
import { SignIn, SignUp } from "@clerk/react";
import { useState, useEffect } from "react";
import { Logo } from "@/components/Logo";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const clerkAppearance = {
  variables: {
    colorPrimary: "hsl(270 65% 60%)",
    colorBackground: "hsl(0 0% 8%)",
    colorNeutral: "hsl(0 0% 20%)",
    borderRadius: "0.5rem",
    fontFamily: "Inter, sans-serif",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "bg-transparent border-0 shadow-none w-full p-0",
    header: "hidden",
    socialButtonsBlockButton: "bg-card border border-border text-foreground hover:bg-secondary mb-6",
    formFieldInput: "bg-input border border-border text-foreground py-3",
    formFieldLabel: "text-muted-foreground text-xs font-mono uppercase tracking-widest mb-2",
    formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90 py-3 font-bold text-sm w-full mt-4",
    footerActionLink: "text-primary hover:text-primary/80 font-bold",
    dividerText: "text-xs font-mono uppercase tracking-widest text-muted-foreground",
    dividerLine: "bg-border",
    footer: "hidden",
  },
};

export default function AuthPage() {
  const [location] = useLocation();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    if (window.location.hash === "#signup") {
      setMode("signup");
    } else {
      setMode("signin");
    }
  }, [location]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-between items-center mb-12">
          <Logo />
          <span className="text-xs font-mono font-bold tracking-widest text-muted-foreground">STEP 1 / 4 · ACCOUNT</span>
        </div>

        <div className="mb-8">
          <div className="text-xs font-mono font-bold tracking-widest text-muted-foreground mb-4">
            {mode === "signin" ? "SIGN IN" : "CREATE ACCOUNT"}
          </div>
          <h1 className="text-4xl font-sans font-black tracking-tight mb-4">
            Start sounding <span className="text-primary">like you.</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            30 seconds to create. Then we build your Voice DNA.
          </p>
        </div>

        <div className="w-full">
          {mode === "signin" ? (
            <SignIn
              routing="hash"
              fallbackRedirectUrl={`${basePath}/create`}
              signUpUrl={`${basePath}/auth#signup`}
              appearance={clerkAppearance}
            />
          ) : (
            <SignUp
              routing="hash"
              fallbackRedirectUrl={`${basePath}/onboarding`}
              signInUrl={`${basePath}/auth#signin`}
              appearance={clerkAppearance}
            />
          )}
        </div>
      </div>
    </div>
  );
}
