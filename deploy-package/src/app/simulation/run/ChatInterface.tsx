"use client";

import React, { useState } from 'react';

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, { sender: 'user', text: input }]);
      // TODO: Add AI response logic here
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex-grow p-6 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`px-4 py-2 rounded-lg max-w-lg ${msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'}`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="p-4 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            className="flex-grow bg-gray-700 text-white rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="메시지를 입력하세요..."
          />
          <button onClick={handleSend} className="ml-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full">
            전송
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
