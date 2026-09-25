import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  FileSearch,
  FileText,
  Gauge,
  Languages,
  ScanText,
  ShieldCheck,
  Sparkles,
  Target,
  Wrench,
} from "lucide-react";
import { GithubIcon } from "@/components/common/BrandIcons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/AuthContext";
import { WordCycle } from "@/components/magicui/word-cycle";
import { FadeIn } from "@/components/magicui/fade-in";
import { BorderBeam } from "@/components/magicui/border-beam";
import { SpotlightCard } from "@/components/magicui/spotlight";
import { Marquee } from "@/components/magicui/marquee";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { ScoreRing } from "@/components/charts/ScoreRing";
import { SkillRadar } from "@/components/charts/Charts";

const FEATURES = [
  {
    icon: ScanText,
    title: "Real document extraction",
    body: "PDF, DOCX, PNG and JPG. Scanned documents and images go through OCR automatically, so a photo of your CV still gets analysed.",
  },
  {
    icon: FileSearch,
    title: "Structured CV intelligence",
    body: "Profile, skills, experience, education, projects, certifications and languages — extracted into clean, usable JSON.",
  },
  {
    icon: Gauge,
    title: "A score you can act on",
    body: "An overall CV score with a breakdown of skills, experience, education, structure and keyword coverage, plus concrete fixes.",
  },
  {
    icon: Target,
    title: "Job compatibility scoring",
    body: "Paste any job description you are allowed to use and see exactly how well your CV matches — and what is missing.",
  },
  {
    icon: Bot,
    title: "Explain, not just score",
    body: "Every match comes with the reasoning: which skills matched, which are absent, and what to do next.",
  },
  {
    icon: Languages,
    title: "Multiple CV versions",
    body: "Keep a Frontend CV, a Full Stack CV and an internship CV side by side, then compare their scores directly.",
  },
];

const STEPS = [
  { step: "01", title: "Upload your CV", body: "Drag in a PDF, DOCX or image. We extract the text, with OCR for scans." },
  { step: "02", title: "Let the AI read it", body: "Grok extracts your profile, skills, experience, education and projects." },
  { step: "03", title: "Read your score", body: "Get an overall score, a category breakdown and a prioritised action list." },
  { step: "04", title: "Match a job", body: "Paste a job description, see your match score and the skills you are missing." },
];

const TECH = [
  { icon: Sparkles, name: "React 19", note: "Vite + JSX" },
  { icon: Wrench, name: "Tailwind CSS", note: "shadcn/ui + Magic UI" },
  { icon: Bot, name: "Express 5", note: "REST API" },
  { icon: FileText, name: "MongoDB", note: "Mongoose ODM" },
  { icon: ShieldCheck, name: "JWT + bcrypt", note: "Auth & security" },
  { icon: BriefcaseBusiness, name: "xAI / Grok", note: "AI analysis" },
];

const DEMO_SKILLS = [
  { name: "Frontend", level: 85 },
  { name: "Backend", level: 70 },
  { name: "Database", level: 60 },
  { name: "DevOps", level: 40 },
  { name: "AI / ML", level: 50 },
];

