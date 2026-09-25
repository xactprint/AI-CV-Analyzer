import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Star,
  Trash2,
  Upload,
  Pencil,
  MoreHorizontal,
  GitCompareArrows,
  Eye,
  Loader2,
  X,
} from "lucide-react";
import { resumeApi } from "@/lib/api";
import { formatBytes, formatDate, formatRelative, scoreBand } from "@/lib/constants";
import { PageHeader } from "@/components/common/StatCard";
import { ErrorState, EmptyState, LoadingState } from "@/components/common/Feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const EXTRACTION_LABEL = {
  "pdf-text": "PDF text",
  "docx-text": "DOCX text",
  ocr: "OCR",
  pending: "Pending",
  failed: "Failed",
};

function ResumeCard({ resume, onRename, onDelete, onMakePrimary }) {
  const [preview, setPreview] = useState(false);
  const band = typeof resume.latestScore === "number" ? scoreBand(resume.latestScore) : null;
  const isImage = ["png", "jpg", "jpeg"].includes(resume.extension);

  return (
    <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-lg ${
              resume.status === "failed"
                ? "bg-destructive/12 text-destructive"
                : "bg-primary/12 text-primary"
            }`}
          >
            <FileText className="size-4" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{resume.label || "Untitled CV"}</p>
              {resume.isPrimary && (
                <Badge variant="purple" className="shrink-0">
                  <Star className="size-3" /> Primary
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground truncate text-xs" title={resume.originalName}>
              {resume.originalName}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {formatBytes(resume.fileSize)} · {EXTRACTION_LABEL[resume.extractionMethod] || "—"} ·{" "}
              {formatRelative(resume.createdAt)}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="CV actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setPreview(true)}>
                <Eye /> Preview original
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onRename(resume)}>
                <Pencil /> Rename / relabel
              </DropdownMenuItem>
              {!resume.isPrimary && (
                <DropdownMenuItem onSelect={() => onMakePrimary(resume)}>
                  <Star /> Set as primary
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => onDelete(resume)}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4">
          {band ? (
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Latest score</span>
                <span className="font-medium tabular-nums">{resume.latestScore}%</span>
              </div>
              <Progress value={resume.latestScore} />
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">
              {resume.status === "failed"
                ? "Text extraction failed for this file."
                : "Not analysed yet."}
            </p>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <Button asChild size="sm" className="flex-1">
            <Link to={`/cvs/${resume._id}`}>
              {resume.status === "failed" ? "Retry analysis" : "View analysis"}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/compare" aria-label="Compare versions">
              <GitCompareArrows className="size-4" />
            </Link>
          </Button>
        </div>
      </CardContent>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{resume.originalName}</DialogTitle>
            <DialogDescription>
              The original file as you uploaded it. The AI reads the extracted text, not this view.
            </DialogDescription>
          </DialogHeader>
          {isImage ? (
            <img
              src={resumeApi.fileUrl(resume._id)}
              alt={resume.originalName}
              className="max-h-[65vh] w-full rounded-lg border object-contain"
            />
          ) : (
            <iframe
              title={resume.originalName}
              src={resumeApi.fileUrl(resume._id)}
              className="h-[65vh] w-full rounded-lg border bg-white"
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function MyCvs() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [newLabel, setNewLabel] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  const applyResumes = useCallback((data) => {
    setResumes(data.resumes || []);
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

  const handleRename = async () => {
    if (!newLabel.trim()) return;
    setBusy(true);
    setActionError(null);
    try {
      await resumeApi.update(renaming._id, { label: newLabel.trim() });
      setRenaming(null);
      await load();
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(false);
    }
  };

  const handlePrimary = async (resume) => {
    setActionError(null);
    try {
      await resumeApi.update(resume._id, { isPrimary: true });
      await load();
    } catch (err) {
      setActionError(err);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    setActionError(null);
    try {
      await resumeApi.remove(confirmDelete._id);
      setConfirmDelete(null);
      await load();
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(false);
    }
  };

  const summary = useMemo(
    () => ({
      total: resumes.length,
      analysed: resumes.filter((r) => typeof r.latestScore === "number").length,
      failed: resumes.filter((r) => r.status === "failed").length,
    }),
    [resumes]
  );

  return (
    <>
      <PageHeader
        title="My CVs"
        description="Keep multiple versions — Frontend, Full Stack, internship — and switch between them."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/compare">
                <GitCompareArrows className="size-4" /> Compare
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

      {actionError && <ErrorState error={actionError} className="mb-4" />}

      {resumes.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2 text-sm">
          <Badge variant="secondary">{summary.total} uploaded</Badge>
          <Badge variant="success">{summary.analysed} analysed</Badge>
          {summary.failed > 0 && <Badge variant="destructive">{summary.failed} failed</Badge>}
        </div>
      )}

      {loading ? (
        <LoadingState label="Loading your CVs…" />
      ) : error ? (
        <ErrorState error={error} onRetry={retry} />
      ) : resumes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No CVs uploaded yet"
          description="Upload a PDF, DOCX, PNG or JPG and the AI will extract everything from it — including OCR for scanned documents."
          action={
            <Button asChild variant="gradient">
              <Link to="/cvs/upload">
                <Upload className="size-4" /> Upload your first CV
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {resumes.map((r) => (
            <ResumeCard
              key={r._id}
              resume={r}
              onRename={(resume) => {
                setRenaming(resume);
                setNewLabel(resume.label || "");
              }}
              onDelete={setConfirmDelete}
              onMakePrimary={handlePrimary}
            />
          ))}
        </div>
      )}

      {/* Rename dialog */}
      <Dialog open={Boolean(renaming)} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename this CV version</DialogTitle>
            <DialogDescription>
              Use a label that describes the role it targets, e.g. &ldquo;Frontend&rdquo; or
              &ldquo;Internship&rdquo;.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. Frontend"
            maxLength={60}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={busy || !newLabel.trim()}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={Boolean(confirmDelete)} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="text-destructive size-5" /> Delete this CV?
            </DialogTitle>
            <DialogDescription>
              &ldquo;{confirmDelete?.label || confirmDelete?.originalName}&rdquo; and all of its
              analyses and match results will be permanently removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <p className="text-muted-foreground text-xs">Uploaded {formatDate(confirmDelete?.createdAt)}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Keep it
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
