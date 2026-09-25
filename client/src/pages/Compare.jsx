import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, GitCompareArrows, TrendingDown, TrendingUp, Upload } from "lucide-react";
import { analysisApi, resumeApi } from "@/lib/api";
import { PageHeader } from "@/components/common/StatCard";
import { ErrorState, EmptyState, LoadingState } from "@/components/common/Feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ComparisonBarChart } from "@/components/charts/Charts";
import { ScoreRing } from "@/components/charts/ScoreRing";
import { BorderBeam } from "@/components/magicui/border-beam";

const METRICS = ["overall", "skills", "experience", "education", "structure", "keywords"];

export default function Compare() {
  const [resumes, setResumes] = useState([]);
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const applyResumes = useCallback((data) => {
    const analysed = (data.resumes || []).filter((r) => typeof r.latestScore === "number");
    setResumes(analysed);
    if (analysed.length >= 2) {
      setLeftId(analysed[1]._id);
      setRightId(analysed[0]._id);
    }
    setLoading(false);
  }, []);

  const load = useCallback(async () => {
    try {
      applyResumes(await resumeApi.list());
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  }, [applyResumes]);

  const retry = async () => {
    setError(null);
    setLoading(true);
    await load();
  };

  // Boot fetch. The first render already starts in the loading state and state
  // is only touched once the request resolves, so nothing cascades.
  useEffect(() => {
    let active = true;
    resumeApi
      .list()
      .then((data) => {
        if (active) applyResumes(data);
      })
      .catch((err) => {
        if (!active) return;
        setError(err);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applyResumes]);

  // The comparison is derived from the selected pair instead of being reset by
  // an effect, so switching versions never leaves a stale result on screen.
  const pair = leftId && rightId && leftId !== rightId ? `${leftId}:${rightId}` : null;
  const current = result && result.pair === pair && result.attempt === attempt ? result : null;
  const comparing = Boolean(pair) && !current;
  const comparison = current?.data || null;
  const compareError = current?.error || null;

  useEffect(() => {
    if (!pair) return undefined;
    let active = true;
    analysisApi
      .compare(leftId, rightId)
      .then((data) => {
        if (active) setResult({ pair, attempt, data, error: null });
      })
      .catch((err) => {
        if (active) setResult({ pair, attempt, data: null, error: err });
      });
    return () => {
      active = false;
    };
  }, [pair, leftId, rightId, attempt]);

  const run = useCallback(() => setAttempt((n) => n + 1), []);

  if (loading) {
    return (
      <>
        <PageHeader title="Compare CV versions" description="Loading your analysed CVs…" />
        <LoadingState />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Compare CV versions"
        description="See exactly how a targeted version of your CV scores against another, metric by metric."
        actions={
          <Button asChild variant="outline">
            <Link to="/cvs/upload">
              <Upload className="size-4" /> Upload another version
            </Link>
          </Button>
        }
      />

      {resumes.length < 2 ? (
        <EmptyState
          icon={GitCompareArrows}
          title="You need two analysed CVs to compare"
          description="Upload two targeted versions — for example a Frontend CV and a Full Stack CV — and analyse both. Then come back here."
          action={
            <Button asChild variant="gradient">
              <Link to="/cvs">Manage my CVs</Link>
            </Button>
          }
        />
      ) : (
        <>
          <Card className="mb-5">
            <CardContent className="grid gap-3 p-5 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <div className="space-y-2">
                <label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Version A
                </label>
                <Select value={leftId} onValueChange={setLeftId}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.map((r) => (
                      <SelectItem key={r._id} value={r._id}>
                        {r.label} · {r.latestScore}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <span className="text-muted-foreground hidden pb-2 sm:block">
                <ArrowRight className="size-4" />
              </span>

              <div className="space-y-2">
                <label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Version B
                </label>
                <Select value={rightId} onValueChange={setRightId}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.map((r) => (
                      <SelectItem key={r._id} value={r._id}>
                        {r.label} · {r.latestScore}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {error && <ErrorState error={error} onRetry={retry} className="mb-4" />}

          {compareError && !comparing && (
            <ErrorState error={compareError} onRetry={run} className="mb-4" />
          )}

          {leftId === rightId && (
            <ErrorState error={{ message: "Pick two different CV versions to compare." }} className="mb-4" />
          )}

          {comparing && <LoadingState label="Building the comparison…" className="mb-4" />}

          {comparison && !comparing && (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-3">
                {[comparison.left, comparison.right].map((side, i) => (
                  <Card key={i} className="relative overflow-hidden">
                    <BorderBeam size={60} />
                    <CardContent className="flex flex-col items-center gap-3 p-6">
                      <Badge variant={i === 0 ? "secondary" : "purple"}>
                        {i === 0 ? "Version A" : "Version B"}
                      </Badge>
                      <ScoreRing
                        value={side.overallScore}
                        size={140}
                        label={side.resume?.label || "CV"}
                      />
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {(side.skills?.technical || []).slice(0, 6).map((s) => (
                          <Badge key={s} variant="secondary" className="text-[11px]">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Difference</CardTitle>
                    <CardDescription>B minus A</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    {METRICS.map((key) => {
                      const delta = comparison.delta[key] ?? 0;
                      const positive = delta > 0;
                      const neutral = delta === 0;
                      return (
                        <div key={key} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground capitalize">{key}</span>
                          <span
                            className={`flex items-center gap-1 font-medium tabular-nums ${
                              neutral
                                ? "text-muted-foreground"
                                : positive
                                  ? "text-emerald-500"
                                  : "text-destructive"
                            }`}
                          >
                            {!neutral &&
                              (positive ? (
                                <TrendingUp className="size-3.5" />
                              ) : (
                                <TrendingDown className="size-3.5" />
                              ))}
                            {positive ? "+" : ""}
                            {delta}
                          </span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Side by side</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metric</TableHead>
                        <TableHead>Version A</TableHead>
                        <TableHead>Version B</TableHead>
                        <TableHead className="text-right">Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {METRICS.map((key) => {
                        const a = key === "overall" ? comparison.left.overallScore : comparison.left.scoreBreakdown[key];
                        const b = key === "overall" ? comparison.right.overallScore : comparison.right.scoreBreakdown[key];
                        const delta = (b ?? 0) - (a ?? 0);
                        return (
                          <TableRow key={key}>
                            <TableCell className="font-medium capitalize">{key}</TableCell>
                            <TableCell className="tabular-nums">{a ?? 0}%</TableCell>
                            <TableCell className="tabular-nums">{b ?? 0}%</TableCell>
                            <TableCell className="text-right">
                              <span
                                className={
                                  delta > 0
                                    ? "font-medium text-emerald-500"
                                    : delta < 0
                                      ? "font-medium text-destructive"
                                      : "text-muted-foreground"
                                }
                              >
                                {delta > 0 ? "+" : ""}
                                {delta}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Visual comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <ComparisonBarChart
                    data={METRICS.filter((k) => k !== "education" && k !== "overall").map((key) => ({
                      name: key.charAt(0).toUpperCase() + key.slice(1),
                      left: key === "overall" ? comparison.left.overallScore : comparison.left.scoreBreakdown[key],
                      right: key === "overall" ? comparison.right.overallScore : comparison.right.scoreBreakdown[key],
                    }))}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </>
  );
}
