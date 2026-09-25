import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Award,
  Briefcase,
  Check,
  Copy,
  Download,
  FileText,
  FolderGit2,
  GraduationCap,
  Languages as LanguagesIcon,
  Lightbulb,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Wand2,
  Link2,
  User,
} from "lucide-react";
import { analysisApi, matchApi, resumeApi } from "@/lib/api";
import { ANALYSIS_STAGES, formatDate, scoreBand } from "@/lib/constants";
import { PageHeader } from "@/components/common/StatCard";
import { ErrorState, EmptyState, LoadingState } from "@/components/common/Feedback";
import { StageProgress, InlineNotice } from "@/components/common/StageProgress";
import { useProgressStages } from "@/hooks/useProgressStages";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScoreRing } from "@/components/charts/ScoreRing";
import { ScoreBarChart, SkillRadar } from "@/components/charts/Charts";
import { BorderBeam } from "@/components/magicui/border-beam";

const IMPACT_VARIANT = { high: "destructive", medium: "warning", low: "secondary" };

function Section({ icon: Icon, title, count, children, action }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="bg-primary/12 text-primary grid size-9 shrink-0 place-items-center rounded-lg">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">{title}</CardTitle>
          {typeof count === "number" && (
            <CardDescription>
              {count} {count === 1 ? "entry" : "entries"} extracted
            </CardDescription>
          )}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SkillCloud({ skills = [] }) {
  if (!skills.length) {
    return <p className="text-muted-foreground text-sm">No skills detected in this CV.</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {skills.map((skill) => (
        <Badge key={skill} variant="secondary" className="px-2.5 py-1 text-xs">
          {skill}
        </Badge>
      ))}
    </div>
  );
}

function ExperienceTimeline({ items = [] }) {
  if (!items.length) {
    return (
      <p className="text-muted-foreground text-sm">
        No structured experience entries were detected. Running the analysis again with a configured
        XAI_API_KEY will extract them.
      </p>
    );
  }
  return (
    <ol className="relative space-y-6 border-l pl-6">
      {items.map((exp, i) => (
        <li key={i} className="relative">
          <span className="bg-primary absolute -left-[1.6rem] top-1 size-3 rounded-full ring-4 ring-background" />
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{exp.title || "Role"}</p>
            {exp.current && <Badge variant="success">Current</Badge>}
          </div>
          <p className="text-muted-foreground text-sm">
            {exp.company}
            {exp.location ? ` · ${exp.location}` : ""}
          </p>
          <p className="text-muted-foreground text-xs">
            {[exp.startDate, exp.current ? "Present" : exp.endDate].filter(Boolean).join(" — ")}
            {exp.duration ? ` · ${exp.duration}` : ""}
          </p>
          {exp.description && (
            <p className="mt-2 text-sm leading-relaxed">{exp.description}</p>
          )}
          {exp.highlights?.length > 0 && (
            <ul className="mt-2 space-y-1">
              {exp.highlights.map((h, j) => (
                <li key={j} className="text-muted-foreground flex gap-2 text-sm">
                  <Check className="text-emerald-500 mt-0.5 size-3.5 shrink-0" />
                  {h}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}

function ImprovePanel({ resumeId, improvement, disclaimer, onResult }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await analysisApi.improve(resumeId);
      onResult(data.improvement, data.disclaimer);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  if (!improvement) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Get AI rewrite suggestions for your weakest lines. The model turns a generic sentence like
          &ldquo;Developer with experience in web development&rdquo; into something specific and
          measurable.
        </p>
        <Button onClick={run} disabled={busy} variant="gradient">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
          {busy ? "Generating suggestions…" : "Improve my CV"}
        </Button>
        {error && <ErrorState error={error} />}
      </div>
    );
  }

  const copy = async () => {
    await navigator.clipboard.writeText(improvement.rewritten || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-4">
      {disclaimer && (
        <InlineNotice type="info">
          AI suggestions are recommendations for you to review — they are never applied to your CV
          automatically.
        </InlineNotice>
      )}

      {improvement.summary && (
        <div>
          <p className="text-sm font-medium">Critique</p>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{improvement.summary}</p>
        </div>
      )}

      {improvement.original && (
        <div className="bg-muted/50 rounded-lg border p-3">
          <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
            Before
          </p>
          <p className="text-sm">{improvement.original}</p>
        </div>
      )}

      {improvement.rewritten && (
        <div className="border-primary/40 bg-primary/5 rounded-lg border p-3">
          <p className="text-primary mb-1 text-xs font-medium tracking-wide uppercase">Suggested rewrite</p>
          <p className="text-sm leading-relaxed">{improvement.rewritten}</p>
          <Button variant="ghost" size="sm" className="mt-2 -ml-2" onClick={copy}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      )}

      {improvement.tips?.length > 0 && (
        <div>
          <p className="mb-1.5 text-sm font-medium">Tips</p>
          <ul className="space-y-1.5">
            {improvement.tips.map((tip, i) => (
              <li key={i} className="text-muted-foreground flex gap-2 text-sm">
                <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button variant="outline" size="sm" onClick={run} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        Regenerate
      </Button>
    </div>
  );
}

export default function Analysis() {
  const { id } = useParams();

  const [resume, setResume] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [improvement, setImprovement] = useState(null);
  const [disclaimer, setDisclaimer] = useState("");

  const stage = useProgressStages(ANALYSIS_STAGES, analyzing);

  const applyResult = useCallback((data, history) => {
    setResume(data.resume);
    setAnalysis(data.analysis || null);
    setImprovement(data.analysis?.improvement || null);
    setMatches(history);
    setLoading(false);
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await resumeApi.get(id);
      const history = await matchApi.list({ sort: "recent" });
      applyResult(
        data,
        (history.matches || []).filter((m) => m.resume?._id === id)
      );
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  }, [id, applyResult]);

  const retry = async () => {
    setError(null);
    setLoading(true);
    await load();
  };

  // Boot fetch. The first render already starts in the loading state and state
  // is only touched once the requests resolve, so nothing cascades.
  useEffect(() => {
    let active = true;
    Promise.all([resumeApi.get(id), matchApi.list({ sort: "recent" })])
      .then(([data, history]) => {
        if (active) {
          applyResult(
            data,
            (history.matches || []).filter((m) => m.resume?._id === id)
          );
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, applyResult]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const data = await analysisApi.create(id);
      setAnalysis(data.analysis);
      setResume((r) => ({ ...r, status: "analyzed" }));
    } catch (err) {
      setError(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const radarData = useMemo(
    () =>
      (analysis?.skills?.categories || []).map((c) => ({
        name: c.name.length > 16 ? `${c.name.slice(0, 15)}…` : c.name,
        level: c.level,
      })),
    [analysis]
  );

  const breakdownData = useMemo(
    () =>
      Object.entries(analysis?.scoreBreakdown || {}).map(([key, value]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        score: value,
      })),
    [analysis]
  );

  const exportAsText = () => {
    if (!analysis) return;
    const lines = [
      `CV Analysis — ${resume?.label || resume?.originalName}`,
      `Generated ${formatDate(new Date())}`,
      `Source: ${analysis.analysisSource === "xai" ? "xAI Grok" : "Built-in heuristic engine"}`,
      "",
      `OVERALL SCORE: ${analysis.overallScore}%`,
      ...Object.entries(analysis.scoreBreakdown || {}).map(
        ([k, v]) => `  - ${k}: ${v}%`
      ),
      "",
      "SUMMARY",
      analysis.summary,
      "",
      `TECHNICAL SKILLS (${analysis.skills?.technical?.length || 0})`,
      (analysis.skills?.technical || []).join(", "),
      "",
      `SOFT SKILLS (${analysis.skills?.soft?.length || 0})`,
      (analysis.skills?.soft || []).join(", "),
      "",
      `EXPERIENCE (${analysis.experience?.length || 0})`,
      ...(analysis.experience || []).map(
        (e) => `  - ${e.title} @ ${e.company} (${e.startDate || "?"} – ${e.current ? "Present" : e.endDate || "?"})`
      ),
      "",
      `EDUCATION (${analysis.education?.length || 0})`,
      ...(analysis.education || []).map(
        (e) => `  - ${e.degree} ${e.field || ""} @ ${e.institution}`
      ),
      "",
      `PROJECTS (${analysis.projects?.length || 0})`,
      ...(analysis.projects || []).map((p) => `  - ${p.name}: ${p.description}`),
      "",
      `CERTIFICATIONS (${analysis.certifications?.length || 0})`,
      ...(analysis.certifications || []).map((c) => `  - ${c.name} (${c.issuer || "n/a"})`),
      "",
      `LANGUAGES (${analysis.languages?.length || 0})`,
      ...(analysis.languages || []).map((l) => `  - ${l.name}: ${l.level}`),
      "",
      "RECOMMENDATIONS",
      ...(analysis.recommendations || []).map(
        (r, i) => `  ${i + 1}. [${r.impact}] ${r.title}${r.detail ? ` — ${r.detail}` : ""}`
      ),
      "",
      "Generated by CV Analyzer. AI recommendations are for review, not hiring decisions.",
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(resume?.label || "cv-analysis").replace(/\W+/g, "-").toLowerCase()}-analysis.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Analysis" breadcrumb />
        <LoadingState label="Loading the analysis…" />
      </>
    );
  }

  if (error && !resume) {
    return (
      <>
        <PageHeader title="Analysis" breadcrumb />
        <ErrorState error={error} onRetry={retry} />
      </>
    );
  }

  if (analyzing) {
    return (
      <>
        <PageHeader
          title={`Analysing ${resume?.label || resume?.originalName}`}
          description="Grok is reading your document. This usually takes 10–40 seconds."
          breadcrumb
        />
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <StageProgress
              stages={ANALYSIS_STAGES}
              index={stage.index}
              percent={stage.percent}
              title="AI analysis in progress"
            />
          </div>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm font-medium">File</p>
              <p className="text-muted-foreground mt-1 truncate text-sm">{resume?.originalName}</p>
              <Separator className="my-4" />
              <p className="text-muted-foreground text-xs">
                Do not close this tab — the analysis runs on the server and the result is saved
                automatically.
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (!analysis) {
    return (
      <>
        <PageHeader
          title={resume?.label || resume?.originalName}
          description="This CV has been uploaded and its text extracted, but it has not been analysed yet."
          breadcrumb
        />
        {error && <ErrorState error={error} className="mb-4" />}
        <EmptyState
          icon={Sparkles}
          title="Ready to analyse"
          description="Run the AI analysis to extract your profile, skills, experience, education and a scored set of recommendations."
          action={
            <Button onClick={runAnalysis} variant="gradient" size="lg">
              <Sparkles className="size-4" /> Analyse this CV
            </Button>
          }
        />
      </>
    );
  }

  const band = scoreBand(analysis.overallScore);
  const ringTone =
    band.variant === "success"
      ? "success"
      : band.variant === "warning"
        ? "warning"
        : band.variant === "destructive"
          ? "danger"
          : "primary";

  return (
    <>
      <PageHeader
        title={resume?.label || resume?.originalName}
        description={`Analysed ${formatDate(analysis.createdAt)}${
          analysis.durationMs ? ` in ${(analysis.durationMs / 1000).toFixed(1)}s` : ""
        } · ${analysis.analysisSource === "xai" ? "Powered by xAI Grok" : "Built-in heuristic engine"}`}
        breadcrumb
        actions={
          <>
            <Button variant="outline" onClick={exportAsText}>
              <Download className="size-4" /> Export
            </Button>
            <Button asChild variant="outline">
              <Link to="/matcher">
                <Target className="size-4" /> Match a job
              </Link>
            </Button>
            <Button onClick={runAnalysis} variant="gradient">
              <RefreshCw className="size-4" /> Re-analyse
            </Button>
          </>
        }
      />

      {error && <ErrorState error={error} className="mb-4" />}

      {analysis.analysisSource !== "xai" && (
        <InlineNotice type="warning" className="mb-5">
          This result came from the built-in heuristic engine. Set <code>XAI_API_KEY</code> in the
          server <code>.env</code> to get full Grok-powered extraction.
        </InlineNotice>
      )}

      {/* Score overview */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="relative overflow-hidden">
          <BorderBeam size={70} />
          <CardContent className="flex flex-col items-center gap-4 p-6">
            <ScoreRing value={analysis.overallScore} label="CV Score" sublabel={band.label} tone={ringTone} />
            {breakdownData.length > 0 && (
              <div className="w-full space-y-3">
                {breakdownData.map((row) => (
                  <div key={row.name}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-muted-foreground">{row.name}</span>
                      <span className="font-medium tabular-nums">{row.score}%</span>
                    </div>
                    <Progress value={row.score} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">AI summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed">{analysis.summary}</p>

            {analysis.strengths?.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">Strengths</p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.strengths.map((s) => (
                    <Badge key={s} variant="success">
                      <TrendingUp className="size-3" /> {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {analysis.weaknesses?.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">Gaps</p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.weaknesses.map((w) => (
                    <Badge key={w} variant="warning">
                      <TrendingDown className="size-3" /> {w}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="mt-5">
        <div className="no-scrollbar overflow-x-auto">
          <TabsList className="w-max min-w-full">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="experience">Experience</TabsTrigger>
            <TabsTrigger value="education">Education</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="more">More</TabsTrigger>
            <TabsTrigger value="actions">Recommendations</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile">
          <div className="grid gap-4 lg:grid-cols-3">
            <Section icon={User} title="Candidate profile">
              <dl className="space-y-3 text-sm">
                {[
                  { icon: User, label: "Name", value: analysis.profile?.fullName },
                  { icon: Mail, label: "Email", value: analysis.profile?.email },
                  { icon: Phone, label: "Phone", value: analysis.profile?.phone },
                  { icon: MapPin, label: "Location", value: analysis.profile?.location },
                  { icon: Sparkles, label: "Headline", value: analysis.profile?.headline },
                ]
                  .filter((row) => row.value)
                  .map((row) => (
                    <div key={row.label} className="flex items-start gap-3">
                      <row.icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                      <div className="min-w-0">
                        <dt className="text-muted-foreground text-xs">{row.label}</dt>
                        <dd className="break-words">{row.value}</dd>
                      </div>
                    </div>
                  ))}
                {analysis.profile?.links?.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Link2 className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    <div className="min-w-0">
                      <dt className="text-muted-foreground text-xs">Links</dt>
                      <dd className="space-y-1">
                        {analysis.profile.links.map((l) => (
                          <a
                            key={l}
                            href={l.startsWith("http") ? l : `https://${l}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary block truncate hover:underline"
                          >
                            {l}
                          </a>
                        ))}
                      </dd>
                    </div>
                  </div>
                )}
                {!analysis.profile?.fullName && !analysis.profile?.email && (
                  <p className="text-muted-foreground text-sm">
                    No contact details were found. Add a name, email and phone number to the top of
                    your CV.
                  </p>
                )}
              </dl>
            </Section>

            <div className="space-y-4 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Score breakdown</CardTitle>
                  <CardDescription>How the overall score is composed</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScoreBarChart data={breakdownData} />
                </CardContent>
              </Card>

              {matches.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Matches for this CV</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {matches.map((m) => {
                        const b = scoreBand(m.overallScore);
                        return (
                          <li
                            key={m._id}
                            className="bg-muted/40 flex items-center gap-3 rounded-lg border p-3"
                          >
                            <Briefcase className="text-muted-foreground size-4 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{m.job?.title}</p>
                              <p className="text-muted-foreground truncate text-xs">
                                {m.job?.company}
                              </p>
                            </div>
                            <Badge variant={b.variant}>{m.overallScore}%</Badge>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="skills">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Skill distribution</CardTitle>
                <CardDescription>Proficiency estimated from your CV</CardDescription>
              </CardHeader>
              <CardContent>
                <SkillRadar data={radarData} />
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Section icon={FileText} title="Technical skills" count={analysis.skills?.technical?.length}>
                <SkillCloud skills={analysis.skills?.technical} />
              </Section>

              <Section icon={Users} title="Soft skills" count={analysis.skills?.soft?.length}>
                <SkillCloud skills={analysis.skills?.soft} />
              </Section>

              <Section icon={Target} title="Keywords detected" count={analysis.keywords?.length}>
                <SkillCloud skills={analysis.keywords} />
              </Section>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="experience">
          <Section
            icon={Briefcase}
            title="Work experience"
            count={analysis.experience?.length}
          >
            <ExperienceTimeline items={analysis.experience} />
          </Section>
        </TabsContent>

        <TabsContent value="education">
          <Section icon={GraduationCap} title="Education" count={analysis.education?.length}>
            {analysis.education?.length ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {analysis.education.map((e, i) => (
                  <li key={i} className="bg-muted/40 rounded-lg border p-4">
                    <p className="font-medium">{e.degree || e.field || "Qualification"}</p>
                    <p className="text-muted-foreground text-sm">{e.institution}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {[e.startYear, e.endYear].filter(Boolean).join(" – ")}
                      {e.grade ? ` · ${e.grade}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">
                No education entries were detected. Make sure your CV has a clear Education section.
              </p>
            )}
          </Section>
        </TabsContent>

        <TabsContent value="projects">
          <Section icon={FolderGit2} title="Projects" count={analysis.projects?.length}>
            {analysis.projects?.length ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {analysis.projects.map((p, i) => (
                  <li key={i} className="bg-muted/40 rounded-lg border p-4">
                    <p className="font-medium">{p.name}</p>
                    {p.description && (
                      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                        {p.description}
                      </p>
                    )}
                    {p.technologies?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.technologies.map((t) => (
                          <Badge key={t} variant="secondary" className="text-[11px]">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {p.link && (
                      <a
                        href={p.link.startsWith("http") ? p.link : `https://${p.link}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary mt-2 inline-block text-xs hover:underline"
                      >
                        View project →
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">
                No projects detected. A small section with 2–3 projects measurably raises your score.
              </p>
            )}
          </Section>
        </TabsContent>

        <TabsContent value="more">
          <div className="grid gap-4 lg:grid-cols-2">
            <Section icon={Award} title="Certifications" count={analysis.certifications?.length}>
              {analysis.certifications?.length ? (
                <ul className="space-y-2">
                  {analysis.certifications.map((c, i) => (
                    <li key={i} className="bg-muted/40 flex items-start gap-3 rounded-lg border p-3">
                      <Award className="text-primary mt-0.5 size-4 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {[c.issuer, c.date].filter(Boolean).join(" · ")}
                        </p>
                        {c.credentialId && (
                          <p className="text-muted-foreground/80 mt-0.5 font-mono text-[11px]">
                            ID: {c.credentialId}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">No certifications found.</p>
              )}
            </Section>

            <Section icon={LanguagesIcon} title="Languages" count={analysis.languages?.length}>
              {analysis.languages?.length ? (
                <ul className="space-y-3">
                  {analysis.languages.map((l, i) => (
                    <li key={i}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium">{l.name}</span>
                        <span className="text-muted-foreground">{l.level}</span>
                      </div>
                      <Progress
                        value={
                          { Fluent: 95, "Native": 100, "C2": 90, "C1": 80, B2: 70, B1: 58, A2: 42, A1: 28 }[
                            l.level
                          ] || 60
                        }
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">No languages listed.</p>
              )}
            </Section>
          </div>
        </TabsContent>

        <TabsContent value="actions">
          <div className="grid gap-4 lg:grid-cols-2">
            <Section icon={Lightbulb} title="Recommendations" count={analysis.recommendations?.length}>
              {analysis.recommendations?.length ? (
                <ol className="space-y-3">
                  {analysis.recommendations.map((r, i) => (
                    <li key={i} className="rounded-lg border p-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-muted text-muted-foreground grid size-6 place-items-center rounded-full text-xs font-semibold">
                          {i + 1}
                        </span>
                        <p className="flex-1 font-medium">{r.title}</p>
                        <Badge variant={IMPACT_VARIANT[r.impact] || "secondary"}>{r.impact}</Badge>
                      </div>
                      {r.category && (
                        <p className="text-muted-foreground mt-1.5 text-xs">{r.category}</p>
                      )}
                      {r.detail && (
                        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{r.detail}</p>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No specific recommendations — your CV looks solid.
                </p>
              )}
            </Section>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wand2 className="text-primary size-4" /> Improve my CV
                </CardTitle>
                <CardDescription>AI rewrite suggestions for your weakest lines</CardDescription>
              </CardHeader>
              <CardContent>
                <ImprovePanel
                  resumeId={id}
                  improvement={improvement}
                  disclaimer={disclaimer}
                  onResult={(imp, disc) => {
                    setImprovement(imp);
                    setDisclaimer(disc);
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
