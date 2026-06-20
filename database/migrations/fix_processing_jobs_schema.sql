-- Migration: Fix all processing_jobs schema issues
-- Date: 2026-06-20
-- Context: Table was created by create_all() with older/incorrect definition
-- Fixes: missing columns + wrong ENUM on status column

ALTER TABLE processing_jobs
    ADD COLUMN current_stage VARCHAR(80) DEFAULT NULL AFTER status;

ALTER TABLE processing_jobs
    ADD COLUMN progress_pct FLOAT NOT NULL DEFAULT 0 AFTER current_stage;

ALTER TABLE processing_jobs
    MODIFY COLUMN status
    ENUM('pending','processing','completed','failed','retrying','dead_letter')
    NOT NULL DEFAULT 'pending';

-- Fix: content_type ENUM missing 'figure' value used by image_processor
ALTER TABLE knowledge_images
    MODIFY COLUMN content_type
    ENUM('figure','diagram','graph','flowchart','map','geometry_figure',
         'scientific_illustration','labeled_image','question_figure','generic')
    NOT NULL DEFAULT 'generic';
