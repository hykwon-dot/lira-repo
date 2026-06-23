"use client";

import { useState, useEffect } from "react";
import { Users, UserX, Loader2, MessageSquare, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type MemberChat = {
  id: number;
  userId: number;
  title: string;
  status: string;
  createdAt: string;
  user: { id: number; email: string; name: string | null };
  messages: Array<{ id: number; role: string; content: string; createdAt: string }>;
};

type GuestChat = {
  sessionId: string;
  guestId: string;
  caseType: string | null;
  startedAt: string;
  startPayload: any;
  messages: Array<{ id: number; userText: string; aiText: string; createdAt: string }>;
};

export default function ChatsPage() {
  const [activeTab, setActiveTab] = useState<"members" | "guests">("members");
  
  const [membersLoading, setMembersLoading] = useState(true);
  const [memberChats, setMemberChats] = useState<MemberChat[]>([]);
  const [selectedMemberChatId, setSelectedMemberChatId] = useState<number | null>(null);

  const [guestsLoading, setGuestsLoading] = useState(true);
  const [guestChats, setGuestChats] = useState<GuestChat[]>([]);
  const [selectedGuestSessionId, setSelectedGuestSessionId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/chats/members")
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setMemberChats(res.data);
          if (res.data.length > 0) setSelectedMemberChatId(res.data[0].id);
        }
      })
      .finally(() => setMembersLoading(false));

    fetch("/api/chats/guests")
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setGuestChats(res.data);
          if (res.data.length > 0) setSelectedGuestSessionId(res.data[0].sessionId);
        }
      })
      .finally(() => setGuestsLoading(false));
  }, []);

  const selectedMemberChat = memberChats.find(c => c.id === selectedMemberChatId);
  const selectedGuestChat = guestChats.find(c => c.sessionId === selectedGuestSessionId);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">상담 모니터링</h1>
          <p className="text-slate-500 text-sm mt-1">사용자들의 실시간 상담 내역을 조회합니다.</p>
        </div>
        
        <div className="flex bg-slate-200 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("members")}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === "members" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Users className="w-4 h-4" />
            회원 상담
          </button>
          <button
            onClick={() => setActiveTab("guests")}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === "guests" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <UserX className="w-4 h-4" />
            비회원 상담
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-200">
        {/* Left Panel: List */}
        <div className="w-1/3 border-r border-slate-200 flex flex-col bg-slate-50/50">
          <div className="p-4 border-b border-slate-200 bg-white">
            <h2 className="font-semibold text-slate-900">대화 세션 목록</h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {activeTab === "members" ? (
              membersLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
              ) : memberChats.length === 0 ? (
                <div className="text-center p-8 text-slate-500 text-sm">대화 내역이 없습니다.</div>
              ) : (
                memberChats.map(chat => (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedMemberChatId(chat.id)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border transition-all",
                      selectedMemberChatId === chat.id 
                        ? "bg-indigo-50 border-indigo-200 shadow-sm" 
                        : "bg-white border-slate-200 hover:border-indigo-300"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-slate-900 line-clamp-1 flex-1 pr-2">{chat.title}</span>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {new Date(chat.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium">
                        {chat.user.name?.[0] || chat.user.email[0].toUpperCase()}
                      </div>
                      <span className="truncate">{chat.user.name || chat.user.email}</span>
                    </div>
                  </button>
                ))
              )
            ) : (
              guestsLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
              ) : guestChats.length === 0 ? (
                <div className="text-center p-8 text-slate-500 text-sm">대화 내역이 없습니다.</div>
              ) : (
                guestChats.map(chat => (
                  <button
                    key={chat.sessionId}
                    onClick={() => setSelectedGuestSessionId(chat.sessionId)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border transition-all",
                      selectedGuestSessionId === chat.sessionId 
                        ? "bg-indigo-50 border-indigo-200 shadow-sm" 
                        : "bg-white border-slate-200 hover:border-indigo-300"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-slate-900 line-clamp-1 flex-1 pr-2">
                        {chat.caseType || "사건유형 미선택"}
                      </span>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {new Date(chat.startedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <UserX className="w-4 h-4" />
                      <span className="truncate text-xs">비회원 ({chat.guestId.substring(0, 8)})</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                      <MessageSquare className="w-3 h-3" />
                      {chat.messages.length}개 메시지
                    </div>
                  </button>
                ))
              )
            )}
          </div>
        </div>

        {/* Right Panel: Detail */}
        <div className="flex-1 flex flex-col bg-white">
          {activeTab === "members" ? (
            selectedMemberChat ? (
              <>
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-bold text-lg text-slate-900">{selectedMemberChat.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock className="w-4 h-4" />
                    {new Date(selectedMemberChat.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50">
                  {selectedMemberChat.messages.length === 0 ? (
                    <div className="flex items-center gap-2 justify-center h-full text-slate-500">
                      <AlertCircle className="w-5 h-5" /> 메시지가 없습니다.
                    </div>
                  ) : (
                    selectedMemberChat.messages.map(msg => (
                      <div key={msg.id} className={cn("flex w-full", msg.role === "USER" ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-[70%] rounded-2xl p-4 shadow-sm",
                          msg.role === "USER" 
                            ? "bg-indigo-600 text-white rounded-tr-none" 
                            : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
                        )}>
                          <p className="text-sm font-semibold mb-1 opacity-80">
                            {msg.role === "USER" ? (selectedMemberChat.user.name || "회원") : "LIRA AI"}
                          </p>
                          <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{msg.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">대화를 선택해주세요.</div>
            )
          ) : (
            selectedGuestChat ? (
              <>
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-bold text-lg text-slate-900">{selectedGuestChat.caseType || "비회원 대화 세션"}</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock className="w-4 h-4" />
                    {new Date(selectedGuestChat.startedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50">
                  {selectedGuestChat.startPayload && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm mb-6">
                      <h4 className="text-amber-800 font-bold mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> 초기 유입 데이터
                      </h4>
                      <pre className="text-sm text-amber-900 whitespace-pre-wrap font-sans">
                        {JSON.stringify(selectedGuestChat.startPayload, null, 2)}
                      </pre>
                    </div>
                  )}
                  {selectedGuestChat.messages.length === 0 && !selectedGuestChat.startPayload ? (
                    <div className="flex items-center gap-2 justify-center h-full text-slate-500">
                      <AlertCircle className="w-5 h-5" /> 메시지가 없습니다.
                    </div>
                  ) : (
                    selectedGuestChat.messages.map(msg => (
                      <div key={msg.id} className="space-y-6">
                        {msg.userText && (
                          <div className="flex w-full justify-end">
                            <div className="max-w-[70%] rounded-2xl p-4 shadow-sm bg-indigo-600 text-white rounded-tr-none">
                              <p className="text-sm font-semibold mb-1 opacity-80">비회원</p>
                              <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{msg.userText}</p>
                            </div>
                          </div>
                        )}
                        {msg.aiText && (
                          <div className="flex w-full justify-start">
                            <div className="max-w-[70%] rounded-2xl p-4 shadow-sm bg-white text-slate-800 border border-slate-200 rounded-tl-none">
                              <p className="text-sm font-semibold mb-1 opacity-80">LIRA AI</p>
                              <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{msg.aiText}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">대화를 선택해주세요.</div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
