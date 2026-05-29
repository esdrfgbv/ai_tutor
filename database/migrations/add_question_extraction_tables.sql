-- Migration: Add PDF Question Bank Extraction tables
-- Date: 2026-05-24

-- 1. Source tracking table for imported PDFs
CREATE TABLE IF NOT EXISTS question_bank_sources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_path VARCHAR(700) NOT NULL UNIQUE,
    file_name VARCHAR(260) NOT NULL,
    display_name VARCHAR(260) NOT NULL,
    exam_type VARCHAR(80),
    year INT,
    grade INT,
    total_pages INT NOT NULL DEFAULT 0,
    total_questions_extracted INT NOT NULL DEFAULT 0,
    extraction_status ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
    extraction_error TEXT,
    processed_at DATETIME,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX ix_qbs_exam_type (exam_type),
    INDEX ix_qbs_year (year),
    INDEX ix_qbs_grade (grade)
);

-- 2. Add new columns to question_bank
ALTER TABLE question_bank
    ADD COLUMN source_id INT NULL,
    ADD COLUMN source_page INT NULL,
    ADD COLUMN question_number INT NULL,
    ADD COLUMN section_name VARCHAR(220) NULL,
    ADD COLUMN raw_text TEXT NULL,
    ADD COLUMN cleaned_text TEXT NULL,
    ADD COLUMN question_source_type ENUM('pdf_extracted','manual','ai_generated') NOT NULL DEFAULT 'manual',
    ADD COLUMN year INT NULL,
    ADD COLUMN has_image BOOLEAN NOT NULL DEFAULT FALSE,
    ADD INDEX ix_qb_source_id (source_id),
    ADD INDEX ix_qb_section_name (section_name),
    ADD INDEX ix_qb_year (year),
    ADD CONSTRAINT fk_qb_source FOREIGN KEY (source_id) REFERENCES question_bank_sources(id);

-- 3. Normalized question options
CREATE TABLE IF NOT EXISTS question_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    label VARCHAR(10) NOT NULL,
    text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    image_path VARCHAR(700),
    INDEX ix_qo_question_id (question_id),
    FOREIGN KEY (question_id) REFERENCES question_bank(id) ON DELETE CASCADE
);

-- 4. Question images / diagrams
CREATE TABLE IF NOT EXISTS question_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    image_path VARCHAR(700) NOT NULL,
    image_type VARCHAR(50) NOT NULL DEFAULT 'figure',
    page_number INT,
    width INT,
    height INT,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX ix_qi_question_id (question_id),
    FOREIGN KEY (question_id) REFERENCES question_bank(id) ON DELETE CASCADE
);

-- 5. Question explanations / solutions
CREATE TABLE IF NOT EXISTS question_explanations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL UNIQUE,
    solution_text TEXT NOT NULL,
    solution_type VARCHAR(50) NOT NULL DEFAULT 'extracted',
    source_page INT,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (question_id) REFERENCES question_bank(id) ON DELETE CASCADE
);

-- 6. Flexible question tags
CREATE TABLE IF NOT EXISTS question_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    tag_key VARCHAR(80) NOT NULL,
    tag_value VARCHAR(220) NOT NULL,
    INDEX ix_qt_question_id (question_id),
    INDEX ix_qt_tag_key (tag_key),
    UNIQUE KEY uq_question_tag (question_id, tag_key, tag_value),
    FOREIGN KEY (question_id) REFERENCES question_bank(id) ON DELETE CASCADE
);
