'use client';

import React, { useEffect, useRef } from 'react';
import { FiSend } from 'react-icons/fi';
import { FcAssistant } from 'react-icons/fc';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  messages: Message[];
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, input, onInputChange, onSend, isLoading }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="bg-white rounded-lg h-full flex flex-col shadow-sm border border-gray-200">
      <div className="p-4 border-b">
         <h2 className="text-lg font-bold text-gray-800">AI와의 대화</h2>
      </div>
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
             {message.role === 'assistant' && <FcAssistant className="w-8 h-8" />}
             <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${ message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800' }`}>
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex items-start gap-3 justify-start">
                 <FcAssistant className="w-8 h-8" />
                 <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl bg-gray-100 text-gray-800">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t flex items-center">
        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyPress}
          className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder={"메시지를 입력하세요..."}
          disabled={isLoading}
          rows={1}
        />
        <button
          onClick={onSend}
          className="ml-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 flex items-center justify-center"
          disabled={isLoading || !input.trim()}
        >
          <FiSend />
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;
