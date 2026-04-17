import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, FileText, Settings, BarChart3, Plus, Search, LogOut, ChevronDown, Users, Lock, Mail, CreditCard, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser, useAuth, useClerk } from "@clerk/react";

function FloatingInvoiceIcon({ style }: { style: React.CSSProperties }) {
  return (
    <div className="absolute pointer-events-none select-none opacity-20" style={style}>
      <svg width="44" height="52" viewBox="0 0 44 52" fill="none">
        <rect x="2" y="2" width="34" height="44" rx="4" fill="white" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
        <rect x="8" y="12" width="20" height="2.5" rx="1.25" fill="#90caf9"/>
        <rect x="8" y="18" width="16" height="2.5" rx="1.25" fill="#90caf9"/>
        <rect x="8" y="24" width="18" height="2.5" rx="1.25" fill="#90caf9"/>
        <rect x="8" y="30" width="12" height="2.5" rx="1.25" fill="#90caf9"/>
      </svg>
    </div>
  );
}

function LoginPage() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const isLogin = tab === "login";
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const goSignIn = () => { window.location.href = `${basePath}/sign-in`; };
  const goSignUp = () => { window.location.href = `${basePath}/sign-up`; };

  return (
    <div
      className="flex h-screen items-center justify-center relative overflow-hidden"
      style={{ background: "linear-gradient(155deg, #0d47a1 0%, #1565c0 15%, #1976d2 30%, #1e88e5 50%, #42a5f5 75%, #90caf9 90%, #e3f2fd 100%)" }}
    >
      {/* Background waves */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1440 900">
        <path d="M-100,400 C200,250 400,550 700,380 C1000,210 1200,480 1540,320" stroke="rgba(255,255,255,0.12)" strokeWidth="80" fill="none"/>
        <path d="M-100,580 C250,420 500,680 800,520 C1100,360 1300,600 1540,460" stroke="rgba(255,255,255,0.09)" strokeWidth="60" fill="none"/>
        <path d="M-100,750 C300,600 550,820 850,680 C1150,540 1350,740 1540,620" stroke="rgba(255,255,255,0.07)" strokeWidth="50" fill="none"/>
        <path d="M-100,200 C200,80 500,300 800,160 C1100,20 1300,220 1540,100" stroke="rgba(255,255,255,0.06)" strokeWidth="40" fill="none"/>
      </svg>

      {/* Floating invoice icons */}
      <FloatingInvoiceIcon style={{ top: "8%", left: "5%", transform: "rotate(-15deg)", opacity: 0.25 }} />
      <FloatingInvoiceIcon style={{ top: "15%", left: "22%", transform: "rotate(10deg) scale(0.7)", opacity: 0.18 }} />
      <FloatingInvoiceIcon style={{ top: "6%", right: "8%", transform: "rotate(20deg) scale(0.8)", opacity: 0.2 }} />
      <FloatingInvoiceIcon style={{ top: "35%", right: "5%", transform: "rotate(-8deg) scale(0.65)", opacity: 0.15 }} />
      <FloatingInvoiceIcon style={{ bottom: "15%", left: "6%", transform: "rotate(12deg) scale(0.75)", opacity: 0.18 }} />
      <FloatingInvoiceIcon style={{ bottom: "8%", right: "12%", transform: "rotate(-20deg) scale(0.6)", opacity: 0.15 }} />
      <FloatingInvoiceIcon style={{ top: "55%", left: "14%", transform: "rotate(5deg) scale(0.55)", opacity: 0.12 }} />

      {/* Two-column layout: logo left, card right */}
      <div className="relative z-10 flex items-center gap-16 w-full max-w-5xl mx-8">

        {/* Left: Logo / Branding */}
        <div className="flex-1 flex flex-col items-center">
          <div className="w-32 h-32 rounded-full overflow-hidden mb-4" style={{ boxShadow: "0 4px 32px rgba(0,0,0,0.35)" }}>
            <img src="/invoicexpedia-icon.png" alt="InvoiceXPedia" className="w-full h-full object-cover" style={{ mixBlendMode: "screen" }} />
          </div>
          <div className="text-center">
            <span className="text-white font-bold text-5xl tracking-tight">Invoice</span>
            <span className="font-bold text-5xl tracking-tight" style={{ color: "#00c8ff" }}>X</span>
            <span className="text-white font-bold text-5xl tracking-tight">Pedia</span>
          </div>
          <p className="text-xs tracking-widest mt-2" style={{ color: "rgba(144,202,249,0.9)" }}>
            INVOICES. <span style={{ color: "#4fc3f7" }}>SIMPLIFIED.</span> SUCCESS <span style={{ color: "#4fc3f7" }}>AMPLIFIED.</span>
          </p>
        </div>

        {/* Right: White card */}
        <div className="flex-1">
        <div className="w-full bg-white rounded-3xl shadow-2xl px-8 py-8" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>

          {/* Tabs */}
          <div className="flex mb-6">
            <button
              onClick={() => setTab("login")}
              className="flex-1 pb-3 text-sm font-semibold transition-colors"
              style={{
                color: isLogin ? "#1a1a2e" : "#94a3b8",
                borderBottom: isLogin ? "2px solid #10b981" : "2px solid transparent",
              }}
            >
              Login
            </button>
            <button
              onClick={() => setTab("signup")}
              className="flex-1 pb-3 text-sm font-semibold transition-colors"
              style={{
                color: !isLogin ? "#1a1a2e" : "#94a3b8",
                borderBottom: !isLogin ? "2px solid #10b981" : "2px solid transparent",
              }}
            >
              Sign Up
            </button>
          </div>

          {/* Email field */}
          <div className="relative mb-3">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="email"
              placeholder="Email"
              className="w-full pl-11 pr-4 py-3 rounded-xl text-sm bg-slate-50 border border-slate-200 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
              style={{ "--tw-ring-color": "#1e88e5" } as React.CSSProperties}
            />
          </div>

          {/* Password field */}
          <div className="relative mb-1">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="password"
              placeholder="Password"
              className="w-full pl-11 pr-4 py-3 rounded-xl text-sm bg-slate-50 border border-slate-200 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
              style={{ "--tw-ring-color": "#1e88e5" } as React.CSSProperties}
            />
          </div>

          {/* Forgot password */}
          {isLogin && (
            <div className="flex justify-end mb-5">
              <button onClick={goSignIn} className="text-xs font-medium hover:underline" style={{ color: "#1e88e5" }}>
                Forgot password?
              </button>
            </div>
          )}
          {!isLogin && <div className="mb-5" />}

          {/* Primary action button */}
          <button
            onClick={isLogin ? goSignIn : goSignUp}
            className="w-full py-3.5 rounded-full text-white font-bold text-sm tracking-wide transition-all hover:opacity-90 active:scale-95 mb-5"
            style={{ background: "linear-gradient(90deg, #10b981 0%, #1e88e5 100%)", boxShadow: "0 4px 20px rgba(30,136,229,0.4)" }}
          >
            {isLogin ? "Log In" : "Sign Up"}
          </button>

          {/* Or continue with */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-slate-400 text-xs">Or continue with</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Social buttons */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={goSignIn}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-all"
              style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.08)" }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-9 20-20 0-1.3-.2-2.7-.4-4z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.8-1.8 13.4-4.7l-6.2-5.2C29.4 35.6 26.8 36 24 36c-5.2 0-9.6-2.9-11.3-7l-6.5 5C9.8 40.1 16.4 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.9 6l6.2 5.2C40.5 35.9 44 30.4 44 24c0-1.3-.2-2.7-.4-4z"/>
              </svg>
              Google
            </button>
            <button
              onClick={goSignIn}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-all"
              style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.08)" }}
            >
              <svg width="18" height="18" viewBox="0 0 814 1000" fill="#000">
                <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105.4-57.8-155.5-127.4C46 790.7 0 663.5 0 541.8c0-207.1 137.5-316.1 272.5-316.1 35.6 0 103.7 16.5 143.9 66.3l134.8 138.2 45.7-45.7c-13.7-12.7-59.1-55.3-59.1-112.2 0-84.9 94.5-114.1 127.2-123.2 0 0 33.7 0 54.5 15.1 0 0-67.9 50.3-67.9 134.2 0 76.3 51.8 108.4 84.3 108.4z"/>
              </svg>
              Apple
            </button>
          </div>

          {/* Footer link */}
          <p className="text-center text-sm text-slate-500">
            {isLogin ? (
              <>Don't have an account?{" "}<button onClick={goSignUp} className="font-semibold hover:underline" style={{ color: "#1e88e5" }}>Sign Up</button></>
            ) : (
              <>Already have an account?{" "}<button onClick={goSignIn} className="font-semibold hover:underline" style={{ color: "#1e88e5" }}>Log In</button></>
            )}
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}

