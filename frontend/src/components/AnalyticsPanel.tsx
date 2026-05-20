import { AnalyticsSummary } from "../types";

export default function AnalyticsPanel({ data }: { data: AnalyticsSummary }) {
  const rows = [
    ["Teachers", data.teachers],
    ["Students", data.students],
    ["Programs", data.programs],
    ["Course/Subject", data.courses],
    ["Assignments", data.assignments],
    ["Submissions", data.submissions],
    ["Submitted", data.submitted],
    ["Missing", data.missing],
    ["Graded", data.graded],
    ["Pending", data.pending],
    ["Passed", data.passed],
    ["Failed", data.failed],
    ["Late", data.late_submissions],
    ["Average", data.average_score != null ? data.average_score.toFixed(1) : undefined],
  ].filter(([, value]) => value !== undefined);
  const gradedTotal = (data.passed || 0) + (data.failed || 0);
  const submissionTotal = (data.graded || 0) + (data.pending || 0);
  const assignmentTotal = data.assignments || 0;
  const submittedTotal = (data.submitted || 0) + (data.missing || 0);
  const charts = [
    {
      title: "Submission Status",
      items: [
        ["Graded", data.graded || 0, submissionTotal],
        ["Pending", data.pending || 0, submissionTotal],
      ],
    },
    {
      title: "Result Split",
      items: [
        ["Passed", data.passed || 0, gradedTotal],
        ["Failed", data.failed || 0, gradedTotal],
      ],
    },
    {
      title: "Student Progress",
      items: [
        ["Submitted", data.submitted || 0, submittedTotal],
        ["Missing", data.missing || 0, submittedTotal],
      ],
    },
    {
      title: "Workload",
      items: [
        ["Assignments", data.assignments || 0, Math.max(assignmentTotal, data.submissions || 0)],
        ["Submissions", data.submissions || 0, Math.max(assignmentTotal, data.submissions || 0)],
      ],
    },
  ].filter((chart) => chart.items.some(([, value]) => Number(value) > 0));

  return (
    <div className="analytics-panel">
      <div className="summary-grid">
        {rows.map(([label, value]) => (
          <div className="summary-tile" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      {charts.length > 0 && (
        <div className="chart-grid">
          {charts.map((chart) => (
            <div className="chart-card" key={chart.title}>
              <h3>{chart.title}</h3>
              {chart.items.map(([label, value, total]) => {
                const numericValue = Number(value);
                const numericTotal = Number(total) || 0;
                const width = numericTotal > 0 ? Math.round((numericValue / numericTotal) * 100) : 0;
                return (
                  <div className="chart-row" key={String(label)}>
                    <div className="chart-row-label">
                      <span>{label}</span>
                      <strong>{numericValue}</strong>
                    </div>
                    <div className="chart-track" aria-label={`${label}: ${numericValue}`}>
                      <div className="chart-fill" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
