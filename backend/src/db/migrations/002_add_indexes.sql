CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_reports_project_id ON reports(project_id);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
