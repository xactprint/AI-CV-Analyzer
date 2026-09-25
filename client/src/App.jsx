import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { LoadingState } from "@/components/common/Feedback";

const Landing = lazy(() => import("@/pages/Landing"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const MyCvs = lazy(() => import("@/pages/MyCvs"));
const UploadCv = lazy(() => import("@/pages/UploadCv"));
const Analysis = lazy(() => import("@/pages/Analysis"));
const JobMatcher = lazy(() => import("@/pages/JobMatcher"));
const History = lazy(() => import("@/pages/History"));
const Compare = lazy(() => import("@/pages/Compare"));
const Settings = lazy(() => import("@/pages/Settings"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function PageFallback() {
  return (
    <div className="mx-auto max-w-3xl pt-10">
      <LoadingState label="Loading page…" />
    </div>
  );
}

/** Blocks the app shell for anonymous visitors. */
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageFallback />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <AppLayout>{children}</AppLayout>;
}

/** Keeps signed-in users out of the login / register pages. */
function RequireGuest({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageFallback />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/login"
          element={
            <RequireGuest>
              <Login />
            </RequireGuest>
          }
        />
        <Route
          path="/register"
          element={
            <RequireGuest>
              <Register />
            </RequireGuest>
          }
        />

        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/cvs"
          element={
            <RequireAuth>
              <MyCvs />
            </RequireAuth>
          }
        />
        <Route
          path="/cvs/upload"
          element={
            <RequireAuth>
              <UploadCv />
            </RequireAuth>
          }
        />
        <Route
          path="/cvs/:id"
          element={
            <RequireAuth>
              <Analysis />
            </RequireAuth>
          }
        />
        <Route
          path="/matcher"
          element={
            <RequireAuth>
              <JobMatcher />
            </RequireAuth>
          }
        />
        <Route
          path="/history"
          element={
            <RequireAuth>
              <History />
            </RequireAuth>
          }
        />
        <Route
          path="/compare"
          element={
            <RequireAuth>
              <Compare />
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <Settings />
            </RequireAuth>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
