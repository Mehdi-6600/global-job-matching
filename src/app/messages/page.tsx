"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Send,
  Loader2,
  ArrowLeft,
  Search,
  CheckCheck,
  Check,
  User,
} from "lucide-react";

interface ConversationUser {
  id: string;
  name: string | null;
  avatar: string | null;
  title: string | null;
}

interface Conversation {
  user: ConversationUser;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
}

interface MessageItem {
  id: string;
  content: string;
  read: boolean;
  createdAt: string;
  senderId: string;
  sender: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return "now";
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<ConversationUser | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.id);
      const interval = setInterval(() => fetchMessages(selectedUser.id), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConversations = () => {
    fetch("/api/messages")
      .then((res) => res.json())
      .then((data) => {
        if (data.conversations) {
          setConversations(data.conversations);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const fetchMessages = (userId: string) => {
    fetch(`/api/messages?with=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.messages) {
          setMessages(data.messages);
        }
      })
      .catch(() => {});
  };

  const sendMessage = async () => {
    if (!selectedUser || !newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: selectedUser.id, content: newMessage }),
      });
      const data = await res.json();
      if (data.success) {
        setNewMessage("");
        fetchMessages(selectedUser.id);
        fetchConversations();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading messages...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-[calc(100vh-6rem)]">
        <div className="glass rounded-3xl overflow-hidden h-full flex flex-col md:flex-row">
          {/* Conversations List */}
          <div
            className={`w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r border-white/10 flex flex-col ${
              mobileChatOpen ? "hidden md:flex" : "flex"
            }`}
          >
            <div className="p-4 border-b border-white/10">
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-cyan-400" />
                Messages
              </h1>
            </div>

            {conversations.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8 text-center">
                <div>
                  <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No conversations yet</p>
                  <p className="text-slate-500 text-xs mt-1">
                    Start messaging from a job or company page
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {conversations.map((conv) => (
                  <button
                    key={conv.user.id}
                    onClick={() => {
                      setSelectedUser(conv.user);
                      setMobileChatOpen(true);
                    }}
                    className={`w-full flex items-center gap-3 p-4 text-left transition-all hover:bg-white/5 ${
                      selectedUser?.id === conv.user.id ? "bg-white/5 border-l-2 border-cyan-500" : ""
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {getInitials(conv.user.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-white text-sm font-medium truncate">
                          {conv.user.name || "Unknown"}
                        </h3>
                        <span className="text-[10px] text-slate-500">{timeAgo(conv.lastMessageAt)}</span>
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
              </div>
            )}
          </div>

          {/* Chat Area */}
          <div
            className={`flex-1 flex flex-col ${
              mobileChatOpen ? "flex" : "hidden md:flex"
            }`}
          >
            {selectedUser ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-white/10 flex items-center gap-3">
                  <button
                    onClick={() => setMobileChatOpen(false)}
                    className="md:hidden p-1.5 rounded-lg bg-white/5 text-slate-400"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                    {getInitials(selectedUser.name)}
                  </div>
                  <div>
                    <h3 className="text-white text-sm font-medium">{selectedUser.name || "Unknown"}</h3>
                    <p className="text-slate-500 text-xs">{selectedUser.title || "User"}</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center">
                      <div>
                        <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">No messages yet</p>
                        <p className="text-slate-500 text-xs">Send a message to start the conversation</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderId !== selectedUser.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                              isMe
                                ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-br-md"
                                : "bg-white/5 text-slate-300 rounded-bl-md"
                            }`}
                          >
                            <p>{msg.content}</p>
                            <div
                              className={`flex items-center gap-1 mt-1 ${
                                isMe ? "text-white/60" : "text-slate-500"
                              }`}
                            >
                              <span className="text-[10px]">{timeAgo(msg.createdAt)}</span>
                              {isMe &&
                                (msg.read ? (
                                  <CheckCheck className="w-3 h-3" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                ))}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-500"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sending || !newMessage.trim()}
                      className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white transition-all disabled:opacity-50"
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-white font-medium mb-1">Select a conversation</p>
                  <p className="text-slate-400 text-sm">
                    Choose a conversation from the list to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
