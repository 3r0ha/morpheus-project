import React, { useState } from 'react';
import { Header } from '@/components/app/Header';
import { Sidebar } from '@/components/app/Sidebar';
import { ChatWindow } from '@/components/app/ChatWindow';
import { useChat } from '@/hooks/useChat';

export const AppPage = () => {
  const [activeChatId, setActiveChatId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const chatLogic = useChat(activeChatId, setActiveChatId);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="h-screen w-screen flex flex-col font-body bg-background text-text-primary">
      <Header onToggleSidebar={toggleSidebar} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onNewChat={() => {
            chatLogic.startNewChat();
            setActiveChatId(null);
            setIsSidebarOpen(false);
          }}
          activeChatId={activeChatId}
          setActiveChatId={(id) => {
            setActiveChatId(id);
            setIsSidebarOpen(false);
          }}
        />
        <main className="flex-1 flex flex-col">
          <ChatWindow
            chatLogic={chatLogic}
          />
        </main>
      </div>

      {isSidebarOpen && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
        />
      )}
    </div>
  );
};