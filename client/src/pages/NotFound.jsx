import { Link } from "react-router-dom";
import { ArrowLeft, Home, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export default function NotFound() {
  const { user } = useAuth();

  return (
    <div className="bg-grid flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <span className="bg-primary/12 text-primary mb-6 grid size-16 place-items-center rounded-2xl">
        <SearchX className="size-7" />
      </span>
      <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Page not found</h1>
      <p className="text-muted-foreground mt-3 max-w-md text-sm">
        The page you were looking for does not exist or has been moved. Everything is still where you
        left it.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild variant="outline">
          <Link to="/">
            <Home className="size-4" /> Home
          </Link>
        </Button>
        <Button asChild variant="gradient">
          <Link to={user ? "/dashboard" : "/login"}>
            <ArrowLeft className="size-4" /> {user ? "Back to dashboard" : "Sign in"}
          </Link>
        </Button>
      </div>
    </div>
  );
}
