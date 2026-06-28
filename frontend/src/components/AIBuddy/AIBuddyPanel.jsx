import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { useAIBuddy } from '../../context/AIBuddyContext';

const MessageBubble = ({ message }) => {
  const isAi = message.role === 'assistant';
  
  return (
    <div className={`flex w-full mb-4 ${isAi ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex max-w-[85%] ${isAi ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isAi ? 'bg-indigo-100 text-indigo-600 mr-2' : 'bg-blue-100 text-blue-600 ml-2'}`}>
          {isAi ? <Bot size={16} /> : <User size={16} />}
        </div>
        <div className={`px-4 py-2 rounded-2xl ${isAi ? 'bg-gray-100 text-gray-800 rounded-tl-none' : 'bg-indigo-600 text-white rounded-tr-none'}`}>
          {/* Extremely basic markdown rendering for prototype */}
          <div className="whitespace-pre-wrap text-sm leading-relaxed" dangerouslySetInnerHTML={{ 
            __html: message.content
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.*?)\*/g, '<em>$1</em>')
              .replace(/\[Executing action: (.*?)\]/g, '<span class="text-xs text-indigo-500 font-mono bg-indigo-50 px-1 rounded">Action: $1</span>')
          }} />
        </div>
      </div>
    </div>
  );
};

export const AIBuddyPanel = () => {
  const { isOpen, toggleBuddy, messages, sendMessage, isTyping } = useAIBuddy();
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isTyping) {
      sendMessage(input);
      setInput('');
    }
  };

  const suggestions = [
    "Continue my studies",
    "Show my weak topics",
    "Generate revision notes"
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`bg-white shadow-2xl rounded-2xl overflow-hidden border border-gray-100 flex flex-col mb-4 ${isExpanded ? 'w-[80vw] h-[80vh] max-w-4xl' : 'w-96 h-[500px]'}`}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="bg-white/20 p-2 rounded-full">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="font-semibold leading-tight">AI Buddy</h3>
                  <p className="text-xs text-indigo-100">Platform Operating System</p>
                </div>
              </div>
              <div className="flex space-x-1">
                <button 
                  onClick={() => setIsExpanded(!isExpanded)} 
                  className="p-1.5 hover:bg-white/20 rounded-md transition-colors"
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button 
                  onClick={toggleBuddy} 
                  className="p-1.5 hover:bg-white/20 rounded-md transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50">
              {messages.map((msg, idx) => (
                <MessageBubble key={idx} message={msg} />
              ))}
              
              {isTyping && (
                <div className="flex w-full mb-4 justify-start">
                  <div className="flex max-w-[85%] flex-row">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-indigo-100 text-indigo-600 mr-2">
                      <Bot size={16} />
                    </div>
                    <div className="px-4 py-3 rounded-2xl bg-gray-100 text-gray-500 rounded-tl-none flex space-x-1">
                       <motion.div className="w-1.5 h-1.5 bg-gray-400 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} />
                       <motion.div className="w-1.5 h-1.5 bg-gray-400 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
                       <motion.div className="w-1.5 h-1.5 bg-gray-400 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            {messages.length < 3 && !isTyping && (
              <div className="px-4 pb-2 flex flex-wrap gap-2">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(suggestion)}
                    className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full transition-colors border border-indigo-100 whitespace-nowrap"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
              <form onSubmit={handleSubmit} className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me to navigate, explain, or generate..."
                  className="w-full bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded-full py-3 pl-4 pr-12 outline-none transition-all text-sm"
                  disabled={isTyping}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="absolute right-2 p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                >
                  <Send size={14} className="ml-0.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleBuddy}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-colors ${
          isOpen ? 'bg-gray-800 hover:bg-gray-900' : 'bg-gradient-to-tr from-indigo-600 to-violet-500 hover:from-indigo-700 hover:to-violet-600'
        }`}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </motion.button>
    </div>
  );
};

export default AIBuddyPanel;
