import { AppFrame } from "@/components/app-frame";
import { MetricCard } from "@/components/metric-card";

const educationStats = [
  { label: "Nominated", value: "120", detail: "Students received from schools and referrals." },
  { label: "Validated", value: "84", detail: "Students with completed Adlai validation checklist." },
  { label: "CBT ready", value: "63", detail: "Students who completed readiness orientation." },
  { label: "Registered", value: "48", detail: "Exam registration records captured." },
];

export default function EducationPage() {
  return (
    <AppFrame
      eyebrow="Education sponsorship"
      title="Education pipeline"
      description="Track school nomination, validation, CBT readiness, exam registration, check-ins, and outcomes."
      action={<button className="button button--primary">Add student</button>}
    >
      <section className="metric-grid">
        {educationStats.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </section>
      <section className="workspace-card">
        <h2>Next build slice</h2>
        <p>
          This module becomes real after core programmes, beneficiaries, enrolments, activities, and evidence metadata are connected.
        </p>
      </section>
    </AppFrame>
  );
}
