import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const AIBuddyContext = createContext();

export const useAIBuddy = () => useContext(AIBuddyContext);

export const AIBuddyProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm AI Buddy. I can help you navigate, explain concepts, and track your progress. How can I help you today?"
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [pageContext, setPageContext] = useState({});
  
  const location = useLocation();
  const navigate = useNavigate();
  
  // Track location changes to update context automatically
  useEffect(() => {
    setPageContext(prev => ({
      ...prev,
      pathname: location.pathname,
      search: location.search
    }));
  }, [location]);

  // Expose a way for other components (like PDFViewer) to inject context
  const injectContext = (key, value) => {
    setPageContext(prev => ({ ...prev, [key]: value }));
  };

  const toggleBuddy = () => setIsOpen(!isOpen);
  const openBuddy = () => setIsOpen(true);
  const closeBuddy = () => setIsOpen(false);

  const sendMessage = async (text) => {
    if (!text.trim()) return;

    // Add user message immediately
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const token = localStorage.getItem('token');
      // Using fetch for SSE/StreamingResponse simulation
      const response = await fetch('http://localhost:8000/api/ai-buddy/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: text,
          page_payload: pageContext
        })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      let assistantMsg = { role: 'assistant', content: '' };
      setMessages(prev => [...prev, assistantMsg]); // Add empty placeholder

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunkStr = decoder.decode(value, { stream: true });
        // The backend sends lines starting with "data: "
        const lines = chunkStr.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'text') {
                assistantMsg.content += data.content;
                // Update the last message in state
                setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1] = { ...assistantMsg };
                  return newMsgs;
                });
              } else if (data.type === 'tool_call') {
                // Execute client side effects of the tool
                if (data.result.action === 'navigate') {
                  const pathMap = {
                    'dashboard': '/student',
                    'analytics': '/student/analytics',
                    'chapters': '/student/chapters',
                    'leaderboard': '/student/leaderboard',
                    'chapter_detail': `/student/chapters/${data.result.params?.subject || 'maths'}/${data.result.params?.chapter_number || 1}`
                  };
                  if (pathMap[data.result.page]) {
                    navigate(pathMap[data.result.page]);
                  }
                }
                
                // Show a temporary system message about the tool execution
                assistantMsg.content += `\n*[Executing action: ${data.tool}...]*\n`;
                setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1] = { ...assistantMsg };
                  return newMsgs;
                });
              }
            } catch (e) {
              console.error("Error parsing SSE data", e, line);
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <AIBuddyContext.Provider value={{
      isOpen,
      toggleBuddy,
      openBuddy,
      closeBuddy,
      messages,
      sendMessage,
      isTyping,
      injectContext,
      pageContext
    }}>
      {children}
    </AIBuddyContext.Provider>
  );
};
