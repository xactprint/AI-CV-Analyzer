import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { resumeApi, analysisApi } from "@/lib/api";
import { ANALYSIS_STAGES, formatBytes } from "@/lib/constants";
import { PageHeader } from "@/components/common/StatCard";
import { ErrorState } from "@/components/common/Feedback";
import { StageProgress } from "@/components/common/StageProgress";
import { useProgressStages } from "@/hooks/useProgressStages";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPT = [".pdf", ".docx", ".png", ".jpg", ".jpeg"];
const MIME = "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg";

const validate = (file) => {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ACCEPT.includes(`.${ext}`)) {
    return `&ldquo;${ext.toUpperCase() || file.name}&rdquo; is not a supported format. Use PDF, DOCX, PNG or JPG.`;
  }
  if (file.size > MAX_SIZE) {
    return `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_SIZE)}.`;
  }
  if (file.size === 0) return "That file is empty. Please choose a different file.";
  return null;
};

function DropZone({ onPick, error }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) onPick(dropped);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
        dragging
          ? "border-primary bg-primary/5"
          : error
            ? "border-destructive/50 bg-destructive/5"
            : "border-border hover:border-primary/50 hover:bg-accent/30"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={MIME}
        className="sr-only"
        onChange={(e) => {
          const picked = e.target.files?.[0];
          if (picked) onPick(picked);
          e.target.value = "";
        }}
      />

      <span
        className={`mb-4 grid size-14 place-items-center rounded-full transition-colors ${
          dragging ? "bg-primary text-primary-foreground" : "bg-primary/12 text-primary"
        }`}
      >
        <Upload className="size-6" />
      </span>

      <p className="text-lg font-medium">
        {dragging ? "Drop it here" : "Drag & drop your CV here"}
      </p>
      <p className="text-muted-foreground mt-1.5 text-sm">
        or{" "}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-primary font-medium hover:underline"
        >
          browse your files
        </button>
      </p>

      <div className="mt-5 flex flex-wrap justify-center gap-1.5">
        {["PDF", "DOCX", "PNG", "JPG"].map((f) => (
          <Badge key={f} variant="secondary">
            {f}
          </Badge>
        ))}
      </div>
      <p className="text-muted-foreground mt-3 text-xs">Maximum 10 MB per file</p>
    </div>
  );
}

