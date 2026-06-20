"""
Metadata Service
==================
CRUD for database-driven metadata values.
Replaces all hardcoded dropdowns (class, subject, chapter, exam_type, etc.)
with dynamic values stored in MetadataRegistry.
"""

from __future__ import annotations

import logging
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.knowledge_models import MetadataRegistry, KnowledgeDocument

logger = logging.getLogger(__name__)

# Metadata fields and their default seed values
DEFAULT_METADATA_SEED: dict[str, list[dict]] = {
    "class": [
        {"value": "4", "label": "Class 4"},
        {"value": "5", "label": "Class 5"},
        {"value": "6", "label": "Class 6"},
        {"value": "7", "label": "Class 7"},
        {"value": "8", "label": "Class 8"},
        {"value": "9", "label": "Class 9"},
    ],
    "subject": [
        {"value": "maths", "label": "Mathematics"},
        {"value": "science", "label": "Science"},
        {"value": "english", "label": "English"},
        {"value": "mental-ability", "label": "Mental Ability"},
    ],
    "source_type": [
        {"value": "textbook", "label": "Textbook"},
        {"value": "notes", "label": "Notes"},
        {"value": "pyq", "label": "Previous Year Questions"},
        {"value": "mock_test", "label": "Mock Test Paper"},
        {"value": "worksheet", "label": "Worksheet"},
        {"value": "reference_material", "label": "Reference Material"},
    ],
    "exam_type": [
        {"value": "JNV", "label": "JNV (Navodaya)"},
        {"value": "AISSEE", "label": "AISSEE (Sainik)"},
        {"value": "Olympiad", "label": "Olympiad"},
        {"value": "Custom", "label": "Custom / Internal"},
    ],
    "language": [
        {"value": "English", "label": "English"},
        {"value": "Hindi", "label": "Hindi"},
        {"value": "Bilingual", "label": "Bilingual"},
    ],
}


class MetadataService:
    """Database-driven metadata management."""

    def get_field_values(
        self,
        db: Session,
        field_name: str,
        *,
        parent_field: str | None = None,
        parent_value: str | None = None,
        active_only: bool = True,
    ) -> list[dict]:
        """
        Get all values for a metadata field.
        Optionally filter by parent (e.g., chapters for a specific subject).
        """
        query = db.query(MetadataRegistry).filter(
            MetadataRegistry.field_name == field_name,
        )
        if active_only:
            query = query.filter(MetadataRegistry.is_active == True)  # noqa: E712
        if parent_field and parent_value:
            query = query.filter(
                MetadataRegistry.parent_field == parent_field,
                MetadataRegistry.parent_value == parent_value,
            )
        entries = query.order_by(MetadataRegistry.sort_order, MetadataRegistry.display_label).all()
        return [
            {
                "id": e.id,
                "value": e.field_value,
                "label": e.display_label,
                "parent_field": e.parent_field,
                "parent_value": e.parent_value,
            }
            for e in entries
        ]

    def add_field_value(
        self,
        db: Session,
        field_name: str,
        field_value: str,
        display_label: str | None = None,
        *,
        parent_field: str | None = None,
        parent_value: str | None = None,
        sort_order: int = 0,
    ) -> MetadataRegistry:
        """Add a new metadata field value."""
        # Check if already exists
        existing = (
            db.query(MetadataRegistry)
            .filter(
                MetadataRegistry.field_name == field_name,
                MetadataRegistry.field_value == field_value,
            )
            .first()
        )
        if existing:
            if not existing.is_active:
                existing.is_active = True
                db.flush()
            return existing

        entry = MetadataRegistry(
            field_name=field_name,
            field_value=field_value,
            display_label=display_label or field_value,
            parent_field=parent_field,
            parent_value=parent_value,
            sort_order=sort_order,
        )
        db.add(entry)
        db.flush()
        return entry

    def update_field_value(
        self,
        db: Session,
        entry_id: int,
        *,
        display_label: str | None = None,
        sort_order: int | None = None,
        is_active: bool | None = None,
    ) -> MetadataRegistry | None:
        """Update an existing metadata field value."""
        entry = db.get(MetadataRegistry, entry_id)
        if not entry:
            return None
        if display_label is not None:
            entry.display_label = display_label
        if sort_order is not None:
            entry.sort_order = sort_order
        if is_active is not None:
            entry.is_active = is_active
        db.flush()
        return entry

    def deactivate_field_value(self, db: Session, entry_id: int) -> bool:
        """Soft-delete a metadata value."""
        entry = db.get(MetadataRegistry, entry_id)
        if not entry:
            return False
        entry.is_active = False
        db.flush()
        return True

    def get_schema(self, db: Session) -> dict:
        """
        Get the full metadata schema: all fields with their values.
        Used by the frontend to build dynamic forms.
        """
        schema: dict[str, list[dict]] = {}
        all_fields = (
            db.query(MetadataRegistry.field_name)
            .distinct()
            .all()
        )
        for (field_name,) in all_fields:
            schema[field_name] = self.get_field_values(db, field_name)
        return schema

    def seed_defaults(self, db: Session) -> int:
        """
        Seed default metadata values if the registry is empty.
        Called during application startup.
        Returns number of entries created.
        """
        existing_count = db.query(MetadataRegistry).count()
        if existing_count > 0:
            return 0

        created = 0
        for field_name, values in DEFAULT_METADATA_SEED.items():
            for idx, item in enumerate(values):
                entry = MetadataRegistry(
                    field_name=field_name,
                    field_value=item["value"],
                    display_label=item["label"],
                    sort_order=idx,
                )
                db.add(entry)
                created += 1

        db.flush()
        logger.info("Seeded %d default metadata values", created)
        return created

    def auto_discover_values(self, db: Session) -> int:
        """
        Scan existing KnowledgeDocuments and add any metadata values
        not yet in the registry. Ensures the registry stays in sync.
        """
        discovered = 0

        # Discover classes
        classes = (
            db.query(KnowledgeDocument.doc_class)
            .filter(KnowledgeDocument.doc_class.isnot(None))
            .distinct()
            .all()
        )
        for (cls,) in classes:
            if cls:
                self.add_field_value(db, "class", cls, f"Class {cls}")
                discovered += 1

        # Discover subjects
        subjects = (
            db.query(KnowledgeDocument.doc_subject)
            .filter(KnowledgeDocument.doc_subject.isnot(None))
            .distinct()
            .all()
        )
        for (subj,) in subjects:
            if subj:
                self.add_field_value(db, "subject", subj, subj.title())
                discovered += 1

        # Discover exam types
        exam_types = (
            db.query(KnowledgeDocument.exam_type)
            .filter(KnowledgeDocument.exam_type.isnot(None))
            .distinct()
            .all()
        )
        for (et,) in exam_types:
            if et:
                self.add_field_value(db, "exam_type", et, et)
                discovered += 1

        db.flush()
        return discovered


metadata_service = MetadataService()
