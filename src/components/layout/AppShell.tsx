import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BookOpen, LayoutDashboard, Map, Bell, ScanLine, LogOut,
  Wrench, BarChart3, Activity, Menu, X, ChevronDown,
  QrCode, Settings, Shield, Home
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useGlobalState } from "../../contexts/GlobalStateContext";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const studentNav = [
  { to: "/app",       label: "Dashboard",  icon: LayoutDashboard, end: true },
  { to: "/app/map",   label: "Live Map",   icon: Map },
  { to: "/app/session", label: "My Session", icon: ScanLine },
];

const librarianNav = [
  { to: "/app",            label: "Overview",    icon: LayoutDashboard, end: true },
  { to: "/app/map",        label: "Live Map",    icon: Map },
  { to: "/app/operations", label: "Operations",  icon: Wrench },
  { to: "/app/analytics",  label: "Analytics",   icon: BarChart3 },
  { to: "/app/audit",      label: "Audit Logs",  icon: Activity },
];

function NavItem({ to, label, icon: Icon, end }: { to: string; label: string; icon: React.ElementType; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `nav-link ${isActive ? "active" : ""}`
      }
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span>{label}</span>
    </NavLink>
  );
}

function SidebarContent({ isStaff, onSignOut, onClose }: { isStaff: boolean; onSignOut: () => void; onClose?: () => void }) {
  const { state } = useGlobalState();
  const navigate = useNavigate();
  const nav = isStaff ? librarianNav : studentNav;
  const profile = state?.profile;
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : isStaff ? "LB" : "ST";
  const unread = state?.notifications?.filter(n => !n.read_at).length ?? 0;

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <BookOpen className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">DeskGuard</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Role indicator */}
      <div className="px-5 pt-4 pb-2">
        <Badge
          variant="outline"
          className={`text-xs font-medium tracking-wide ${
            isStaff
              ? "border-violet-200 bg-violet-50 text-violet-700"
              : "border-indigo-200 bg-indigo-50 text-indigo-700"
          }`}
        >
          {isStaff ? (
            <><Shield className="h-2.5 w-2.5 mr-1" />Librarian</>
          ) : (
            <><Home className="h-2.5 w-2.5 mr-1" />Student</>
          )}
        </Badge>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {nav.map((item) => (
          <div key={item.to} onClick={onClose}>
            <NavItem {...item} />
          </div>
        ))}

        {isStaff && (
          <>
            <Separator className="my-3" />
            <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              System
            </p>
            <div onClick={onClose}>
              <button
                onClick={() => navigate("/display")}
                className="nav-link w-full text-left"
              >
                <QrCode className="h-4 w-4 flex-shrink-0" />
                <span>QR Displays</span>
              </button>
            </div>
          </>
        )}
      </nav>

      {/* Demo Mode Banner */}
      {state?.config?.demoMode && (
        <div className="mx-3 mb-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-semibold text-amber-700">Demo Mode Active</span>
          </div>
          <p className="mt-0.5 text-[11px] text-amber-600">Sessions expire in {state.config.sessionSeconds / 60} min</p>
        </div>
      )}

      {/* User Section */}
      <div className="border-t border-slate-100 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className={`text-xs font-semibold ${isStaff ? "bg-violet-100 text-violet-700" : "bg-indigo-100 text-indigo-700"}`}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {profile?.full_name ?? (isStaff ? "Librarian" : "Student")}
                </p>
                <p className="text-xs text-slate-400 truncate">{profile?.email ?? ""}</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-slate-900">{profile?.full_name ?? "Account"}</p>
              <p className="text-xs text-slate-500">{profile?.email ?? ""}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-slate-600" onClick={() => navigate("/")}>
              <Home className="mr-2 h-4 w-4" /> Home
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
              onClick={onSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function AppShell({ isStaff, onSignOut }: { isStaff: boolean; onSignOut: () => void }) {
  const { state } = useGlobalState();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const unread = state?.notifications?.filter(n => !n.read_at).length ?? 0;

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-[240px] flex-shrink-0 flex-col border-r border-slate-200 bg-white">
          <SidebarContent isStaff={isStaff} onSignOut={onSignOut} />
        </aside>

        {/* Mobile Sidebar */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[240px] p-0">
            <SidebarContent isStaff={isStaff} onSignOut={onSignOut} onClose={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          {/* Top Bar */}
          <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6 z-10 flex-shrink-0">
            <div className="flex items-center gap-3">
              {/* Mobile menu toggle */}
              <button
                className="lg:hidden rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              {/* Page title area — empty on desktop (sidebar has logo) */}
              <div className="lg:hidden flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-white">
                  <BookOpen className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-bold text-slate-900">DeskGuard</span>
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              {/* Realtime status */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 rt-pulse" />
                    <span className="text-xs font-medium text-emerald-700">Live</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Real-time seat updates active</TooltipContent>
              </Tooltip>

              {/* Notification bell */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9 text-slate-500 hover:text-slate-700"
                    onClick={() => navigate("/app")}
                    aria-label={`${unread} unread notifications`}
                  >
                    <Bell className="h-4.5 w-4.5" />
                    {unread > 0 && (
                      <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{unread > 0 ? `${unread} unread` : "No notifications"}</TooltipContent>
              </Tooltip>

              {/* User avatar (desktop) */}
              <div className="hidden lg:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-100 transition-colors">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className={`text-[11px] font-bold ${isStaff ? "bg-violet-100 text-violet-700" : "bg-indigo-100 text-indigo-700"}`}>
                          {state?.profile?.full_name
                            ? state.profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
                            : isStaff ? "LB" : "ST"}
                        </AvatarFallback>
                      </Avatar>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-semibold">{state?.profile?.full_name ?? "Account"}</p>
                      <p className="text-xs text-slate-500">{state?.profile?.email ?? ""}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/")}>
                      <Home className="mr-2 h-4 w-4" /> Home
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                      onClick={onSignOut}
                    >
                      <LogOut className="mr-2 h-4 w-4" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8 page-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
