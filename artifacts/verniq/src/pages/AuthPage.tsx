import { useLocation } from "wouter";
import { SignIn, SignUp } from "@clerk/react";
import { useState } from "react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold tracking-tight mb-2">Welcome to Verniq</h1>
          <p className="text-muted-foreground font-mono text-sm">Initialize your session.</p>
        </div>
        
        <div className="bg-card border border-border p-6 rounded-lg shadow-2xl">
          {mode === "signin" ? (
            <>
              <SignIn routing="hash" fallbackRedirectUrl={`${basePath}/create`} signUpUrl={`${basePath}/auth#signup`} />
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Don't have an account? <button className="text-primary hover:underline" onClick={() => setMode("signup")}>Sign up</button>
              </div>
            </>
          ) : (
            <>
              <SignUp routing="hash" fallbackRedirectUrl={`${basePath}/onboarding`} signInUrl={`${basePath}/auth#signin`} />
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Already have an account? <button className="text-primary hover:underline" onClick={() => setMode("signin")}>Sign in</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}