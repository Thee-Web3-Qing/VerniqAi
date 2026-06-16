import { useEffect } from "react";
import type { ReactNode, ComponentType } from "react";
import { ClerkProvider, Show, useClerk, useAuth } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAuthTokenGetter } from "@workspace/api-client-react";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import AuthPage from "@/pages/AuthPage";
import Create from "@/pages/Create";
import Onboarding from "@/pages/Onboarding";
import Results from "@/pages/Results";
import History from "@/pages/History";
import Profile from "@/pages/Profile";
import Creators from "@/pages/Creators";
import CreatorProfile from "@/pages/CreatorProfile";
import { Logo } from "@/components/Logo";

// REQUIRED — resolves the key from window.location.hostname so the same
// build serves multiple Clerk custom domains.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — empty in dev (Clerk hits dev FAPI directly), auto-set in prod.
// Do NOT add a fallback — the empty dev value is intentional.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const queryClient = new QueryClient();

// Strips base path prefix from Clerk's full paths before passing to wouter
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

// Syncs Clerk auth token into the generated API client
function AuthTokenSync() {
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);
  return null;
}

function Layout({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const { signOut } = useClerk();
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground dark grid-texture">
      <header className="border-b border-border sticky top-0 bg-background/80 backdrop-blur z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setLocation("/")}
              data-testid="nav-logo"
            >
              <Logo />
            </button>
            <nav className="hidden md:flex gap-6">
              <button
                className="text-sm font-bold font-sans text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setLocation("/create")}
                data-testid="nav-create"
              >
                For creators
              </button>
              <button
                className="text-sm font-bold font-sans text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setLocation("/history")}
                data-testid="nav-history"
              >
                History
              </button>
              <button
                className="text-sm font-bold font-sans text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setLocation("/creators")}
                data-testid="nav-creators"
              >
                Marketplace
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Show when="signed-in">
              <button
                className="text-sm font-bold font-sans hover:text-primary transition-colors"
                onClick={() => setLocation("/profile")}
                data-testid="nav-profile"
              >
                Profile
              </button>
              <button
                className="text-sm font-bold font-sans text-muted-foreground hover:text-destructive transition-colors"
                onClick={() => signOut({ redirectUrl: basePath || "/" })}
                data-testid="nav-signout"
              >
                Sign out
              </button>
            </Show>
            <Show when="signed-out">
              <button
                className="text-sm font-bold font-sans text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setLocation("/auth")}
                data-testid="nav-signin"
              >
                Sign in
              </button>
              <button
                className="text-sm font-bold font-sans bg-primary text-primary-foreground px-4 py-2 rounded-full hover:bg-primary/90 transition-colors"
                onClick={() => setLocation("/auth#signup")}
                data-testid="nav-get-started"
              >
                Get started
              </button>
            </Show>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: ComponentType }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded)
    return (
      <div className="p-8 text-center text-muted-foreground font-mono">
        Authenticating...
      </div>
    );
  if (!isSignedIn) return <Redirect to="/auth" />;

  return <Component />;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/creators" component={Creators} />
        <Route path="/creators/:id" component={CreatorProfile} />

        <Route path="/create">{() => <ProtectedRoute component={Create} />}</Route>
        <Route path="/onboarding">
          {() => <ProtectedRoute component={Onboarding} />}
        </Route>
        <Route path="/results/:id">
          {() => <ProtectedRoute component={Results} />}
        </Route>
        <Route path="/history">{() => <ProtectedRoute component={History} />}</Route>
        <Route path="/profile">{() => <ProtectedRoute component={Profile} />}</Route>

        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ClerkProvider
        publishableKey={clerkPubKey}
        proxyUrl={clerkProxyUrl}
        routerPush={(to) => window.history.pushState({}, "", to)}
        routerReplace={(to) => window.history.replaceState({}, "", to)}
      >
        <AuthTokenSync />
        <TooltipProvider>
          <WouterRouter base={basePath}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ClerkProvider>
    </QueryClientProvider>
  );
}

export default App;