import { useCallback, useEffect, useRef } from "react";

export default function ResizeHandle({ onResize, minLeft = 35, maxLeft = 75 }) {
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startRatio = useRef(50);
  const currentRatio = useRef(60);

  const handleMouseDown = useCallback((e) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startRatio.current = currentRatio.current;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      const containerWidth = window.innerWidth;
      const deltaX = e.clientX - startX.current;
      const deltaPercent = (deltaX / containerWidth) * 100;
      let newRatio = startRatio.current + deltaPercent;
      newRatio = Math.max(minLeft, Math.min(maxLeft, newRatio));
      currentRatio.current = newRatio;
      onResize?.(newRatio);
    };

    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onResize, minLeft, maxLeft]);

  return (
    <div
      className="resize-handle"
      onMouseDown={handleMouseDown}
    >
      <div className="resize-handle-line" />
    </div>
  );
}
