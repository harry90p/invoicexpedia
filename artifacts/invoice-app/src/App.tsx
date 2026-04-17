import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, useClerk } from "@clerk/react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import InvoicesList from "@/pages/invoices/index";
import NewInvoice from "@/pages/invoices/new";
import InvoiceDetail from "@/pages/invoices/[id]";
import EditInvoice from "@/pages/invoices/[id]/edit";
import ClientsList from "@/pages/clients/index";
import NewClient from "@/pages/clients/new";
import ClientProfile from "@/pages/clients/[id]";
import CreditNotesList from "@/pages/credit-notes/index";
import NewCreditNote from "@/pages/credit-notes/new";
import CreditNoteDetail from "@/pages/credit-notes/[id]";
import LedgersList from "@/pages/ledgers/index";
import ClientLedger from "@/pages/ledgers/[id]";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const queryClient = new QueryClient();

function SignInPage() {
  // To update login providers, app branding, or OAuth settings use the Auth
  // pane in the workspace toolbar. More information can be found in the Replit docs.
  return (
    <div
      className="flex h-screen items-center justify-center"
      style={{ background: "linear-gradient(155deg, #0d47a1 0%, #1565c0 15%, #1976d2 30%, #1e88e5 50%, #42a5f5 75%, #90caf9 90%, #e3f2fd 100%)" }}
    >
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  // To update login providers, app branding, or OAuth settings use the Auth
  // pane in the workspace toolbar. More information can be found in the Replit docs.
  return (
    <div
      className="flex h-screen items-center justify-center"
      style={{ background: "linear-gradient(155deg, #0d47a1 0%, #1565c0 15%, #1976d2 30%, #1e88e5 50%, #42a5f5 75%, #90caf9 90%, #e3f2fd 100%)" }}
    >
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/invoices" component={InvoicesList} />
            <Route path="/invoices/new" component={NewInvoice} />
            <Route path="/invoices/:id" component={InvoiceDetail} />
            <Route path="/invoices/:id/edit" component={EditInvoice} />
            <Route path="/clients" component={ClientsList} />
            <Route path="/clients/new" component={NewClient} />
            <Route path="/clients/:id" component={ClientProfile} />
            <Route path="/credit-notes" component={CreditNotesList} />
            <Route path="/credit-notes/new" component={NewCreditNote} />
            <Route path="/credit-notes/:id" component={CreditNoteDetail} />
            <Route path="/ledgers" component={LedgersList} />
            <Route path="/ledgers/:id" component={ClientLedger} />
            <Route path="/reports" component={Reports} />
            <Route path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <AppRoutes />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
