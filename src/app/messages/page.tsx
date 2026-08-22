"use client";

import { useState } from "react";
import {
  MessageSquare,
  Send,
  ArrowLeft,
  Search,
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Smile,
  CheckCheck,
  Check,
} from "lucide-react";

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
}

interface ChatMessage {
  id: string;
  sender: "me" | "them";
  text: string;
  time: string;
  read: boolean;
}

const conversations: Conversation[] = [
  {
    id: "c1",
    name: "Sarah from TechCorp",
    avatar: "ST",
    lastMessage: "Thanks for applying! We'd love to schedule an interview.",
    time: "2m",
    unread: 2,
    online: true,
  },
  {
    id: "c2",
    name: "Mike - DataFlow HR",
    avatar: "MD",
    lastMessage: "Your resume looks great. Can you share your portfolio?",
    time: "1h",
    unread: 1,
    online: false,
  },
  {
    id: "c3",
    name: "Creative Studio Team",
    avatar: "CS",
    lastMessage: "We've reviewed your application. Let's discuss next steps.",
    time: "3h",
    unread: 0,
    online: true,
  },
  {
    id: "c4",
    name: "Alex - CloudScale",
    avatar: "AC",
    lastMessage: "The position has been filled. Thank you for your interest.",
    time: "1d",
    unread: 0,
    online: false,
  },
];

const chatHistory: Record<string, ChatMessage[]> = {
  c1: [
    { id: "m1", sender: "them", text: "Hi John, thanks for applying to the Senior Frontend role!", time: "10:30 AM", read: true },
    { id: "m2", sender: "me", text: "Hi Sarah! Thanks for reaching out. I'm very excited about this opportunity.", time: "10:32 AM", read: true },
    { id: "m3", sender: "them", text: "Great to hear! We'd love to schedule an interview. Are you available this week?", time: "10:35 AM", read: true },
    { id: "m4", sender: "them", text: "We can do a 30-minute video call to discuss the role and your experience.", time: "10:36 AM", read: false },
  ],
  c2: [
    { id: "m1", sender: "them", text: "Hello! We received your application for Backend Engineer.", time: "9:00 AM", read: true },
    { id: "m2", sender: "me", text: "Hi Mike, yes I applied yesterday. Looking forward to hearing from you.", time: "9:15 AM", read: true },
    { id: "m3", sender: "them", text: "Your resume looks great. Can you share your portfolio or GitHub?", time: "9:20 AM", read: false },
  ],
};

export default function MessagesPage() {
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(chatHistory);

  const activeConv = conversations.find((c) => c.id === activeChat);
  const activeMessages = activeChat ? messages[activeChat] || [] : [];

  const sendMessage = () => {
    if (!input.trim() || !activeChat) return;
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "me",
      text: input.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      read: false,
    };
    setMessages((prev) => ({
      ...prev,
      [activeChat]: [...(prev[activeChat] || []), newMsg],
    }));
    setInput("");
  };

  if (activeChat) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-0 md:pt-24 md:pb-16 px-0 md:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto h-[calc(100dvh-5rem)] md:h-[calc(100dvh-7rem)] flex flex-col glass md:rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-white/5">
            <button
              onClick={() => setActiveChat(null)}
              className="md:hidden p-2 rounded-lg hover:bg-white/10 text-slate-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                {activeConv?.avatar}
              </div>
              {activeConv?.online && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-800" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-sm truncate">{activeConv?.name}</h3>
              <p className="text-slate-400 text-xs">{activeConv?.online ? "Online" : "Offline"}</p>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                <Phone className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                <Video className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                    msg.sender === "me"
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-br-md"
                      : "bg-white/10 text-slate-200 rounded-bl-md"
                  }`}
                >
                  <p>{msg.text}</p>
                  <div className={`flex items-center gap-1 mt-1 ${msg.sender === "me" ? "justify-end" : ""}`}>
                    <span className={`text-[10px] ${msg.sender === "me" ? "text-white/70" : "text-slate-500"}`}>
                      {msg.time}
                    </span>
                    {msg.sender === "me" && (
                      msg.read ? (
                        <CheckCheck className="w-3 h-3 text-white/70" />
                      ) : (
                        <Check className="w-3 h-3 text-white/50" />
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-white/10 bg-white/5">
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0">
                <Paperclip className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0">
                <Smile className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-500"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Messages</h1>
          <p className="text-slate-400 text-sm">Chat with employers and recruiters</p>
        </div>

        <div className="glass rounded-2xl p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="space-y-2">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveChat(conv.id)}
              className="w-full glass rounded-2xl p-4 flex items-center gap-4 hover:bg-white/[0.03] transition-all text-left"
            >
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                  {conv.avatar}
                </div>
                {conv.online && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-800" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-white font-semibold text-sm truncate">{conv.name}</h3>
                  <span className="text-slate-500 text-xs shrink-0">{conv.time}</span>
                </div>
                <p className="text-slate-400 text-sm truncate mt-0.5">{conv.lastMessage}</p>
              </div>

              {conv.unread > 0 && (
                <span className="w-5 h-5 rounded-full bg-cyan-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  {conv.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
