"""
Image Processor
=================
Extracts embedded images from PDFs, sends significant ones to a vision model
for structured descriptions, and creates image-context chunks for RAG retrieval.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)


@dataclass
class ProcessedImage:
    """An image extracted and optionally described by a vision model."""
    page_number: int
    image_index: int
    image_path: str
    width: int
    height: int
    image_type: str  # figure, diagram, graph, chart, geometry, illustration
    description: str  # Natural language description from vision model
    detected_elements: list[str]  # e.g., ["triangle", "angle labels", "perpendicular"]


class ImageProcessor:
    """Extracts and processes images from documents."""

    def __init__(self, output_base_dir: Path | None = None):
        self.output_base_dir = output_base_dir or Path("uploads/knowledge/images")

    def extract_and_describe(
        self,
        file_path: Path,
        document_id: int,
        *,
        use_vision_model: bool = True,
    ) -> list[ProcessedImage]:
        """
        Extract all significant images from a PDF and generate descriptions.
        """
        results: list[ProcessedImage] = []
        save_dir = self.output_base_dir / str(document_id)
        save_dir.mkdir(parents=True, exist_ok=True)

        try:
            doc = fitz.open(str(file_path))
        except Exception as e:
            logger.error("Cannot open PDF for image extraction: %s", e)
            return results

        for page_idx, page in enumerate(doc, start=1):
            try:
                image_list = page.get_images(full=True)
            except Exception:
                continue

            for img_idx, img_info in enumerate(image_list):
                xref = img_info[0]
                try:
                    base_image = doc.extract_image(xref)
                    if not base_image:
                        continue

                    image_bytes = base_image["image"]
                    image_ext = base_image.get("ext", "png")
                    width = base_image.get("width", 0)
                    height = base_image.get("height", 0)

                    # Skip tiny images (icons, bullets, decorations)
                    if width < 50 or height < 50:
                        continue

                    # Save image
                    filename = f"p{page_idx}_img{img_idx}.{image_ext}"
                    filepath = save_dir / filename
                    filepath.write_bytes(image_bytes)

                    # Classify and describe
                    description = ""
                    image_type = "figure"
                    detected_elements: list[str] = []

                    if use_vision_model:
                        try:
                            desc_result = self._describe_with_vision(filepath)
                            description = desc_result.get("description", "")
                            image_type = desc_result.get("image_type", "figure")
                            detected_elements = desc_result.get("detected_elements", [])
                        except Exception as e:
                            logger.warning("Vision model failed for %s: %s", filename, e)
                            description = self._basic_classify(width, height)
                            image_type = "figure"

                    if not description:
                        description = self._basic_classify(width, height)

                    results.append(ProcessedImage(
                        page_number=page_idx,
                        image_index=img_idx,
                        image_path=str(filepath),
                        width=width,
                        height=height,
                        image_type=image_type,
                        description=description,
                        detected_elements=detected_elements,
                    ))

                except Exception as e:
                    logger.warning(
                        "Failed to extract image xref=%d page=%d: %s",
                        xref, page_idx, e,
                    )

        doc.close()
        logger.info(
            "Extracted %d images from %s (doc_id=%d)",
            len(results), file_path.name, document_id,
        )
        return results

    def _describe_with_vision(self, image_path: Path) -> dict:
        """
        Use Groq Vision (LLaMA) to describe an image.
        Returns: {"description": str, "image_type": str, "detected_elements": list}
        """
        try:
            from app.core.config import get_settings
            from openai import OpenAI
            import base64
            import json

            settings = get_settings()
            if not settings.groq_api_key:
                return {"description": "", "image_type": "figure", "detected_elements": []}

            client = OpenAI(
                api_key=settings.groq_api_key,
                base_url="https://api.groq.com/openai/v1",
            )

            with open(image_path, "rb") as f:
                image_data = base64.b64encode(f.read()).decode("utf-8")

            ext = image_path.suffix[1:] or "png"
            data_url = f"data:image/{ext};base64,{image_data}"

            prompt = (
                "Analyze this image from an educational exam or textbook. "
                "Respond in JSON format with these fields:\n"
                '- "description": A clear, detailed description of what the image shows\n'
                '- "image_type": One of: diagram, graph, chart, geometry, illustration, table, map, figure\n'
                '- "detected_elements": A list of key elements visible (e.g., ["triangle", "angle 60°", "labeled sides"])\n'
                "Be concise but thorough. This description will be used for search retrieval."
            )

            response = client.chat.completions.create(
                model=settings.groq_vision_model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": data_url}},
                        ],
                    }
                ],
                temperature=0.2,
                max_tokens=2048,
            )

            text = response.choices[0].message.content.strip()

            # Strip markdown code fences if present
            if text.startswith("```"):
                text = text.split("\n", 1)[1] if "\n" in text else text[3:]
                if text.endswith("```"):
                    text = text[:-3]
                if text.startswith("json"):
                    text = text[4:]
                text = text.strip()

            try:
                result = json.loads(text)
                return {
                    "description": result.get("description", text),
                    "image_type": result.get("image_type", "figure"),
                    "detected_elements": result.get("detected_elements", []),
                }
            except json.JSONDecodeError:
                return {
                    "description": text[:500],
                    "image_type": "figure",
                    "detected_elements": [],
                }

        except ImportError:
            logger.info("openai package not available for vision")
            return {"description": "", "image_type": "figure", "detected_elements": []}
        except Exception as e:
            logger.warning("Vision model error: %s", e)
            return {"description": "", "image_type": "figure", "detected_elements": []}

    def _basic_classify(self, width: int, height: int) -> str:
        """Basic image classification based on dimensions."""
        aspect = width / max(height, 1)
        if aspect > 2:
            return "Wide image, possibly a chart or banner"
        elif aspect < 0.5:
            return "Tall image, possibly a diagram or illustration"
        elif width > 500 and height > 500:
            return "Large image, possibly a detailed diagram or figure"
        else:
            return "Image or figure from the document"


image_processor = ImageProcessor()
