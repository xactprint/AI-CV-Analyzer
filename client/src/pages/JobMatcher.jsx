import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BriefcaseBusiness,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Upload,
} from "lucide-react";
import { jobApi, matchApi, resumeApi } from "@/lib/api";
import { MATCH_STAGES, formatRelative, scoreBand } from "@/lib/constants";
import { PageHeader } from "@/components/common/StatCard";
import { ErrorState, EmptyState, LoadingState } from "@/components/common/Feedback";
import { StageProgress, InlineNotice } from "@/components/common/StageProgress";
import { MatchResult } from "@/components/common/MatchResult";
import { useProgressStages } from "@/hooks/useProgressStages";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AnimatedCard } from "@/components/magicui/animated-card";

const EMPLOYMENT = [
  { value: "full-time", label: "Full time" },
  { value: "part-time", label: "Part time" },
  { value: "internship", label: "Internship" },
  { value: "contract", label: "Contract" },
  { value: "freelance", label: "Freelance" },
];

const emptyForm = {
  title: "",
  company: "",
  location: "",
  employmentType: "full-time",
  description: "",
  sourceUrl: "",
};

export default function JobMatcher() {
  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [matches, setMatches] = useState([]);

  const [form, setForm] = useState(emptyForm);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedResumeId, setSelectedResumeId] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [savingJob, setSavingJob] = useState(false);
  const [matching, setMatching] = useState(false);
  const [activeResult, setActiveResult] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const stage = useProgressStages(MATCH_STAGES, matching);

  const applyWorkspace = useCallback((data) => {
    setResumes(data.resumes);
    setJobs(data.jobs);
    setMatches(data.matches);

    const primary = data.resumes.find((x) => x.isPrimary) || data.resumes[0];
    if (primary) setSelectedResumeId((prev) => prev || primary._id);
    const firstJob = data.jobs[0];
    if (firstJob) setSelectedJobId((prev) => prev || firstJob._id);
    setLoading(false);
  }, []);

  const fetchWorkspace = useCallback(async () => {
    const [r, j, m] = await Promise.all([
      resumeApi.list(),
      jobApi.list(),
      matchApi.list({ sort: "recent" }),
    ]);
    return { resumes: r.resumes || [], jobs: j.jobs || [], matches: m.matches || [] };
  }, []);

  const load = useCallback(async () => {
    try {
      applyWorkspace(await fetchWorkspace());
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  }, [applyWorkspace, fetchWorkspace]);

  const retry = async () => {
    setError(null);
    setLoading(true);
    await load();
  };

  // Boot fetch. The first render already starts in the loading state and state
  // is only touched once the requests resolve, so nothing cascades.
  useEffect(() => {
    let active = true;
    fetchWorkspace()
      .then((data) => {
        if (active) applyWorkspace(data);
      })
      .catch((err) => {
        if (!active) return;
        setError(err);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applyWorkspace, fetchWorkspace]);

  const saveJob = async () => {
    setFormError(null);
    if (!form.title.trim()) {
      setFormError("A job title is required.");
      return;
    }
    if (form.description.trim().length < 40) {
      setFormError("The job description must be at least 40 characters. Paste the full posting text.");
      return;
    }

    setSavingJob(true);
    try {
      const data = await jobApi.create({ ...form, source: "pasted" });
      setJobs((prev) => [data.job, ...prev]);
      setSelectedJobId(data.job._id);
      setForm(emptyForm);
    } catch (err) {
      setFormError(err);
    } finally {
      setSavingJob(false);
    }
  };

  const runMatch = async () => {
    if (!selectedJobId || !selectedResumeId) {
      setError({ message: "Choose both a job and a CV before running a match." });
      return;
    }

    setMatching(true);
    setError(null);
    setActiveResult(null);
    try {
      const data = await matchApi.create(selectedJobId, selectedResumeId);
      setActiveResult(data.match);
      setMatches((prev) => [data.match, ...prev.filter((m) => m._id !== data.match._id)]);
    } catch (err) {
      setError(err);
    } finally {
      setMatching(false);
    }
  };

  const deleteMatch = async () => {
    if (!confirmDelete) return;
    try {
      await matchApi.remove(confirmDelete._id);
      setMatches((prev) => prev.filter((m) => m._id !== confirmDelete._id));
      if (activeResult?._id === confirmDelete._id) setActiveResult(null);
      setConfirmDelete(null);
    } catch (err) {
      setError(err);
    }
  };

  const selectedJob = jobs.find((j) => j._id === selectedJobId);
  const selectedResume = resumes.find((r) => r._id === selectedResumeId);

  if (loading) {
    return (
      <>
        <PageHeader title="Job Matcher" description="Loading your jobs and CVs…" />
        <LoadingState />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Job Matcher"
        description="Paste a job description you have permission to use and see exactly how your CV measures up against it."
      />

      {error && <ErrorState error={error} className="mb-4" onRetry={retry} />}

      {resumes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Upload a CV first"
          description="The matcher compares your CV against a job description, so you need at least one analysed CV."
          action={
            <Button asChild variant="gradient">
              <Link to="/cvs/upload">
                <Upload className="size-4" /> Upload a CV
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Left: job input */}
          <div className="space-y-4 lg:col-span-2">
            <Tabs defaultValue="paste">
              <TabsList>
                <TabsTrigger value="paste">Paste a job</TabsTrigger>
                <TabsTrigger value="saved">Saved jobs ({jobs.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="paste">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Job details</CardTitle>
                    <CardDescription>
                      Copy the description from wherever you are allowed to use it. This app never
                      scrapes job boards.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {formError && <ErrorState error={formError} title="Check the job details" />}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="title">Job title *</Label>
                        <Input
                          id="title"
                          value={form.title}
                          onChange={(e) => setForm({ ...form, title: e.target.value })}
                          placeholder="Frontend Developer"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company">Company</Label>
                        <Input
                          id="company"
                          value={form.company}
                          onChange={(e) => setForm({ ...form, company: e.target.value })}
                          placeholder="Acme Inc."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={form.location}
                          onChange={(e) => setForm({ ...form, location: e.target.value })}
                          placeholder="Remote / Casablanca"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="type">Employment type</Label>
                        <Select
                          value={form.employmentType}
                          onValueChange={(v) => setForm({ ...form, employmentType: v })}
                        >
                          <SelectTrigger id="type" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EMPLOYMENT.map((e) => (
                              <SelectItem key={e.value} value={e.value}>
                                {e.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="description">Job description *</Label>
                        <span
                          className={`text-xs tabular-nums ${
                            form.description.trim().length < 40 ? "text-muted-foreground" : "text-emerald-500"
                          }`}
                        >
                          {form.description.trim().length} / 40 min
                        </span>
                      </div>
                      <Textarea
                        id="description"
                        rows={12}
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder={
                          "Paste the full job posting here — responsibilities, requirements, nice-to-haves…"
                        }
                        className="font-mono text-xs leading-relaxed"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sourceUrl">Source URL (optional)</Label>
                      <Input
                        id="sourceUrl"
                        type="url"
                        value={form.sourceUrl}
                        onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
                        placeholder="https://…"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button onClick={saveJob} disabled={savingJob} variant="outline">
                        {savingJob ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                        Save job
                      </Button>
                      <Button onClick={runMatch} disabled={matching} variant="gradient">
                        {matching ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                        Match now
                      </Button>
                    </div>

                    <InlineNotice type="info">
                      A description of at least 40 characters is required — the AI needs enough context
                      to compare skills and experience fairly.
                    </InlineNotice>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="saved">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Saved jobs</CardTitle>
                    <CardDescription>Pick a job to match it against your CV</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {jobs.length === 0 ? (
                      <EmptyState
                        icon={BriefcaseBusiness}
                        title="No saved jobs"
                        description="Paste a job description in the other tab and save it to build a history."
                        className="border-none py-10"
                      />
                    ) : (
                      <ul className="space-y-2">
                        {jobs.map((job) => (
                          <li key={job._id}>
                            <button
                              type="button"
                              onClick={() => setSelectedJobId(job._id)}
                              className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                                selectedJobId === job._id
                                  ? "border-primary bg-primary/5"
                                  : "hover:bg-accent/50"
                              }`}
                            >
                              <BriefcaseBusiness className="text-muted-foreground size-4 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{job.title}</p>
                                <p className="text-muted-foreground truncate text-xs">
                                  {job.company} · {job.location} · {formatRelative(job.createdAt)}
                                </p>
                              </div>
                              {job.bestScore !== null && job.bestScore !== undefined && (
                                <Badge variant={scoreBand(job.bestScore).variant}>
                                  {job.bestScore}%
                                </Badge>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    <Button
                      onClick={runMatch}
                      disabled={matching || !selectedJobId}
                      variant="gradient"
                      className="w-full"
                    >
                      {matching ? <Loader2 className="size-4 animate-spin" /> : <Target className="size-4" />}
                      Match the selected job
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* History */}
            {matches.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-semibold">Recent matches</h2>
                {matches.slice(0, 5).map((m) => {
                  const b = scoreBand(m.overallScore);
                  return (
                    <AnimatedCard key={m._id}>
                      <button
                        type="button"
                        onClick={() => setActiveResult(m)}
                        className="bg-card flex w-full items-center gap-3 rounded-xl border p-3.5 text-left shadow-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{m.job?.title}</p>
                          <p className="text-muted-foreground truncate text-xs">
                            {m.job?.company} · vs {m.resume?.label || m.resume?.originalName} ·{" "}
                            {formatRelative(m.createdAt)}
                          </p>
                        </div>
                        <Badge variant={b.variant}>{m.overallScore}%</Badge>
                      </button>
                    </AnimatedCard>
                  );
                })}
                <Button asChild variant="ghost" size="sm">
                  <Link to="/history">View full history →</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Right: CV picker + result */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Match against</CardTitle>
                <CardDescription>Choose which CV version to compare</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="resume">Your CV</Label>
                  <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
                    <SelectTrigger id="resume" className="w-full">
                      <SelectValue placeholder="Choose a CV" />
                    </SelectTrigger>
                    <SelectContent>
                      {resumes.map((r) => (
                        <SelectItem key={r._id} value={r._id}>
                          {r.label}
                          {r.latestScore !== null ? ` · ${r.latestScore}%` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedResume && (
                  <div className="bg-muted/40 rounded-lg border p-3 text-xs">
                    <p className="font-medium">{selectedResume.originalName}</p>
                    <p className="text-muted-foreground mt-0.5">
                      {selectedResume.status === "failed"
                        ? "Text extraction failed for this file — analysis may not work."
                        : selectedResume.latestScore !== null
                          ? `Latest CV score: ${selectedResume.latestScore}%`
                          : "Not analysed yet — the matcher uses the extracted text either way."}
                    </p>
                    <Button asChild variant="link" size="sm" className="h-auto p-0">
                      <Link to={`/cvs/${selectedResume._id}`}>Open analysis</Link>
                    </Button>
                  </div>
                )}

                {selectedJob && (
                  <div className="bg-muted/40 rounded-lg border p-3 text-xs">
                    <p className="font-medium">{selectedJob.title}</p>
                    <p className="text-muted-foreground mt-0.5">
                      {selectedJob.company} · {selectedJob.location}
                    </p>
                  </div>
                )}

                <Button
                  onClick={runMatch}
                  disabled={matching || !selectedJobId || !selectedResumeId}
                  variant="gradient"
                  className="w-full"
                >
                  {matching ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  {matching ? "Comparing…" : "Run the match"}
                </Button>
              </CardContent>
            </Card>

            {matching && (
              <StageProgress
                stages={MATCH_STAGES}
                index={stage.index}
                percent={stage.percent}
                title="Comparing your CV to the job"
              />
            )}

            {activeResult && !matching && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Latest result</p>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setConfirmDelete(activeResult)}
                    aria-label="Delete match result"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <MatchResult match={activeResult} />
              </div>
            )}
          </div>
        </div>
      )}

      {confirmDelete && (
        <Dialog open onOpenChange={(o) => !o && setConfirmDelete(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete this match result?</DialogTitle>
              <DialogDescription>
                The result for &ldquo;{confirmDelete.job?.title}&rdquo; will be removed from your
                history. Your CV and the job itself are not affected.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={deleteMatch}>
                <Trash2 className="size-4" /> Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
