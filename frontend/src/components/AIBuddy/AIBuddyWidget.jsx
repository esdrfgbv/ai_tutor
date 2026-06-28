import React from 'react';
import { motion } from 'framer-motion';
import { Bot, PlayCircle, Brain, BookOpen, Clock } from 'lucide-react';
import { useAIBuddy } from '../../context/AIBuddyContext';
import { useNavigate } from 'react-router-dom';

export const AIBuddyWidget = ({ studentName = "Student", recommendedTopic = "Fractions", estimatedTime = "12 minutes" }) => {
  const { openBuddy, sendMessage } = useAIBuddy();
  const navigate = useNavigate();

  const handleAction = (action) => {
    switch(action) {
      case 'continue':
        sendMessage("I want to continue my studies");
        openBuddy();
        break;
      case 'quiz':
        sendMessage("Generate a quick quiz for " + recommendedTopic);
        openBuddy();
        break;
      case 'video':
        sendMessage("Show me a video lesson for " + recommendedTopic);
        openBuddy();
        break;
      case 'ask':
        openBuddy();
        break;
      default:
        break;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100 p-6 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-6"
    >
      <div className="flex items-start space-x-4 flex-1">
        <div className="bg-gradient-to-tr from-indigo-600 to-violet-500 w-16 h-16 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-md">
          <Bot size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Good Morning, {studentName} <span className="inline-block animate-wave">👋</span>
          </h2>
          <p className="text-gray-600 mt-1">
            I recommend we continue working on <span className="font-semibold text-indigo-700">{recommendedTopic}</span> today.
          </p>
          <div className="flex items-center space-x-2 mt-2 text-sm text-gray-500 font-medium">
            <Clock size={16} />
            <span>Estimated focus time: {estimatedTime}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 md:justify-end w-full md:w-auto">
        <button 
          onClick={() => handleAction('continue')}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
        >
          <PlayCircle size={18} />
          <span>Continue Learning</span>
        </button>
        
        <button 
          onClick={() => handleAction('quiz')}
          className="flex items-center space-x-2 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 px-5 py-2.5 rounded-xl font-medium transition-colors"
        >
          <Brain size={18} />
          <span>Quick Quiz</span>
        </button>
        
        <button 
          onClick={() => handleAction('video')}
          className="flex items-center space-x-2 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 px-5 py-2.5 rounded-xl font-medium transition-colors hidden sm:flex"
        >
          <BookOpen size={18} />
          <span>Watch Video</span>
        </button>
        
        <button 
          onClick={() => handleAction('ask')}
          className="flex items-center space-x-2 bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
        >
          <Bot size={18} />
          <span>Ask AI Buddy</span>
        </button>
      </div>
    </motion.div>
  );
};

export default AIBuddyWidget;
