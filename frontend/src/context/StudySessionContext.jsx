import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "./AuthContext";

const HEARTBEAT_MS = 30000;
const IDLE_MS = 60000;
const EXPIRE_MS = 90000;

const StudySessionContext = createContext(null);

export function StudySessionProvider({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isInactive, setIsInactive] = useState(false);

  const sessionIdRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const lastHeartbeatSuccessRef = useRef(Date.now());
  const sessionParamsRef = useRef({ type: "", subject: "", chapter: "" });
  const endingRef = useRef(false);

  const endSession = useCallback(async () => {
    const id = sessionIdRef.current;
    if (!id || endingRef.current) return;

    endingRef.current = true;
    sessionIdRef.current = null;
    setCurrentSessionId(null);

    try {
      await api.post(`/study-sessions/${id}/end`);
    } catch (err) {
      console.error("Failed to end study session:", err);
    } finally {
      endingRef.current = false;
    }
  }, []);

  const sendHeartbeat = useCallback(async () => {
    const id = sessionIdRef.current;
    if (!id) return;

    try {
      await api.post(`/study-sessions/${id}/heartbeat`);
      lastHeartbeatSuccessRef.current = Date.now();
    } catch (err) {
      if (err.response?.status === 410 || err.response?.status === 404) {
        const { type, subject, chapter } = sessionParamsRef.current;
        if (type) {
          const response = await api.post("/study-sessions/start", {
            session_type: type,
            subject: subject || null,
            chapter: chapter ? String(chapter) : null,
          });
          const session = response.data;
          setCurrentSessionId(session.id);
          sessionIdRef.current = session.id;
          lastHeartbeatSuccessRef.current = Date.now();
          await api.post(`/study-sessions/${session.id}/heartbeat`);
        }
      } else {
        console.error("Heartbeat error:", err);
      }
    }
  }, []);

  const startSession = useCallback(
    async (type, subject, chapter) => {
      if (user?.role !== "student") return;

      if (sessionIdRef.current) {
        await endSession();
      }

      try {
        const response = await api.post("/study-sessions/start", {
          session_type: type,
          subject: subject || null,
          chapter: chapter ? String(chapter) : null,
        });

        const session = response.data;
        setCurrentSessionId(session.id);
        sessionIdRef.current = session.id;
        lastHeartbeatSuccessRef.current = Date.now();
        sessionParamsRef.current = { type, subject, chapter };
        setIsInactive(false);
        lastActivityRef.current = Date.now();

        await api.post(`/study-sessions/${session.id}/heartbeat`);
      } catch (err) {
        console.error("Failed to start study session:", err);
      }
    },
    [user?.role, endSession]
  );

  useEffect(() => {
    if (user?.role !== "student") return undefined;

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity));
    };
  }, [user?.role]);

  useEffect(() => {
    if (user?.role !== "student") return undefined;

    const checkState = () => {
      const isHidden = document.hidden || document.visibilityState !== "visible";
      const idleTime = Date.now() - lastActivityRef.current;
      const isIdle = idleTime >= IDLE_MS;
      const nextInactive = isHidden || isIdle;

      setIsInactive((prev) => {
        if (prev && !nextInactive && sessionIdRef.current) {
          const timeSinceHeartbeat = Date.now() - lastHeartbeatSuccessRef.current;
          if (timeSinceHeartbeat > EXPIRE_MS) {
            const { type, subject, chapter } = sessionParamsRef.current;
            if (type) startSession(type, subject, chapter);
          } else {
            sendHeartbeat();
          }
        }
        return nextInactive;
      });
    };

    const interval = setInterval(checkState, 1000);
    document.addEventListener("visibilitychange", checkState);
    window.addEventListener("blur", checkState);
    window.addEventListener("focus", checkState);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", checkState);
      window.removeEventListener("blur", checkState);
      window.removeEventListener("focus", checkState);
    };
  }, [user?.role, startSession, sendHeartbeat]);

  useEffect(() => {
    if (user?.role !== "student" || !currentSessionId || isInactive) return undefined;

    sendHeartbeat();
    const timer = setInterval(sendHeartbeat, HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [user?.role, currentSessionId, isInactive, sendHeartbeat]);

  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    if (prevPathRef.current !== location.pathname && sessionIdRef.current) {
      endSession();
    }
    prevPathRef.current = location.pathname;
  }, [location.pathname, endSession]);

  useEffect(() => {
    const handleUnload = () => {
      const id = sessionIdRef.current;
      if (!id) return;

      const token = localStorage.getItem("accessToken");
      const baseURL = api.defaults.baseURL || "http://localhost:8000/api";
      fetch(`${baseURL}/study-sessions/${id}/end`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        keepalive: true,
      }).catch(() => {});
    };

    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, []);

  return (
    <StudySessionContext.Provider
      value={{
        currentSessionId,
        isInactive,
        startSession,
        endSession,
      }}
    >
      {children}
    </StudySessionContext.Provider>
  );
}

export const useStudySession = () => useContext(StudySessionContext);