export default function UploadCv() {
  const { resolvedTheme } = useTheme();

  const [file, setFile] = useState(null);
  const [label, setLabel] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [phase, setPhase] = useState("idle"); // idle | uploading | analyzing | done
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const stage = useProgressStages(ANALYSIS_STAGES, phase === "analyzing");

  useEffect(() => {
    return () => setUploadPercent(0);
  }, []);

  const onPick = useCallback((picked) => {
    const problem = validate(picked);
    if (problem) {
      setError(problem);
      setFile(null);
      return;
    }
    setError(null);
    setFile(picked);
    if (!label) setLabel(picked.name.replace(/\.[^.]+$/, "").slice(0, 60));
  }, [label]);

  const submit = async (e) => {
    e?.preventDefault();
    if (!file || phase === "uploading" || phase === "analyzing") return;

    setError(null);
    setPhase("uploading");
    setUploadPercent(0);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("label", label.trim() || "General");
      form.append("isPrimary", String(isPrimary));

      const uploaded = await resumeApi.upload(form, (e) => {
        if (e.total) setUploadPercent(Math.round((e.loaded / e.total) * 100));
      });

      setPhase("analyzing");
      const analysed = await analysisApi.create(uploaded.resume._id);

      setResult({ resume: uploaded.resume, analysis: analysed.analysis });
      setPhase("done");
    } catch (err) {
      setPhase("idle");
      setError(err);
    }
  };

  const reset = () => {
    setFile(null);
    setLabel("");
    setIsPrimary(false);
    setPhase("idle");
    setResult(null);
    setError(null);
    setUploadPercent(0);
  };

  /* ----------------------------- states ----------------------------- */

  if (phase === "analyzing" && file) {
    return (
      <>
        <PageHeader
          title="Analysing your CV"
          description="Grok is reading the document and building your profile. This can take 10–40 seconds."
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
            <CardContent className="space-y-3 p-5">
              <p className="text-sm font-medium">Analysing</p>
              <div className="flex items-center gap-2">
                <FileText className="text-primary size-4" />
                <span className="truncate text-sm">{label || file.name}</span>
              </div>
              <p className="text-muted-foreground text-xs">
                Upload and text extraction completed. The AI is reading it now.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <a href="/" target="_blank" rel="noreferrer">
                  Open in a new tab to keep working
                </a>
              </Button>
              <p className="text-muted-foreground text-xs">
                Please keep this tab open — closing it cancels the analysis.
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (phase === "done" && result) {
    return (
      <>
        <PageHeader
          title="Analysis complete"
          description="Here is what the AI found in your CV."
        />
        <Card className="border-emerald-500/40">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-emerald-500/15">
              <CheckCircle2 className="size-7 text-emerald-500" />
            </span>
            <div>
              <p className="text-lg font-semibold">
                {result.resume.label} scored {result.analysis.overallScore}%
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {result.analysis.analysisSource === "xai"
                  ? `Analysed with Grok in ${Math.round((result.analysis.durationMs || 0) / 1000)}s.`
                  : "Analysed with the built-in heuristic engine (no XAI_API_KEY configured)."}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild variant="gradient">
                <Link to={`/cvs/${result.resume._id}`}>
                  <Sparkles className="size-4" /> View full analysis
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/matcher">Match against a job</Link>
              </Button>
              <Button variant="ghost" onClick={reset}>
                <Wand2 className="size-4" /> Analyse another CV
              </Button>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Upload a CV"
        description="PDF, DOCX, PNG or JPG. Scanned documents and images are passed through OCR automatically."
        breadcrumb
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <form onSubmit={submit} className="space-y-5 lg:col-span-2">
          {error && <ErrorState error={error} title="Upload failed" />}

          {!file ? (
            <DropZone onPick={onPick} error={error} />
          ) : (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <span className="bg-primary/12 text-primary grid size-10 place-items-center rounded-lg">
                    <FileText className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatBytes(file.size)} · {file.name.split(".").pop()?.toUpperCase()}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={reset}
                    aria-label="Remove file"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                {phase === "uploading" && (
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-muted-foreground">Uploading…</span>
                      <span className="font-medium tabular-nums">{uploadPercent}%</span>
                    </div>
                    <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
                      <div
                        className="from-primary to-cyan-400 h-full bg-linear-to-r transition-all"
                        style={{ width: `${uploadPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="label">Version label</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Frontend, Full Stack, Internship"
                maxLength={60}
                disabled={!file}
              />
              <p className="text-muted-foreground text-xs">
                Lets you keep several targeted versions and compare them.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="primary">Set as primary</Label>
              <label
                htmlFor="primary"
                className={`border-input flex h-9 cursor-pointer items-center gap-2.5 rounded-lg border px-3 ${
                  file ? "" : "opacity-50"
                }`}
              >
                <input
                  id="primary"
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  disabled={!file}
                  className="accent-primary size-4"
                />
                <span className="text-sm">Use this for new matches</span>
              </label>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            variant="gradient"
            disabled={!file || phase === "uploading"}
            className="w-full sm:w-auto"
          >
            {phase === "uploading" ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <Sparkles className="size-4" /> Upload & analyse
              </>
            )}
          </Button>
        </form>

        <aside className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <p className="font-medium">What happens next</p>
              <ol className="space-y-3">
                {[
                  "Your file is uploaded and stored privately on the server.",
                  "Text is extracted. Images and scans go through OCR.",
                  "Grok extracts your profile, skills, experience and education.",
                  "You get a score, a breakdown and prioritised recommendations.",
                ].map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="bg-primary/12 text-primary grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Alert>
            <Sparkles className="size-4" />
            <AlertTitle>Scanned CVs are fine</AlertTitle>
            <AlertDescription>
              If a PDF has no text layer, we automatically run OCR on it. Clearer, higher-resolution
              images produce the best results.
            </AlertDescription>
          </Alert>

          <Alert variant="info">
            <FileText className="size-4" />
            <AlertTitle>Your files stay private</AlertTitle>
            <AlertDescription>
              Uploads are scoped to your account and are never visible to other users.
              {resolvedTheme === "dark" && " Dark mode is on."}
            </AlertDescription>
          </Alert>
        </aside>
      </div>
    </>
  );
}
