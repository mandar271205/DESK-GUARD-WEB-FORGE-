import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { BookOpen, LayoutDashboard, Map, Bell, ScanLine, LogOut, Coffee } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function AppShell({ isStaff, onSignOut }: { isStaff: boolean, onSignOut: () => void }) {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <BookOpen className="h-6 w-6 text-indigo-600 mr-2" />
          <span className="text-xl font-bold tracking-tight">DeskGuard</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <NavLink to="/app" end className={({isActive}) => `flex items-center px-3 py-2.5 rounded-md text-sm font-medium ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
            <LayoutDashboard className="h-5 w-5 mr-3" />
            Dashboard
          </NavLink>
          <NavLink to="/app/map" className={({isActive}) => `flex items-center px-3 py-2.5 rounded-md text-sm font-medium ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
            <Map className="h-5 w-5 mr-3" />
            Live Map
          </NavLink>

          {isStaff && (
            <>
              <div className="mt-8 mb-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Librarian</div>
              <NavLink to="/app/operations" className={({isActive}) => `flex items-center px-3 py-2.5 rounded-md text-sm font-medium ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                <ScanLine className="h-5 w-5 mr-3" />
                Operations
              </NavLink>
              <NavLink to="/app/analytics" className={({isActive}) => `flex items-center px-3 py-2.5 rounded-md text-sm font-medium ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                <BookOpen className="h-5 w-5 mr-3" />
                Analytics
              </NavLink>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center w-full px-3 py-2 rounded-md hover:bg-slate-100">
            <Avatar className="h-8 w-8 mr-3">
              <AvatarFallback className="bg-indigo-100 text-indigo-700">{isStaff ? 'L' : 'S'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate text-sm font-medium text-slate-700">{isStaff ? 'Librarian' : 'Student'}</div>
            <Button variant="ghost" size="icon" onClick={onSignOut} className="h-8 w-8 text-slate-400 hover:text-slate-600">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center justify-between px-8 border-b border-slate-200 bg-white/50 backdrop-blur-sm z-10">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-slate-900">DeskGuard Portal</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" className="hidden sm:flex" onClick={() => navigate('/claim')}>
              <ScanLine className="h-4 w-4 mr-2" />
              Claim Desk
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-500 relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500" />
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
