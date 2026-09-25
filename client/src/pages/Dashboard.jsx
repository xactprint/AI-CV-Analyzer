import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  FileText,
  Gauge,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Upload,
  BriefcaseBusiness,
  Clock,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { analysisApi, matchApi, resumeApi } from "@/lib/api";
import { formatRelative, scoreBand } from "@/lib/constants";
import { StatCard, PageHeader } from "@/components/common/StatCard";
import { ErrorState, EmptyState } from "@/components/common/Feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreRing } from "@/components/charts/ScoreRing";
import { CategoryBarChart } from "@/components/charts/Charts";
import { BorderBeam } from "@/components/magicui/border-beam";
import { NumberTicker } from "@/components/magicui/number-ticker";

function RecentAnalyses({ analyses, loading }) {
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (!analyses.length) {
    return (
      <EmptyState
        icon={FileText}
        title="No analyses yet"
        description="Upload your first CV and run an analysis to see it here."
        action={
          <Button asChild size="sm">
            <Link to="/cvs/upload">
              <Upload className="size-4" /> Upload a CV
            </Link>
          </Button>
        }
        className="border-none py-10"
      />
    );
  }

  return (
    <ul className="divide-border divide-y">
      {analyses.map((a) => {
        const band = scoreBand(a.overallScore);
        return (
          <li key={a._id}>
            <Link
              to={`/cvs/${a.resume?._id}`}
              className="hover:bg-accent/50 flex items-center gap-4 rounded-lg px-2 py-3 transition-colors"
            >
              <span className="bg-muted text-muted-foreground grid size-9 shrink-0 place-items-center rounded-lg">
                <FileText className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {a.resume?.label || a.resume?.originalName || "Untitled CV"}
                </p>
                <p className="text-muted-foreground text-xs">
                  Analysed {formatRelative(a.createdAt)}
                  {a.resume?.extension ? ` · ${a.resume.extension.toUpperCase()}` : ""}
                </p>
              </div>
              <Badge variant={band.variant}>{a.overallScore}%</Badge>
              <ArrowRight className="text-muted-foreground size-4 shrink-0" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SkillSnapshot({ analysis }) {
  const data = (analysis?.skills?.categories || []).map((c) => ({
    name: c.name.length > 14 ? `${c.name.slice(0, 13)}…` : c.name,
    level: c.level,
  }));

  if (!data.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Latest skill distribution</CardTitle>
        <CardDescription>Proficiency estimated by the AI from your CV</CardDescription>
      </CardHeader>
      <CardContent>
        <CategoryBarChart data={data} />
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const applyDashboard = useCallback((data) => {
    setResumes(data.resumes || []);
    setAnalyses(data.analyses || []);
    setMatches(data.matches || []);
    setLoading(false);
  }, []);

  const load = useCallback(async () => {
    try {
      applyDashboard({
        resumes: (await resumeApi.list()).resumes,
        analyses: (await analysisApi.list(6)).analyses,
        matches: (await matchApi.list({ sort: "scoreDesc" })).matches,
      });
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  }, [applyDashboard]);

  const retry = async () => {
    setError(null);
    setLoading(true);
    await load();
  };

  // Boot fetch. The first render already starts in the loading state and state
  // is only touched once the requests resolve, so nothing cascades.
  useEffect(() => {
    let active = true;
    Promise.all([resumeApi.list(), analysisApi.list(6), matchApi.list({ sort: "scoreDesc" })])
      .then(([r, a, m]) => {
        if (active) applyDashboard({ resumes: r.resumes, analyses: a.analyses, matches: m.matches });
      })
      .catch((err) => {
        if (!active) return;
        setError(err);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applyDashboard]);

  const latest = analyses[0] || null;
  const band = scoreBand(latest?.overallScore ?? 0);

  const stats = useMemo(() => {
    const analysed = analyses.length;
    const bestMatch = matches.length ? Math.max(...matches.map((m) => m.overallScore)) : null;
    const scored = resumes.filter((r) => typeof r.latestScore === "number");
    const avgCv = scored.length
      ? Math.round(scored.reduce((s, r) => s + r.latestScore, 0) / scored.length)
      : 0;
    return { analysed, bestMatch, avgCv, totalCvs: resumes.length, totalJobs: matches.length };
  }, [analyses, matches, resumes]);

  if (loading) {
    return (
      <>
        <PageHeader title="Dashboard" description="Loading your workspace…" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(" ")[0] || "there"}`}
        description="Your CV scores, analyses and job matches at a glance."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/matcher">
                <Target className="size-4" /> Job matcher
              </Link>
            </Button>
            <Button asChild variant="gradient">
              <Link to="/cvs/upload">
                <Upload className="size-4" /> Upload CV
              </Link>
            </Button>
          </>
        }
      />

      {error && <ErrorState error={error} onRetry={retry} className="mb-6" />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Latest CV score"
          value={latest ? latest.overallScore : "—"}
          suffix={latest ? "%" : ""}
          icon={Gauge}
          tone="gradient"
          hint={latest ? band.label : "Analyse a CV to see this"}
        />
        <StatCard
          label="CVs analysed"
          value={<NumberTicker value={stats.analysed} />}
          icon={Sparkles}
          tone="violet"
          hint={`${stats.totalCvs} uploaded in total`}
        />
        <StatCard
          label="Best job match"
          value={stats.bestMatch ?? "—"}
          suffix={stats.bestMatch !== null ? "%" : ""}
          icon={Trophy}
          tone="emerald"
          hint={stats.bestMatch !== null ? `Across ${stats.totalJobs} matches` : "Run your first match"}
        />
        <StatCard
          label="Average CV score"
          value={stats.avgCv || "—"}
          suffix={stats.avgCv ? "%" : ""}
          icon={TrendingUp}
          tone="amber"
          hint="Across every analysed version"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="relative overflow-hidden">
            <BorderBeam size={80} />
            <CardHeader>
              <CardTitle>Recent analyses</CardTitle>
              <CardDescription>Your most recently scored CVs</CardDescription>
            </CardHeader>
            <CardContent>
              <RecentAnalyses analyses={analyses} loading={loading} />
            </CardContent>
          </Card>

          {latest && <SkillSnapshot analysis={latest} />}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Latest CV score</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {latest ? (
                <>
                  <ScoreRing
                    value={latest.overallScore}
                    label={band.label}
                    tone={
                      band.variant === "success"
                        ? "success"
                        : band.variant === "warning"
                          ? "warning"
                          : band.variant === "destructive"
                            ? "danger"
                            : "primary"
                    }
                  />
                  <div className="mt-5 w-full space-y-3">
                    {Object.entries(latest.scoreBreakdown || {}).map(([key, value]) => (
                      <div key={key}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="text-muted-foreground capitalize">{key}</span>
                          <span className="font-medium tabular-nums">{value}%</span>
                        </div>
                        <Progress value={value} />
                      </div>
                    ))}
                  </div>
                  <Button asChild variant="outline" className="mt-5 w-full">
                    <Link to={`/cvs/${latest.resume?._id}`}>View full analysis</Link>
                  </Button>
                </>
              ) : (
                <EmptyState
                  icon={FileText}
                  title="No CV analysed yet"
                  description="Upload a CV to unlock your score, skill radar and recommendations."
                  className="border-none py-8"
                  action={
                    <Button asChild size="sm" variant="gradient">
                      <Link to="/cvs/upload">Upload a CV</Link>
                    </Button>
                  }
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top matches</CardTitle>
              <CardDescription>Your highest scoring job matches</CardDescription>
            </CardHeader>
            <CardContent>
              {matches.length ? (
                <ul className="space-y-2">
                  {matches.slice(0, 4).map((m) => {
                    const b = scoreBand(m.overallScore);
                    return (
                      <li
                        key={m._id}
                        className="bg-muted/40 flex items-center gap-3 rounded-lg border p-2.5"
                      >
                        <BriefcaseBusiness className="text-muted-foreground size-4 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{m.job?.title}</p>
                          <p className="text-muted-foreground truncate text-xs">
                            {m.job?.company} · {m.resume?.label || m.resume?.originalName}
                          </p>
                        </div>
                        <Badge variant={b.variant}>{m.overallScore}%</Badge>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState
                  icon={Target}
                  title="No matches yet"
                  description="Paste a job description to see how you score against it."
                  className="border-none py-8"
                  action={
                    <Button asChild size="sm">
                      <Link to="/matcher">Open job matcher</Link>
                    </Button>
                  }
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { to: "/cvs/upload", label: "Upload a new CV version", icon: Upload },
                { to: "/matcher", label: "Match a CV against a job", icon: Target },
                { to: "/compare", label: "Compare two CV versions", icon: TrendingUp },
                { to: "/history", label: "Browse match history", icon: Clock },
              ].map(({ to, label, icon: Icon }) => (
                <Button
                  key={to}
                  asChild
                  variant="ghost"
                  className="w-full justify-start gap-3"
                >
                  <Link to={to}>
                    <Icon className="size-4" />
                    {label}
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
