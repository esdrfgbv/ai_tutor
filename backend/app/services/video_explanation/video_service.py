import json
import logging
from urllib.parse import urlparse, parse_qs
from fastapi import HTTPException
import httpx
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.models import Chapter, VideoRecommendation
from app.services.ai_service import get_ai_provider

logger = logging.getLogger(__name__)

def parse_duration(iso: str) -> dict:
    import re
    match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso)
    if not match:
        return {"seconds": 0, "formatted": "0:00"}
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    total = hours * 3600 + minutes * 60 + seconds
    fmt = f"{hours}:{minutes:02d}:{seconds:02d}" if hours > 0 else f"{minutes}:{seconds:02d}"
    return {"seconds": total, "formatted": fmt}

class VideoExplanationService:
    def __init__(self):
        self.settings = get_settings()
        self.ai = get_ai_provider()
        
    def get_recommendations(self, db: Session, chapter_id: int):
        chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
        if not chapter:
            raise HTTPException(status_code=404, detail="Chapter not found")
            
        cached = db.query(VideoRecommendation).filter(VideoRecommendation.chapter_id == chapter_id).order_by(VideoRecommendation.score.desc()).all()
        if cached:
            return cached
            
        return []

    async def generate_recommendations(self, db: Session, chapter_id: int, pdf_url: str):
        chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
        if not chapter:
            raise HTTPException(status_code=404, detail="Chapter not found")
            
        cached = db.query(VideoRecommendation).filter(VideoRecommendation.chapter_id == chapter_id).order_by(VideoRecommendation.score.desc()).all()
        if cached:
            return cached
            
        logger.info(f"Extracting OCR from PDF {pdf_url}")
        ocr_text = await self._extract_ocr_from_pdf_url(pdf_url)
            
        metadata = self._extract_metadata(ocr_text)
        search_query = self._generate_search_query(chapter, metadata, ocr_text)
        
        videos = await self._search_youtube(search_query, metadata.get("language", "english"))
        if not videos:
            return []
            
        ranked = self._rank_videos(videos, chapter.title, chapter.subject, ", ".join(metadata.get("keywords", [])))
        
        # Merge scores and sort
        score_map = {r["videoId"]: r["score"] for r in ranked}
        for v in videos:
            v["score"] = score_map.get(v["videoId"], 50)
            
        videos.sort(key=lambda x: x["score"], reverse=True)
        
        results = []
        for v in videos[:5]:
            rec = VideoRecommendation(
                chapter_id=chapter_id,
                language=metadata.get("language", "english"),
                query=search_query,
                video_id=v["videoId"],
                title=v["title"],
                thumbnail=v["thumbnail"],
                channel=v["channelTitle"],
                duration=v["duration"],
                score=v["score"]
            )
            db.add(rec)
            results.append(rec)
            
        db.commit()
        for r in results:
            db.refresh(r)
            
        return results

    def clear_cache(self, db: Session, chapter_id: int):
        db.query(VideoRecommendation).filter(VideoRecommendation.chapter_id == chapter_id).delete()
        db.commit()

    async def _extract_ocr_from_pdf_url(self, pdf_url: str) -> str:
        api_key = self.settings.paddleocr_api_key
        if not api_key:
            logger.warning("paddleocr_api_key not set, skipping PaddleOCR")
            return "Educational PDF content. Chapter text extraction requires PaddleOCR API key."

        try:
            async with httpx.AsyncClient() as client:
                data = {"url": pdf_url, "language_type": "auto_detect"}
                headers = {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Authorization": f"Bearer {api_key}"
                }
                res = await client.post("https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic", data=data, headers=headers)
                
                if res.status_code != 200:
                    logger.error(f"PaddleOCR API failed with status {res.status_code}")
                    return f"OCR failed: API returned status {res.status_code}"
                
                resp_data = res.json()
                if "error_msg" in resp_data:
                    logger.error(f"PaddleOCR returned error: {resp_data['error_msg']}")
                    return f"OCR error: {resp_data['error_msg']}"
                
                words = [w.get("words", "") for w in resp_data.get("words_result", [])]
                text = "\n".join(words)
                logger.info(f"OCR extraction complete via PaddleOCR ({len(text)} chars)")
                return text
        except Exception as e:
            logger.error(f"OCR extraction failed: {e}")
            return f"OCR failed: {e}"
        
    def _extract_metadata(self, ocr_text: str) -> dict:
        prompt = f"""You are an expert at analyzing educational textbook content. Extract metadata from OCR text.

Return ONLY a JSON object with these fields:
{{
  "title": "chapter title",
  "subject": "subject name",
  "classLevel": "class number",
  "language": "english or hindi",
  "keywords": ["array", "of", "key", "concepts"]
}}

OCR Text (first 2000 chars):
{ocr_text[:2000]}
"""
        try:
            resp = self.ai.generate_text(prompt)
            json_str = resp[resp.find("{"):resp.rfind("}")+1]
            data = json.loads(json_str)
            return data
        except Exception as e:
            logger.error(f"Metadata extraction failed: {e}")
            return {"language": "english", "keywords": []}
            
    def _generate_search_query(self, chapter: Chapter, metadata: dict, ocr_text: str) -> str:
        prompt = f"""You are an expert educational content curator. Generate a single optimized YouTube search query for finding the best educational video.

Rules:
- Return ONLY the search query string, nothing else
- Make it specific and educational
- Include class/grade level if provided
- Prefer lecture, tutorial, explainer content

Chapter: {chapter.title}
Subject: {chapter.subject}
Class: {chapter.grade}
Language: {metadata.get('language', 'english')}

Generate one optimized educational YouTube search query.
"""
        try:
            query = self.ai.generate_text(prompt)
            return query.strip().replace('"', '')
        except Exception:
            return f"Class {chapter.grade} {chapter.subject} {chapter.title} explained lecture"

    async def _search_youtube(self, query: str, language: str) -> list[dict]:
        api_key = self.settings.youtube_api_key
        if not api_key:
            logger.warning("youtube_api_key not set, skipping search")
            return []
            
        search_url = "https://www.googleapis.com/youtube/v3/search"
        params = {
            "part": "snippet",
            "q": query,
            "type": "video",
            "videoDuration": "medium",
            "videoEmbeddable": "true",
            "relevanceLanguage": "hi" if language.lower() == "hindi" else "en",
            "maxResults": 10,
            "key": api_key
        }
        
        async with httpx.AsyncClient() as client:
            search_res = await client.get(search_url, params=params)
            if search_res.status_code != 200:
                logger.error("YouTube search API failed")
                return []
                
            items = search_res.json().get("items", [])
            video_ids = ",".join([item["id"]["videoId"] for item in items])
            if not video_ids:
                return []
                
            details_url = "https://www.googleapis.com/youtube/v3/videos"
            details_params = {
                "part": "contentDetails,statistics",
                "id": video_ids,
                "key": api_key
            }
            details_res = await client.get(details_url, params=details_params)
            details_items = details_res.json().get("items", [])
            details_map = {item["id"]: item for item in details_items}
            
        videos = []
        for item in items:
            vid = item["id"]["videoId"]
            detail = details_map.get(vid)
            if not detail:
                continue
                
            duration_info = parse_duration(detail["contentDetails"]["duration"])
            sec = duration_info["seconds"]
            if sec < 300 or sec > 1800:
                continue # Only 5-30 mins
                
            snippet = item["snippet"]
            text = f'{snippet["title"]} {snippet["description"]} {snippet["channelTitle"]}'.lower()
            if any(blocked in text for blocked in ["shorts", "entertainment", "music", "gaming", "reaction", "comedy", "movies", "ads", "vlog", "funny", "prank"]):
                continue
                
            thumb = snippet["thumbnails"].get("high", snippet["thumbnails"].get("medium", snippet["thumbnails"].get("default", {}))).get("url", f"https://img.youtube.com/vi/{vid}/hqdefault.jpg")
            
            videos.append({
                "videoId": vid,
                "title": snippet["title"],
                "description": snippet["description"],
                "channelTitle": snippet["channelTitle"],
                "thumbnail": thumb,
                "duration": duration_info["formatted"],
                "viewCount": int(detail["statistics"].get("viewCount", "0"))
            })
            
        return videos

    def _rank_videos(self, videos: list[dict], title: str, subject: str, concepts: str) -> list[dict]:
        video_list_str = "\n\n".join([
            f"{i+1}. ID: {v['videoId']}\nTitle: {v['title']}\nChannel: {v['channelTitle']}\nViews: {v['viewCount']}\nDuration: {v['duration']}\nDescription: {v['description'][:200]}"
            for i, v in enumerate(videos)
        ])
        
        prompt = f"""You are an expert educational content evaluator. Score YouTube videos for educational relevance.

Criteria (0-100):
- Relevance & accuracy (40)
- Title/description match (25)
- Channel credibility (15)
- Duration appropriateness (10)
- Views (10)

Return ONLY a JSON array: [{{"videoId": "...", "score": 85}}, ...]

Chapter: {title}
Subject: {subject}
Key concepts: {concepts}

Videos:
{video_list_str}
"""
        try:
            resp = self.ai.generate_text(prompt)
            json_str = resp[resp.find("["):resp.rfind("]")+1]
            return json.loads(json_str)
        except Exception:
            return [{"videoId": v["videoId"], "score": 50} for v in videos]
