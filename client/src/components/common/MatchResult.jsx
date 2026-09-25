import { useMemo } from "react";
import { Briefcase, Check, Trash2, X } from "lucide-react";
import { formatDate, scoreBand } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/charts/ScoreRing";
import { SkillRadar } from "@/components/charts/Charts";
import { ExplainMatch } from "@/components/common/StageProgress";
import { BorderBeam } from "@/components/magicui/border-beam";

/**
 * Full match result card. Shared by the Job Matcher and the History detail
 * dialog so both surfaces render identical information.
 */
export function MatchResult({ match, onDelete }) {
  const band = scoreBand(match.overallScore);

  const breakdown = useMemo(
    () =>
      Object.entries(match.scoreBreakdown || {}).map(([key, value]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        score: value,
      })),
    [match]
  );

  // Radar of skill coverage: matched skills sit high, missing skills low.
  const coverage = useMemo(() => {
    const levels = {};
    (match.matchingSkills || []).forEach((s) => {
      levels[s.toLowerCase()] = 100;
    });
    (match.missingSkills || []).forEach((s) => {
      levels[s.toLowerCase()] = 20;
    });
    return Object.entries(levels)
      .slice(0, 8)
      .map(([name, level]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), level }));
  }, [match]);

  const tone =
    band.variant === "success"
      ? "success"
      : band.variant === "warning"
        ? "warning"
        : band.variant === "destructive"
          ? "danger"
          : "primary";

  const blocks = [
    { title: "Matching skills", items: match.matchingSkills, variant: "success", Icon: Check },
    { title: "Missing skills", items: match.missingSkills, variant: "destructive", Icon: X },
    { title: "Matching experience", items: match.matchingExperience, variant: "success", Icon: Check },
    { title: "Missing experience", items: match.missingExperience, variant: "warning", Icon: X },
    { title: "Matching education", items: match.matchingEducation, variant: "success", Icon: Check },
    { title: "Matching projects", items: match.matchingProjects, variant: "info", Icon: Briefcase },
  ].filter((b) => b.items?.length);

  return (
    <Card className="relative overflow-hidden">
      <BorderBeam size={80} />
      <CardHeader>
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">{match.job?.title || "Job match"}</CardTitle>
            <CardDescription>
              {match.job?.company}
              {match.job?.location ? ` · ${match.job.location}` : ""} ·{" "}
              {match.resume?.label || match.resume?.originalName}
            </CardDescription>
          </div>
          <Badge variant={band.variant} className="text-sm">
            {match.overallScore}% · {match.verdict}
          </Badge>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete(match)}
              aria-label="Delete match result"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="flex justify-center">
            <ScoreRing
              value={match.overallScore}
              size={148}
              label="Match"
              sublabel={match.verdict}
              tone={tone}
            />
          </div>

          <div className="lg:col-span-2">
            <p className="mb-2 text-sm font-medium">Score breakdown</p>
            <div className="space-y-2.5">
              {breakdown.map((row) => (
                <div key={row.name}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-muted-foreground">{row.name}</span>
                    <span className="font-medium tabular-nums">{row.score}%</span>
                  </div>
                  <Progress value={row.score} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <ExplainMatch explanation={match.explanation} />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            {blocks.map((block) => (
              <div key={block.title}>
                <p className="mb-1.5 text-sm font-medium">
                  {block.title}{" "}
                  <span className="text-muted-foreground font-normal">({block.items.length})</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {block.items.map((item) => (
                    <Badge key={item} variant={block.variant} className="text-xs">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
            {blocks.length === 0 && (
              <p className="text-muted-foreground text-sm">
                The AI did not identify any matching or missing items for this role.
              </p>
            )}
          </div>

          <div className="space-y-4">
            {coverage.length > 0 && (
              <div>
                <p className="mb-1 text-sm font-medium">Skill coverage</p>
                <SkillRadar data={coverage} className="h-56" />
              </div>
            )}

            {match.recommendations?.length > 0 && (
              <div>
                <p className="mb-1.5 text-sm font-medium">How to close the gap</p>
                <ol className="space-y-2">
                  {match.recommendations.map((rec, i) => (
                    <li key={i} className="flex gap-2.5 text-sm">
                      <span className="bg-primary/12 text-primary grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold">
                        {i + 1}
                      </span>
                      <span className="text-muted-foreground">{rec}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>

        <p className="text-muted-foreground text-xs">
          Matched {formatDate(match.createdAt)} ·{" "}
          {match.analysisSource === "xai" ? "Powered by xAI Grok" : "Built-in heuristic engine"}
        </p>
      </CardContent>
    </Card>
  );
}

export default MatchResult;
