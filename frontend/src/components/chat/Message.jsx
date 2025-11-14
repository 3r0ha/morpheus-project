import React from 'react';
import { motion } from 'framer-motion';
import { User, Sparkles, Gem } from 'lucide-react'; 
import { Link } from 'react-router-dom'; 

export const Message = ({ role, content, action }) => { 
  const isUser = role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`flex items-start gap-3 w-full ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
          <Sparkles className="text-accent-ai" size={18} />
        </div>
      )}
      <div 
        className={`max-w-[85%] sm:max-w-xl rounded-2xl px-4 py-3 shadow-md
                   ${isUser 
                     ? 'bg-gradient-user text-white rounded-br-none' 
                     : 'bg-surface-2 text-text-primary rounded-bl-none'}`}
      >
        <p className="whitespace-pre-wrap">{content}</p>

        {action === 'subscribe' && (
          <div className="mt-4">
            <Link 
              to="/tariffs"
              className="flex items-center justify-center w-full bg-yellow-500 text-black font-bold py-2 px-4 rounded-lg
                         hover:opacity-90 transition-opacity transform hover:scale-105"
            >
              <Gem size={16} className="mr-2" />
              Оформить Premium
            </Link>
          </div>
        )}

      </div>
       {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
          <User className="text-text-secondary" size={18} />
        </div>
      )}
    </motion.div>
  );
};