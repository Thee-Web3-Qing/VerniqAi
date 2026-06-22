import { useState, useEffect } from "react";
import type { ReactNode, ComponentType } from "react";
import { ClerkProvider, Show, useClerk, useAuth } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Menu, X } from "lucide-react";

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
import OrgNew from "@/pages/OrgNew";
import OrgDashboard from "@/pages/OrgDashboard";
import JoinOrg from "@/pages/JoinOrg";
import Feed from "@/pages/Feed";
import VoicePublicProfile from "@/pages/VoicePublicProfile";
import PaymentCallback from "@/pages/PaymentCallback";
import { Logo } from "@/components/Logo";

import VideoTemplate from "@/components/video/VideoTemplate";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const queryClient = new QueryClient();

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigateTo = (path: string) => {
    setLocation(path);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground dark grid-texture">
      <Show when="signed-out">
        <div className="bg-primary text-primary-foreground text-center py-2 px-4 text-xs font-mono font-bold tracking-widest uppercase">
          ✦ Voice DNA is free during early access — unlimited TikTok scripts &amp; Twitter threads
        </div>
      </Show>
      
      <header className="border-b border-border sticky top-0 bg-background/80 backdrop-blur z-50">
        <div className="w-full px-6 md:px-10 lg:px-16 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button onClick={() => navigateTo("/")} data-testid="nav-logo">
              <Logo />
            </button>
            <nav className="hidden md:flex gap-6">
              <button
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => navigateTo("/feed")}
                data-testid="nav-feed"
              >
                Feed
              </button>
              <button
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => navigateTo("/creators")}
                data-testid="nav-beginners"
              >
                Marketplace
              </button>
              <button
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => navigateTo("/create")}
                data-testid="nav-creators"
              >
                Create
              </button>
            </nav>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <Show when="signed-in">
              <button
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => navigateTo("/history")}
                data-testid="nav-history"
              >
                History
              </button>
              <button
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => navigateTo("/profile")}
                data-testid="nav-profile"
              >
                Profile
              </button>
              <button
                className="text-sm font-medium text-muted-foreground hover:text-destructive transition-colors"
                onClick={() => signOut({ redirectUrl: basePath || "/" })}
                data-testid="nav-signout"
              >
                Sign out
              </button>
            </Show>
            <Show when="signed-out">
              <button
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => navigateTo("/auth")}
                data-testid="nav-signin"
              >
                Sign in
              </button>
              <button
                className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-none hover:bg-primary/90 transition-colors"
                onClick={() => navigateTo("/auth#signup")}
                data-testid="nav-get-started"
              >
                Get started
              </button>
            </Show>
          </div>
          
          <button 
            className="md:hidden text-foreground p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>
      
      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed top-[64px] left-0 right-0 bg-background border-b border-border z-40 p-4">
          <nav className="flex flex-col gap-4">
            <button
              className="text-sm font-bold text-left py-2 text-foreground"
              onClick={() => navigateTo("/feed")}
            >
              Feed
            </button>
            <button
              className="text-sm font-bold text-left py-2 text-foreground"
              onClick={() => navigateTo("/creators")}
            >
              Marketplace
            </button>
            <button
              className="text-sm font-bold text-left py-2 text-foreground"
              onClick={() => navigateTo("/create")}
            >
              Create
            </button>
            
            <Show when="signed-in">
              <button
                className="text-sm font-bold text-left py-2 text-foreground"
                onClick={() => navigateTo("/history")}
              >
                History
              </button>
              <button
                className="text-sm font-bold text-left py-2 text-foreground"
                onClick={() => navigateTo("/profile")}
              >
                Profile
              </button>
              <button
                className="text-sm font-bold text-left py-2 text-destructive"
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut({ redirectUrl: basePath || "/" });
                }}
              >
                Sign out
              </button>
            </Show>
            
            <Show when="signed-out">
              <button
                className="text-sm font-bold text-left py-2 text-foreground"
                onClick={() => navigateTo("/auth")}
              >
                Sign in
              </button>
              <button
                className="text-sm font-medium bg-primary text-primary-foreground px-4 py-3 rounded-none text-center hover:bg-primary/90 transition-colors"
                onClick={() => navigateTo("/auth#signup")}
              >
                Get started
              </button>
            </Show>
          </nav>
        </div>
      )}
      
      <main className="flex-1">{children}</main>
    </div>
  );
}

function AuthLayout({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground dark grid-texture">
      <header className="h-16 flex items-center justify-between px-6 md:px-12">
        <button onClick={() => setLocation("/")}>
          <Logo />
        </button>
        <span className="text-xs font-mono font-bold tracking-widest text-muted-foreground uppercase">
          Step 1 / 4 · Account
        </span>
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
    <Switch>
      <Route path="/auth">
        <AuthLayout>
          <AuthPage />
        </AuthLayout>
      </Route>
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={Landing} />
            <Route path="/creators" component={Creators} />
            <Route path="/creators/:id" component={CreatorProfile} />
            <Route path="/create">{() => <ProtectedRoute component={Create} />}</Route>
            <Route path="/onboarding">{() => <ProtectedRoute component={Onboarding} />}</Route>
            <Route path="/results/:id">{() => <ProtectedRoute component={Results} />}</Route>
            <Route path="/history">{() => <ProtectedRoute component={History} />}</Route>
            <Route path="/profile">{() => <ProtectedRoute component={Profile} />}</Route>
            <Route path="/org/new">{() => <ProtectedRoute component={OrgNew} />}</Route>
            <Route path="/org/join/:code">{() => <ProtectedRoute component={JoinOrg} />}</Route>
            <Route path="/org/:slug">{() => <ProtectedRoute component={OrgDashboard} />}</Route>
            <Route path="/feed" component={Feed} />
            <Route path="/voice/:username" component={VoicePublicProfile} />
            <Route path="/payment/callback">{() => <ProtectedRoute component={PaymentCallback} />}</Route>
            <Route path="/video" component={VideoTemplate} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
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