interface LayoutProps {
  children: React.ReactNode;
}

function getPageTitle(location: string): string {
  if (location === "/") return "Dashboard";
  if (location === "/invoices") return "Invoices";
  if (location === "/invoices/new") return "New Invoice";
  if (location.match(/^\/invoices\/[^/]+\/edit$/)) return "Edit Invoice";
  if (location.match(/^\/invoices\/[^/]+$/)) return "Invoice Details";
  if (location === "/clients") return "Clients";
  if (location === "/clients/new") return "New Client";
  if (location.match(/^\/clients\/[^/]+$/)) return "Client Profile";
  if (location === "/credit-notes") return "Credit Notes";
  if (location === "/credit-notes/new") return "New Credit Note";
  if (location.match(/^\/credit-notes\/[^/]+$/)) return "Credit Note Details";
  if (location === "/ledgers") return "Ledgers";
  if (location.match(/^\/ledgers\/[^/]+$/)) return "Client Ledger";
  if (location === "/reports") return "Reports";
  if (location === "/settings") return "Settings";
  return "InvoiceXPedia";
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user, isLoaded } = useUser();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const [profileOpen, setProfileOpen] = useState(false);
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      document.title = "InvoiceXPedia";
      return;
    }
    const pageTitle = getPageTitle(location);
    document.title = `${pageTitle} | InvoiceXPedia`;
  }, [location, isSignedIn, isLoaded]);

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Invoices", href: "/invoices", icon: FileText },
    { name: "Clients", href: "/clients", icon: Users },
    { name: "Credit Notes", href: "/credit-notes", icon: CreditCard },
    { name: "Ledgers", href: "/ledgers", icon: BookOpen },
    { name: "Reports", href: "/reports", icon: BarChart3 },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 50%, #0a1628 100%)" }}>
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <LoginPage />;
  }

  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .map((n) => n![0])
    .join("")
    .toUpperCase() || "U";

  return (
    <div className="flex h-screen overflow-hidden font-sans" style={{ background: "#f1f5f9" }}>
      {/* Sidebar — dark navy to complement InvoiceXPedia logo */}
      <aside
        className="w-64 flex flex-col"
        style={{
          background: "linear-gradient(180deg, #0a1628 0%, #0d1f3c 100%)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Logo area */}
        <div
          className="h-16 flex items-center px-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <Link href="/" className="flex items-center gap-2 hover:opacity-85 transition-opacity">
            <img
              src="/invoicexpedia-icon.png"
              alt="icon"
              className="h-8 w-8 object-contain"
              style={{ mixBlendMode: "screen" }}
            />
            <img
              src="/invoicexpedia-wordmark.png"
              alt="InvoiceXPedia"
              className="h-5 object-contain"
              style={{ mixBlendMode: "screen" }}
            />
          </Link>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="mb-6">
            <Link href="/invoices/new" className="w-full">
              <Button
                className="w-full flex justify-start gap-2 text-white text-sm font-medium"
                size="sm"
                style={{
                  background: "linear-gradient(135deg, #0ea5e9, #06b6d4)",
                  border: "none",
                  boxShadow: "0 2px 12px rgba(14,165,233,0.3)",
                }}
              >
                <Plus className="h-4 w-4" />
                New Invoice
              </Button>
            </Link>
          </div>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/");
              return (
                <Link key={item.name} href={item.href} className="block">
                  <div
                    className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all ${
                      isActive
                        ? "text-white font-medium"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    style={isActive ? {
                      background: "rgba(14,165,233,0.18)",
                      borderLeft: "2px solid #0ea5e9",
                    } : {
                      borderLeft: "2px solid transparent",
                    }}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div
          className="p-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <button
            onClick={() => signOut({ redirectUrl: `${basePath}/sign-in` })}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg cursor-pointer transition-all"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="h-16 flex items-center justify-between px-8"
          style={{
            background: "#ffffff",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search invoices..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all"
            />
          </div>

          <div className="flex items-center gap-4 relative">
            <button
              onClick={() => setProfileOpen((o) => !o)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none"
            >
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt="Profile" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center font-semibold text-white text-sm"
                  style={{ background: "linear-gradient(135deg, #0ea5e9, #06b6d4)" }}
                >
                  {initials}
                </div>
              )}
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-10 z-20 bg-white border border-slate-200 rounded-xl shadow-xl w-48 py-1 overflow-hidden">
                  {(user?.firstName || user?.lastName) && (
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-sm font-medium truncate text-slate-800">
                        {[user?.firstName, user?.lastName].filter(Boolean).join(" ")}
                      </p>
                      {user?.primaryEmailAddress?.emailAddress && (
                        <p className="text-xs text-slate-400 truncate">{user.primaryEmailAddress.emailAddress}</p>
                      )}
                    </div>
                  )}
                  <Link href="/settings" onClick={() => setProfileOpen(false)}>
                    <div className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50 cursor-pointer text-slate-700">
                      <Settings className="h-4 w-4" />
                      Settings
                    </div>
                  </Link>
                  <button
                    onClick={() => { setProfileOpen(false); signOut({ redirectUrl: `${basePath}/sign-in` }); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-red-50 text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
