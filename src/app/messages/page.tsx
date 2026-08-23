"use client";

import { useState, useRef, useEffect } from "react";
import {
  Search,
  Send,
  Phone,
  MoreVertical,
  Check,
  CheckCheck,
  Clock,
  Paperclip,
  Smile,
  ArrowLeft,
} from "lucide-react";

interface Message {
  id: string;
  senderId: string;
  text: string;
  time: string;
  status: "sent" | "delivered" | "read";
}

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  online: boolean;
  messages: Message[];
}

const initialConversations: Conversation[] = [
  {
    id: "c1",
    name: "Sarah from TechCorp",
    avatar: "ST",
    lastMessage: "Great! Looking forward to your interview tomorrow.",
    lastTime: "2m",
    unread: 2,
    online: true,
    messages: [
      { id: "m1", senderId: "them", text: "Hi John, thanks for applying!", time: "10:00 AM", status: "read" },
      { id: "m2", senderId: "me", text: "Thank you for the opportunity!", time: "10:05 AM", status: "read" },
      { id: "m3", senderId: "them", text: "We would like to schedule an interview. Are you available tomorrow at 2 PM?", time: "10:30 AM", status: "read" },
      { id: "m4", senderId: "me", text: "Yes, that works perfectly for me.", time: "10:35 AM", status: "read" },
      { id: "m5", senderId: "them", text: "Great! Looking forward to your interview tomorrow.", time: "10:36 AM", status: "read" },
    ],
  },
  {
    id: "c2",
    name: "Mike - CloudScale",
    avatar: "MC",
    lastMessage: "Your application has been reviewed.",
    lastTime: "1h",
    unread: 0,
    online: false,
    messages: [
      { id: "m1", senderId: "them", text: "Hello, we received your application.", time: "Yesterday", status: "read" },
      { id: "m2", senderId: "me", text: "Thanks for letting me know!", time: "Yesterday", status: "read" },
      { id: "m3", senderId: "them", text: "Your application has been reviewed.", time: "1h ago", status: "read" },
    ],
  },
  {
    id: "c3",
    name: "Creative Studio HR",
    avatar: "CS",
    lastMessage: "Can you share your portfolio link?",
    lastTime: "3h",
    unread: 1,
    online: true,
    messages: [
      { id: "m1", senderId: "me", text: "Hi, I applied for the Product Designer role.", time: "Yesterday", status: "read" },
      { id: "m2", senderId: "them", text: "Can you share your portfolio link?", time: "3h ago", status: "read" },
    ],
  },
  {
    id: "c4",
    name: "DataFlow Team",
    avatar: "DF",
    lastMessage: "Thanks for your interest.",
    lastTime: "1d",
    unread: 0,
    online: false,
    messages: [
      { id: "m1", senderId: "them", text: "Thank you for applying to DataFlow.", time: "2d ago", status: "read" },
      { id: "m2", senderId: "them", text: "Thanks for your interest.", time: "1d ago", status: "read" },
    ],
  },
  {
    id: "c5",
    name: "NextGen Labs",
    avatar: "NG",
    lastMessage: "Congratulations! You are hired.",
    lastTime: "2d",
    unread: 0,
    online: false,
    messages: [
      { id: "m1", senderId: "them", text: "We are impressed with your profile.", time: "3d ago", status: "read" },
      { id: "m2", senderId: "them", text: "Congratulations! You are hired.", time: "2d ago", status: "read" },
      { id: "m3", senderId: "me", text: "Thank you so much! I am excited to join.", time: "2d ago", status: "read" },
    ],
  },
];

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>("c1");
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find((c) => c.id === activeId);

  const filtered = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(search.toLowerCase())
  );

  const sendMessage = () => {
    if (!input.trim() || !activeId) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      senderId: "me",
      text: input.trim(),
      time: "Just now",
      status: "sent",
    };
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? {
              ...c,
              messages: [...c.messages, newMsg],
              lastMessage: input.trim(),
              lastTime: "Just now",
            }
          : c
      )
    );
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages.length]);

  const openChat = (id: string) => {
    setActiveId(id);
    setMobileChatOpen(true);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c))
    );
  };

  const goBack = () => {
    setMobileChatOpen(false);
    setActiveId(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto h-[calc(100vh-7rem)]">
        <div className="glass rounded-2xl h-full flex overflow-hidden border border-white/5">
          {/* Sidebar */}
          <div
            className={`w-full md:w-80 shrink-0 flex flex-col border-r border-white/5 ${
              mobileChatOpen ? "hidden md:flex" : "flex"
            }`}
          >
            {/* Header */}
            <div className="p-4 border-b border-white/5">
              <h2 className="text-white font-bold text-lg mb-3">Messages</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {filtered.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => openChat(conv.id)}
                  className={`w-full flex items-center gap-3 p-4 text-left transition-all border-b border-white/5 hover:bg-white/[0.02] ${
                    activeId === conv.id ? "bg-cyan-500/5" : ""
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
                      <span className="text-cyan-400 font-bold text-xs">{conv.avatar}</span>
                    </div>
                    {conv.online && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-800" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-white text-sm font-medium truncate">{conv.name}</h3>
                      <span className="text-[10px] text-slate-500 shrink-0">{conv.lastTime}</span>
                    </div>
                    <p className="text-slate-400 text-xs truncate mt-0.5">{conv.lastMessage}</p>
                  </div>
                  {conv.unread > 0 && (
                    <span className="w-5 h-5 rounded-full bg-cyan-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {conv.unread}
                    </span>
                  )}
                </button>
              ))}

              {filtered.length === 0 && (
                <div className="text-center py-12">
                  <Search className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-500 text-xs">No conversations found.</p>
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div
            className={`flex-1 flex flex-col ${
              mobileChatOpen ? "flex" : "hidden md:flex"
            }`}
          >
            {activeConv ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={goBack}
                      className="md:hidden p-2 rounded-lg bg-white/5 text-slate-400 mr-1"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
                        <span className="text-cyan-400 font-bold text-xs">{activeConv.avatar}</span>
                      </div>
                      {activeConv.online && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-800" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-white text-sm font-medium">{activeConv.name}</h3>
                      <p className="text-[10px] text-slate-400">
                        {activeConv.online ? "Online" : "Offline"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-colors">
                      <Phone className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {activeConv.messages.map((msg) => {
                    const isMe = msg.senderId === "me";
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                            isMe
                              ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-br-md"
                              : "glass text-slate-200 rounded-bl-md border border-white/5"
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{msg.text}</p>
                          <div
                            className={`flex items-center justify-end gap-1 mt-1 ${
                              isMe ? "text-white/60" : "text-slate-500"
                            }`}
                          >
                            <span className="text-[10px]">{msg.time}</span>
                            {isMe && (
                              <>
                                {msg.status === "read" ? (
                                  <CheckCheck className="w-3 h-3" />
                                ) : msg.status === "delivered" ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <Clock className="w-3 h-3" />
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-colors">
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-500"
                      />
                      <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Smile className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={sendMessage}
                      disabled={!input.trim()}
                      className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center mb-4">
                  <Send className="w-7 h-7 text-cyan-400" />
                </div>
                <h3 className="text-white font-semibold mb-1">Select a conversation</h3>
                <p className="text-slate-400 text-sm">Choose a contact to start messaging</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
