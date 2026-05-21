CREATE DATABASE IF NOT EXISTS jnv_sainik_prep CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE jnv_sainik_prep;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(180) NOT NULL,
  hashed_password VARCHAR(255) NOT NULL,
  role ENUM('student','parent','admin') NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  refresh_token_hash VARCHAR(255),
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX ix_users_email (email),
  INDEX ix_users_role (role)
);

CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  target_exam VARCHAR(80) NOT NULL DEFAULT 'JNV',
  grade INT NOT NULL DEFAULT 6,
  streak_days INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  total_points INT NOT NULL DEFAULT 0,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  subject VARCHAR(80),
  chapter VARCHAR(220),
  started_at DATETIME NOT NULL,
  ended_at DATETIME,
  duration_seconds INT NOT NULL DEFAULT 0,
  session_type VARCHAR(50) NOT NULL,
  active_status BOOLEAN NOT NULL DEFAULT TRUE,
  last_heartbeat_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX ix_study_sessions_student (student_id),
  INDEX ix_study_sessions_active (active_status, last_heartbeat_at),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS parents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  phone VARCHAR(32),
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_parents_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS parent_child_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parent_id INT NOT NULL,
  student_id INT NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_parent_student (parent_id, student_id),
  FOREIGN KEY (parent_id) REFERENCES parents(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS chapters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  grade INT NOT NULL,
  subject VARCHAR(80) NOT NULL,
  chapter_number INT,
  title VARCHAR(220) NOT NULL,
  description TEXT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX ix_chapter_lookup (grade, subject, chapter_number)
);

CREATE TABLE IF NOT EXISTS pdf_metadata (
  id INT AUTO_INCREMENT PRIMARY KEY,
  file_path VARCHAR(700) NOT NULL UNIQUE,
  file_name VARCHAR(260) NOT NULL,
  grade INT,
  subject VARCHAR(80),
  chapter VARCHAR(220),
  topic VARCHAR(220),
  source_type ENUM('textbook','pyq','notes') NOT NULL,
  year INT,
  difficulty ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
  total_pages INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS embeddings_metadata (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pdf_id INT NOT NULL,
  vector_id VARCHAR(160) NOT NULL UNIQUE,
  grade INT,
  subject VARCHAR(80),
  chapter VARCHAR(220),
  topic VARCHAR(220),
  source_type ENUM('textbook','pyq','notes') NOT NULL,
  year INT,
  difficulty ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
  page_number INT,
  text_preview TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (pdf_id) REFERENCES pdf_metadata(id),
  INDEX ix_embedding_filters (grade, subject, chapter, source_type)
);

CREATE TABLE IF NOT EXISTS quizzes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(220) NOT NULL,
  grade INT NOT NULL,
  subject VARCHAR(80) NOT NULL,
  chapter VARCHAR(220),
  quiz_type VARCHAR(80) NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 20,
  created_by_id INT,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (created_by_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT NOT NULL,
  question_type ENUM('mcq','fill_blank','reasoning') NOT NULL DEFAULT 'mcq',
  prompt TEXT NOT NULL,
  options JSON,
  correct_answer TEXT NOT NULL,
  textbook_explanation TEXT NOT NULL,
  ai_explanation TEXT NOT NULL,
  difficulty ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
  topic VARCHAR(220),
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  quiz_id INT NOT NULL,
  answers JSON NOT NULL,
  score FLOAT NOT NULL DEFAULT 0,
  accuracy FLOAT NOT NULL DEFAULT 0,
  time_taken_seconds INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
  INDEX ix_attempt_student_quiz (student_id, quiz_id)
);

CREATE TABLE IF NOT EXISTS progress_tracking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  chapter_id INT NOT NULL,
  completion_percentage FLOAT NOT NULL DEFAULT 0,
  time_spent_minutes INT NOT NULL DEFAULT 0,
  mastery_score FLOAT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_student_chapter_progress (student_id, chapter_id)
);

CREATE TABLE IF NOT EXISTS achievements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  badge_key VARCHAR(80) NOT NULL,
  title VARCHAR(160) NOT NULL,
  description VARCHAR(260) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  event_type VARCHAR(100) NOT NULL,
  payload JSON NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX ix_analytics_event_type (event_type)
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  citations JSON NOT NULL,
  tokens_used INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
