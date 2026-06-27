import { useEffect, useState } from "react";
import { ArrowLeft, Play, RefreshCw, AlertCircle } from "lucide-react";
import { useStudyWorkspace } from "../../context/StudyWorkspaceContext";
import api from "../../api/client";

export default function VideoExplanationView({ pdfUrl }) {
  const { setCurrentView, slug, subject, grade, chapterTitle } = useStudyWorkspace();
  
  const [loading, setLoading] = useState(true);
  const [statusText, setStatusText] = useState("Analyzing Chapter...");
  const [error, setError] = useState(null);
  const [videos, setVideos] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);

  const fetchRecommendations = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      let chapterId = 1; // fallback
      const match = slug.match(/chapter-(\d+)/i);
      if (match) {
        const chapterNum = parseInt(match[1], 10);
        try {
          const chaptersRes = await api.get(`/learning/chapters`, {
            params: { grade, subject }
          });
          const found = chaptersRes.data.find(c => c.chapter_number === chapterNum);
          if (found) chapterId = found.id;
        } catch (err) {
          console.warn("Could not fetch chapters to map slug to ID", err);
        }
      }

      if (forceRefresh) {
        await api.delete(`/video-explanation/cache/${chapterId}`);
      }

      setStatusText("Checking Cache...");
      let res = await api.get(`/video-explanation/${chapterId}`);
      
      if (res.data.status === "not_found") {
        setStatusText("Extracting text from PDF (OCR)...");
        // We simulate intermediate status changes because the generation might take a bit
        const interval = setInterval(() => {
          setStatusText(prev => {
            if (prev.includes("OCR")) return "Generating Search Query...";
            if (prev.includes("Query")) return "Searching YouTube...";
            if (prev.includes("Searching")) return "Ranking Videos...";
            return prev;
          });
        }, 3000);
        
        res = await api.post(`/video-explanation/generate/${chapterId}`, null, {
          params: { pdf_url: pdfUrl }
        });
        clearInterval(interval);
      }

      if (res.data.videos && res.data.videos.length > 0) {
        setVideos(res.data.videos);
        setCurrentVideo(res.data.videos[0]);
      } else {
        setError("No suitable educational videos found for this chapter.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while fetching video recommendations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [slug]);

  return (
    <div className="video-explanation-view" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', backgroundColor: '#0f0f0f', color: '#fff' }}>
      {/* Top Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #333', backgroundColor: '#1a1a1a' }}>
        <button 
          onClick={() => setCurrentView("pdf")}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px', borderRadius: '4px' }}
          className="hover:bg-gray-800"
        >
          <ArrowLeft size={18} />
          <span>Back to PDF</span>
        </button>
        <div style={{ fontWeight: '500', flex: 1, textAlign: 'center' }}>
          {chapterTitle}
        </div>
        <button 
          onClick={() => fetchRecommendations(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#adff44', cursor: 'pointer', padding: '8px', fontSize: '0.9rem' }}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <RefreshCw size={40} className="animate-spin" style={{ color: '#adff44', marginBottom: '16px' }} />
            <p style={{ fontSize: '1.2rem', color: '#ccc' }}>{statusText}</p>
          </div>
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#ff6b6b' }}>
            <AlertCircle size={48} style={{ marginBottom: '16px' }} />
            <p style={{ fontSize: '1.2rem' }}>{error}</p>
            <button 
              onClick={() => fetchRecommendations(true)}
              style={{ marginTop: '20px', padding: '8px 16px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Try Again
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Player Area */}
            <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
                {currentVideo && (
                  <iframe
                    src={`https://www.youtube.com/embed/${currentVideo.video_id}?autoplay=1`}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={currentVideo.title}
                  />
                )}
              </div>
              {currentVideo && (
                <div style={{ marginTop: '16px' }}>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{currentVideo.title}</h2>
                  <p style={{ color: '#aaa', fontSize: '0.9rem' }}>{currentVideo.channel} • {currentVideo.duration}</p>
                </div>
              )}
            </div>

            {/* Recommendations Sidebar */}
            <div style={{ width: '350px', borderLeft: '1px solid #333', overflowY: 'auto', padding: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #333' }}>
                Related Videos
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {videos.filter(v => v.video_id !== currentVideo?.video_id).map((video) => (
                  <div 
                    key={video.video_id}
                    onClick={() => setCurrentVideo(video)}
                    style={{ display: 'flex', gap: '12px', cursor: 'pointer', transition: 'background 0.2s', padding: '8px', borderRadius: '8px' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#222'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ position: 'relative', width: '120px', flexShrink: 0 }}>
                      <img 
                        src={video.thumbnail} 
                        alt={video.title} 
                        style={{ width: '100%', borderRadius: '4px', aspectRatio: '16/9', objectFit: 'cover' }}
                      />
                      <div style={{ position: 'absolute', bottom: '4px', right: '4px', backgroundColor: 'rgba(0,0,0,0.8)', padding: '2px 4px', borderRadius: '2px', fontSize: '0.7rem' }}>
                        {video.duration}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                      <h4 style={{ fontSize: '0.9rem', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {video.title}
                      </h4>
                      <span style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '4px' }}>{video.channel}</span>
                      <span style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px' }}>Match Score: {Math.round(video.score)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
