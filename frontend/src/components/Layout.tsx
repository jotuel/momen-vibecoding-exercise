import React from "react";
import { Link } from "react-router-dom";
import { Map, Plus, LogOut } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem("auth_token");

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-xl font-bold text-primary"
          >
            <Map className="h-6 w-6" />
            <span>TripPlanner</span>
          </Link>
          <nav className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link
                  to="/"
                  className="text-sm font-medium hover:underline underline-offset-4"
                >
                  My Trips
                </Link>
                <Link
                  to="/create"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  <Plus className="h-4 w-4" />
                  New Trip
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium hover:underline underline-offset-4 flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium hover:underline underline-offset-4"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">{children}</main>

      <footer className="border-t py-6 text-center text-muted-foreground text-sm bg-muted/40">
        <div className="container mx-auto px-4">
          <p>© {new Date().getFullYear()} TripPlanner. Powered by Momen.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
