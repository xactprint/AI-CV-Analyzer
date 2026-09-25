import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/common/Feedback";
import { BarChart3 } from "lucide-react";

const AXIS = { stroke: "hsl(var(--muted-foreground))", fontSize: 11 };

/** Horizontal bars — used for score breakdowns. */
export function ScoreBarChart({ data = [], className }) {
  if (!data.length) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No score data yet"
        description="Run an analysis to see how your CV scores across each area."
        className="border-none py-8"
      />
    );
  }

  return (
    <div className={className} style={{ height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={AXIS} axisLine={false} tickLine={false} unit="%" />
          <YAxis
            type="category"
            dataKey="name"
            tick={AXIS}
            axisLine={false}
            tickLine={false}
            width={96}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--accent))" }}
            formatter={(v) => [`${v}%`, "Score"]}
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 10,
              fontSize: 12,
            }}
          />
          <Bar dataKey="score" fill="hsl(var(--chart-1))" radius={[0, 6, 6, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Vertical bars — used for skill category proficiency. */
export function CategoryBarChart({ data = [], className }) {
  if (!data.length) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No skill breakdown yet"
        description="Upload a CV and run an analysis to see your skill distribution."
        className="border-none py-8"
      />
    );
  }

  return (
    <div className={className} style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -18, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ ...AXIS, angle: -18, textAnchor: "end" }}
            interval={0}
            height={58}
            axisLine={false}
            tickLine={false}
          />
          <YAxis domain={[0, 100]} tick={AXIS} axisLine={false} tickLine={false} unit="%" width={44} />
          <Tooltip
            cursor={{ fill: "hsl(var(--accent))" }}
            formatter={(v) => [`${v}%`, "Proficiency"]}
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 10,
              fontSize: 12,
            }}
          />
          <Bar dataKey="level" radius={[6, 6, 0, 0]} barSize={34}>
            {data.map((_, i) => (
              <Bar key={i} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Radar — the skill distribution visual called for in the brief. */
export function SkillRadar({ data = [], className, seriesName = "Your CV" }) {
  if (!data.length) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Nothing to visualise yet"
        description="Your radar chart appears once a CV has been analysed."
        className="border-none py-8"
      />
    );
  }

  return (
    <div className={className} style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="name" tick={{ ...AXIS, fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name={seriesName}
            dataKey="level"
            stroke="hsl(var(--chart-1))"
            fill="hsl(var(--chart-1))"
            fillOpacity={0.35}
            strokeWidth={2}
          />
          <Legend />
          <Tooltip
            formatter={(v) => [`${v}%`, seriesName]}
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 10,
              fontSize: 12,
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Grouped bars — CV version comparison. */
export function ComparisonBarChart({ data = [], className }) {
  if (!data.length) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Nothing to compare"
        description="Analyse two CV versions to see the difference."
        className="border-none py-8"
      />
    );
  }

  return (
    <div className={className} style={{ height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -18, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={AXIS} axisLine={false} tickLine={false} unit="%" width={44} />
          <Tooltip
            cursor={{ fill: "hsl(var(--accent))" }}
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 10,
              fontSize: 12,
            }}
          />
          <Legend />
          <Bar dataKey="left" name="Version A" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} />
          <Bar dataKey="right" name="Version B" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
