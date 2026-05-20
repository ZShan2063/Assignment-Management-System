import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

const checks = [
  ["src/pages/LoginPage.tsx", ["Create account", "Choose another login"]],
  ["src/pages/AdminDashboard.tsx", ["Download Template", "Audit Log", "Register Student", "Assignment"]],
  ["src/pages/TeacherDashboard.tsx", ["Create a new assignment", "Grade submissions", "Course/Subject"]],
  ["src/pages/StudentDashboard.tsx", ["Active assignments", "Submit Work", "submission-history-list"]],
  ["src/pages/VerifyEmailPage.tsx", ["Verify email", "/users/verify-email/"]],
  ["src/components/AssignmentDiscussion.tsx", ["Discussion", "/messages/"]],
  ["src/components/FilePreviewer.tsx", ["role=\"dialog\"", "Escape", "Download"]],
  ["src/components/AnalyticsPanel.tsx", ["chart-grid", "Submission Status", "Result Split"]],
  ["src/components/ReportsPanel.tsx", ["Download System Backup", "Confirm Restore"]],
];

const failures = [];

for (const [file, expectedSnippets] of checks) {
  const content = readFileSync(resolve(root, file), "utf8");
  for (const snippet of expectedSnippets) {
    if (!content.includes(snippet)) {
      failures.push(`${file} is missing: ${snippet}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Frontend smoke tests passed (${checks.length} files checked).`);
