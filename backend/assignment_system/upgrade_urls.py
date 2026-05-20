from django.urls import path

from .upgrade_views import AdminAnalyticsView, AssignmentReportView, AuditLogView, AuditReportView, BackupExportView, BackupRestoreView, CourseReportView, DeletedRecordListView, RestoreDeletedRecordView, StudentProgressView, StudentTranscriptReportView, SubmissionReportView, TeacherAnalyticsView, UserImportTemplateView, UserImportView, UserReportView

urlpatterns = [
    path("analytics/admin/", AdminAnalyticsView.as_view(), name="admin-analytics"),
    path("analytics/teacher/", TeacherAnalyticsView.as_view(), name="teacher-analytics"),
    path("analytics/student/", StudentProgressView.as_view(), name="student-progress"),
    path("reports/assignments/", AssignmentReportView.as_view(), name="assignment-report"),
    path("reports/submissions/", SubmissionReportView.as_view(), name="submission-report"),
    path("reports/users/", UserReportView.as_view(), name="user-report"),
    path("reports/courses/", CourseReportView.as_view(), name="course-report"),
    path("reports/audit/", AuditReportView.as_view(), name="audit-report"),
    path("reports/student-transcript/", StudentTranscriptReportView.as_view(), name="student-transcript-report"),
    path("reports/backup/", BackupExportView.as_view(), name="backup-export"),
    path("reports/backup/restore/", BackupRestoreView.as_view(), name="backup-restore"),
    path("audit/", AuditLogView.as_view(), name="audit-log"),
    path("deleted-records/", DeletedRecordListView.as_view(), name="deleted-records"),
    path("deleted-records/restore/", RestoreDeletedRecordView.as_view(), name="restore-deleted-record"),
    path("imports/<str:role>/", UserImportView.as_view(), name="user-import"),
    path("imports/<str:role>/template/", UserImportTemplateView.as_view(), name="user-import-template"),
]
