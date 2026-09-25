import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

/** Split-screen shell shared by the login and register pages. */
export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center gap-2">
            <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-lg">
              <Sparkles className="size-4" />
            </span>
            <span className="text-sm font-semibold">CV Analyzer</span>
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-1.5 text-sm">{subtitle}</p>}

          <div className="mt-7">{children}</div>

          {footer && <div className="text-muted-foreground mt-6 text-sm">{footer}</div>}
        </div>
      </div>

      {/* Marketing side */}
      <div className="bg-grid relative hidden overflow-hidden border-l lg:block">
        <div className="absolute inset-0 -z-10 bg-linear-to-br from-primary/12 via-transparent to-cyan-500/12" />
        <div className="flex h-full flex-col justify-center px-12">
          <p className="text-primary text-sm font-medium">AI career workspace</p>
          <h2 className="mt-3 max-w-md text-4xl font-semibold tracking-tight">
            Understand your CV. Match your career.
          </h2>
          <p className="text-muted-foreground mt-4 max-w-md">
            Upload a PDF, DOCX or image and get a scored, structured analysis of your profile — then
            see exactly how you measure up against any job description you paste in.
          </p>

          <dl className="mt-10 grid max-w-md grid-cols-2 gap-6">
            {[
              ["Extraction", "Text + OCR"],
              ["Analysis", "Grok-powered"],
              ["Scoring", "5 dimensions"],
              ["Matching", "Skill-level gaps"],
            ].map(([k, v]) => (
              <div key={k} className="border-l-2 border-primary/40 pl-3">
                <dt className="text-muted-foreground text-xs tracking-wide uppercase">{k}</dt>
                <dd className="mt-0.5 font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

export default AuthShell;