function Nav() {
  const { user } = useAuth();
  return (
    <header className="bg-background/70 sticky top-0 z-40 border-b backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-lg">
            <Sparkles className="size-4" />
          </span>
          <span className="text-sm font-semibold">CV Analyzer</span>
        </Link>

        <nav className="ml-auto hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
          <a href="#preview" className="hover:text-foreground transition-colors">Preview</a>
          <a href="#tech" className="hover:text-foreground transition-colors">Tech</a>
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {user ? (
            <Button asChild size="sm">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" variant="gradient">
                <Link to="/register">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="bg-grid mask-fade-b absolute inset-0 -z-10" />
      <div className="absolute -top-32 left-1/2 -z-10 size-[36rem] -translate-x-1/2 rounded-full bg-primary/18 blur-[120px]" />

      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1">
            <Sparkles className="size-3" />
            Powered by xAI Grok
          </Badge>

          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
            <span className="text-gradient">
              <WordCycle words={["Understand Your CV.", "Match Your Career."]} />
            </span>
          </h1>

          <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg">
            AI-powered CV analysis and job compatibility in one intelligent workspace.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" variant="gradient">
              <Link to="/register">
                Analyze My CV <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">Try Job Matcher</Link>
            </Button>
          </div>

          <p className="text-muted-foreground mt-4 text-xs">
            PDF · DOCX · PNG · JPG &nbsp;•&nbsp; Free while in development
          </p>
        </motion.div>

        {/* Stat strip */}
        <FadeIn delay={0.15} className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { value: 4, suffix: "", label: "file formats" },
            { value: 7, suffix: "", label: "AI pipeline stages" },
            { value: 5, suffix: "", label: "score dimensions" },
            { value: 100, suffix: "%", label: "private by design" },
          ].map((s) => (
            <Card key={s.label} className="text-center">
              <CardContent className="p-4">
                <p className="text-2xl font-semibold">
                  <NumberTicker value={s.value} suffix={s.suffix} />
                </p>
                <p className="text-muted-foreground text-xs">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </FadeIn>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-primary text-sm font-medium">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {description && (
        <p className="text-muted-foreground mt-3 text-base">{description}</p>
      )}
    </div>
  );
}

function Features() {
  return (
    <section id="features" className="border-t py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Features"
          title="Everything a job seeker actually needs"
          description="Not a CRUD demo. A real analysis pipeline: extraction, OCR, AI analysis, scoring and job matching."
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <FadeIn key={f.title} delay={i * 0.06}>
              <Card className="group h-full overflow-hidden">
                <BorderBeam size={70} />
                <CardContent className="p-6">
                  <span className="bg-primary/12 text-primary mb-4 grid size-10 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-110">
                    <f.icon className="size-5" />
                  </span>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{f.body}</p>
                </CardContent>
              </Card>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function Preview() {
  return (
    <section id="preview" className="border-t py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Preview"
          title="See your CV before a recruiter does"
          description="The analysis view shows a score, a skill radar, extracted sections and a prioritised to-do list."
        />

        <FadeIn className="mt-14 grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardContent className="flex flex-col items-center gap-4 p-6">
              <ScoreRing value={84} label="CV Score" sublabel="Strong" />
              <div className="w-full space-y-3">
                {[
                  { name: "Skills", score: 88 },
                  { name: "Experience", score: 82 },
                  { name: "Structure", score: 91 },
                  { name: "Keywords", score: 74 },
                ].map((row) => (
                  <div key={row.name}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-muted-foreground">{row.name}</span>
                      <span className="font-medium tabular-nums">{row.score}%</span>
                    </div>
                    <Progress value={row.score} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold">Skill distribution</h3>
                <Badge variant="purple">Extracted by AI</Badge>
              </div>
              <SkillRadar data={DEMO_SKILLS} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <h3 className="mb-4 font-semibold">Recommendations</h3>
              <ul className="space-y-3">
                {[
                  { t: "Add measurable impact to your React bullets", v: "high" },
                  { t: "Mirror the job description's keyword vocabulary", v: "medium" },
                  { t: "List certifications with issuer and issue year", v: "low" },
                ].map((r) => (
                  <li key={r.t} className="bg-muted/40 flex items-center gap-3 rounded-lg border p-3">
                    <Badge variant={r.v === "high" ? "destructive" : r.v === "medium" ? "warning" : "secondary"}>
                      {r.v}
                    </Badge>
                    <span className="text-sm">{r.t}</span>
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground mt-4 text-xs">
                AI recommendations are for you to review — they are never applied to your CV automatically.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 font-semibold">Job match</h3>
              <ScoreRing value={87} size={140} label="Match" sublabel="Excellent" tone="success" className="mx-auto" />
              <div className="mt-4 space-y-2">
                <Badge variant="success" className="mr-1">Strong React experience</Badge>
                <Badge variant="success" className="mr-1">Relevant Node.js</Badge>
                <Badge variant="success" className="mr-1">MongoDB</Badge>
                <Badge variant="warning" className="mr-1">No AWS evidence</Badge>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="border-t py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="How it works" title="Four steps, about a minute" />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <FadeIn key={s.step} delay={i * 0.08}>
              <SpotlightCard className="h-full">
                <Card className="h-full">
                  <CardContent className="p-6">
                    <p className="text-primary/60 font-mono text-3xl font-semibold">{s.step}</p>
                    <h3 className="mt-3 font-semibold">{s.title}</h3>
                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{s.body}</p>
                  </CardContent>
                </Card>
              </SpotlightCard>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function Technology() {
  return (
    <section id="tech" className="border-t py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Technology"
          title="Built on the MERN stack with an AI service layer"
        />

        <FadeIn className="mt-12">
          <div className="relative overflow-hidden rounded-2xl border bg-card/50 py-8">
            <Marquee className="gap-4" pauseOnHover>
              {TECH.map((t) => (
                <Card key={t.name} className="w-56 shrink-0">
                  <CardContent className="flex items-center gap-3 p-4">
                    <span className="bg-primary/12 text-primary grid size-9 place-items-center rounded-lg">
                      <t.icon className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-muted-foreground text-xs">{t.note}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </Marquee>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="border-t py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <FadeIn>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Stop guessing what your CV is missing
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl">
            Upload your CV, get a real score, and see exactly how you measure up against the roles
            you want.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" variant="gradient">
              <Link to="/register">
                Analyze my CV now <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">I already have an account</Link>
            </Button>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <span className="bg-primary text-primary-foreground grid size-7 place-items-center rounded-md">
            <Sparkles className="size-3.5" />
          </span>
          <span className="text-sm font-medium">CV Analyzer</span>
        </div>
        <p className="text-muted-foreground text-center text-xs sm:text-left">
          Built for a university project. Job descriptions are always supplied by the user — no
          automated scraping of any job board.
        </p>
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="GitHub"
        >
          <GithubIcon className="size-4" />
        </a>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="bg-background min-h-dvh">
      <Nav />
      <main>
        <Hero />
        <Features />
        <Preview />
        <HowItWorks />
        <Technology />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
