import { useLocation } from "wouter";
import { SignIn, SignUp } from "@clerk/react";
import { useState, useEffect } from "react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const clerkAppearance = {
  variables: {
    colorPrimary: "hsl(270 65% 60%)",
    colorBackground: "hsl(0 0% 8%)",
    colorNeutral: "hsl(0 0% 20%)",
    borderRadius: "0.5rem",
    fontFamily: "Inter, sans-serif",
  },
};

export default function AuthPage() {
  const [location] = useLocation();
  const [mode, setMode] = useState<"signin" | "signup">("signup");

  useEffect(() => {
    if (window.location.hash === "#signin") {
      setMode("signin");
    } else {
      setMode("signup");
    }
  }, [location]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-6">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <div className="text-xs font-mono font-bold tracking-widest text-muted-foreground mb-4 uppercase">
            {mode === "signin" ? "Sign in" : "Create account"}
          </div>
          <h1 className="text-4xl font-sans font-black tracking-tight mb-3">
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
