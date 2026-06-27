from pydantic import BaseModel, ConfigDict

class VideoRecommendationBase(BaseModel):
    video_id: str
    title: str
    thumbnail: str
    channel: str
    duration: str
    score: float
    language: str

class VideoRecommendationOut(VideoRecommendationBase):
    id: int
    chapter_id: int

    model_config = ConfigDict(from_attributes=True)

class VideoRecommendationResponse(BaseModel):
    status: str
    query: str | None = None
    language: str | None = None
    videos: list[VideoRecommendationOut] = []
