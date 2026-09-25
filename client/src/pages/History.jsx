import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownUp,
  BriefcaseBusiness,
  FileText,
  Search,
  Target,
  Trash2,
  Trophy,
} from "lucide-react";
import { matchApi } from "@/lib/api";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDate, formatRelative, scoreBand } from "@/lib/constants";
import { PageHeader, StatCard } from "@/components/common/StatCard";
import { ErrorState, EmptyState, LoadingState } from "@/components/common/Feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { MatchResult } from "@/components/common/MatchResult";

const SORTS = [
  { value: "recent", label: "Most recent" },
  { value: "scoreDesc", label: "Highest score" },
  { value: "scoreAsc", label: "Lowest score" },
  { value: "oldest", label: "Oldest first" },
];

const VERDICTS = [
  { value: "all", label: "All verdicts" },
  { value: "excellent", label: "Excellent" },
  { value: "strong", label: "Strong" },
  { value: "moderate", label: "Moderate" },
  { value: "weak", label: "Weak" },
  { value: "poor", label: "Poor" },
];

export default function History() {
  const [state, setState] = useState({
    key: null,
    matches: [],
    stats: { count: 0, averageScore: 0, bestScore: 0 },
    error: null,
  });

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [verdict, setVerdict] = useState("all");
  const [minScore, setMinScore] = useState("0");
  const [detail, setDetail] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const debouncedSearch = useDebounce(search);

  // The active filter set is the request key, so a pending query shows the
  // loading state without an effect having to set it.
  const queryKey = `${sort}|${verdict}|${debouncedSearch}|${minScore}`;
  const loading = state.key !== queryKey;
  const matches = state.matches;
  const stats = state.stats;
  const error = loading ? null : state.error;

  const load = useCallback(async () => {
    try {
      const data = await matchApi.list({
        sort,
        verdict: verdict === "all" ? undefined : verdict,
        search: debouncedSearch || undefined,
        minScore: Number(minScore) || undefined,
      });
      setState({
        key: `${sort}|${verdict}|${debouncedSearch}|${minScore}`,
        matches: data.matches || [],
        stats: data.stats || { count: 0, averageScore: 0, bestScore: 0 },
        error: null,
      });
    } catch (err) {
      setState((prev) => ({ ...prev, error: err }));
    }
  }, [sort, verdict, debouncedSearch, minScore]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async () => {
    if (!confirmDelete) return;
    try {
      await matchApi.remove(confirmDelete._id);
      setState((prev) => ({
        ...prev,
        matches: prev.matches.filter((m) => m._id !== confirmDelete._id),
      }));
      setConfirmDelete(null);
      setDetail(null);
    } catch (err) {
      setState((prev) => ({ ...prev, error: err }));
    }
  };

  const verdictCounts = useMemo(() => {
    const counts = {};
    matches.forEach((m) => {
      counts[m.verdict] = (counts[m.verdict] || 0) + 1;
    });
    return counts;
  }, [matches]);

  return (
    <>
      <PageHeader
        title="Job Match History"
        description="Every match you have run, sortable and filterable by score and verdict."
        actions={
          <Button asChild variant="gradient">
            <Link to="/matcher">
              <Target className="size-4" /> New match
            </Link>
          </Button>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total matches"
          value={<NumberTicker value={stats.count} />}
          icon={BriefcaseBusiness}
          tone="gradient"
        />
        <StatCard
          label="Average score"
          value={stats.count ? stats.averageScore : "—"}
          suffix={stats.count ? "%" : ""}
          icon={ArrowDownUp}
          tone="violet"
        />
        <StatCard
          label="Best score"
          value={stats.count ? stats.bestScore : "—"}
          suffix={stats.count ? "%" : ""}
          icon={Trophy}
          tone="emerald"
        />
      </div>

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by job title, company or CV label…"
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={verdict} onValueChange={setVerdict}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VERDICTS.map((v) => (
                  <SelectItem key={v.value} value={v.value}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={minScore} onValueChange={setMinScore}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 40, 55, 70, 85].map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s === 0 ? "Any score" : `${s}% and up`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <LoadingState label="Loading your match history…" />
      ) : error ? (
        <ErrorState error={error} onRetry={load} />
      ) : matches.length === 0 ? (
        <EmptyState
          icon={Target}
          title={search || minScore !== "0" || verdict !== "all" ? "No matches match these filters" : "No matches yet"}
          description={
            search || minScore !== "0" || verdict !== "all"
              ? "Try clearing the search box or lowering the minimum score."
              : "Run your first job match and the result will be saved here."
          }
          action={
            <Button asChild variant="gradient">
              <Link to="/matcher">
                <Target className="size-4" /> Open job matcher
              </Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead className="hidden md:table-cell">CV version</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead className="hidden sm:table-cell">Verdict</TableHead>
                  <TableHead className="hidden lg:table-cell">Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.map((m) => {
                  const band = scoreBand(m.overallScore);
                  return (
                    <TableRow key={m._id}>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => setDetail(m)}
                          className="text-left"
                        >
                          <span className="block font-medium hover:underline">
                            {m.job?.title || "Untitled job"}
                          </span>
                          <span className="text-muted-foreground block text-xs">
                            {m.job?.company}
                            {m.job?.location ? ` · ${m.job.location}` : ""}
                          </span>
                        </button>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                          <FileText className="size-3.5" />
                          {m.resume?.label || m.resume?.originalName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={band.variant}>{m.overallScore}%</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm capitalize">{m.verdict}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden lg:table-cell text-sm">
                        {formatRelative(m.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetail(m)}
                        >
                          Details
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setConfirmDelete(m)}
                          aria-label="Delete match"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {matches.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(verdictCounts).map(([v, count]) => (
            <Badge key={v} variant="secondary" className="capitalize">
              {v}: {count}
            </Badge>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Match details</DialogTitle>
            <DialogDescription>
              {detail?.job?.title} at {detail?.job?.company} · {formatDate(detail?.createdAt)}
            </DialogDescription>
          </DialogHeader>
          {detail && <MatchResult match={detail} onDelete={setConfirmDelete} />}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={Boolean(confirmDelete)} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this match result?</DialogTitle>
            <DialogDescription>
              The match for &ldquo;{confirmDelete?.job?.title}&rdquo; will be removed from your
              history. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove}>
              <Trash2 className="size-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
