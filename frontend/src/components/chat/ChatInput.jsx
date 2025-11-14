import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Square } from 'lucide-react';

export const ChatInput = ({ onSendMessage, isLoading }) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim() && !isLoading) {
      onSendMessage(text);
      setText('');
    }
  };
  
  const handleVoiceInput = () => {
    // TODO: Добавить логику записи голоса
    setIsRecording(!isRecording);
    console.log("Voice recording toggled");
  };

  return (
    <div className="px-4 sm:px-6 pb-6 pt-4 bg-background">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-3 bg-surface-2 p-2 rounded-2xl border border-border-color transition-all
                   focus-within:border-accent-ai focus-within:ring-2 focus-within:ring-accent-ai/30"
      >
        <button type="button" onClick={handleVoiceInput} className="p-2 text-text-secondary hover:text-accent-ai transition-colors rounded-full">
          {isRecording 
            ? <Square size={24} className="text-red-500 animate-pulse" /> 
            : <Mic size={24} />
          }
        </button>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Опишите ваш сон или задайте вопрос..."
          disabled={isLoading}
          rows={1}
          className="flex-1 bg-transparent resize-none outline-none text-text-primary placeholder:text-text-secondary max-h-48 py-2"
        />
        <button
          type="submit"
          disabled={!text.trim() || isLoading}
          className="p-2 rounded-full bg-accent-ai text-white transition-opacity
                     disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:opacity-90"
        >
          <Send size={24} />
        </button>
      </form>
    </div>
  );
};