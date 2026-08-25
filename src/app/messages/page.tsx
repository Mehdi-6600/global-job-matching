"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Send,
  ArrowLeft,
  MessageCircle,
  User,
  Loader2,
  Clock,
} from "lucide-react";

interface Partner {
  id: string;
  name: string | null;
  avatar: string | null;
}

interface MessageItem {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  read: boolean;
  createdAt: string;
  sender: Partner;
  receiver: Partner;
}

interface Conversation {
  partner: Partner;
  lastMessage: MessageItem;
  unreadCount: number;
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function MessagesPage() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  // Check auth + load conversations
  useEffect(() => {
    fetch("/api/profile")
      .then((res) => {
        if (res.status === 401) {
          window.location.href = "/login";
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.profile?.userId) {
          setCurrentUserId(data.profile.userId);
        }
        return fetchConversations();
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchMessages(selectedUserId);
      const interval = setInterval(() => fetchMessages(selectedUserId), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchConversations() {
    try {
      const res = await fetch("/api/messages");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMessages(userId: string) {
    setLoadingMsg(true);
    try {
      const res = await fetch(`/api/messages?with=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMsg(false);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUserId || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: selectedUserId,
          content: newMessage.trim(),
        }),
      });

      if (res.ok) {
        setNewMessage("");
        await fetchMessages(selectedUserId);
        await fetchConversations();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  function selectConversation(userId: string) {
    setSelectedUserId(userId);
    setMobileView("chat");
  }

  function backToList() {
    setMobileView("list");
    setSelectedUserId(null);
  }

  const selectedPartner = conversations.find(
    (c) => c.partner.id === selectedUserId
  )?.partner;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-6xl mx-auto h-screen flex flex-col">
        {/* Header */}
        <div className="glass border-b border-white/10 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {mobileView === "chat" && (
              <button
                onClick={backToList}
                className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-300" />
              </button>
            )}
            <MessageCircle className="w-6 h-6 text-indigo-400" />
            <h1 className="text-xl font-bold text-white">Messages</h1>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Dashboard
          </Link>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Conversations List */}
          <div
            className={`${
              mobileView === "chat" ? "hidden" : "flex"
            } lg:flex w-full lg:w-80 flex-col border-r border-white/10 glass`}
          >
            <div className="p-4 border-b border-white/10">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Conversations
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No messages yet</p>
                  <p className="text-slate-500 text-xs mt-1">
                    Messages from job applications will appear here
                  </p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.partner.id}
                    onClick={() => selectConversation(conv.partner.id)}
                    className={`w-full p-4 flex items-start gap-3 hover:bg-white/5 transition-colors border-b border-white/5 text-left ${
                      selectedUserId === conv.partner.id
                        ? "bg-white/10 border-l-4 border-l-indigo-500"
                        : ""
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                      {conv.partner.avatar ? (
                        <img
                          src={conv.partner.avatar}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-indigo-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-white truncate">
                          {conv.partner.name || "Unknown User"}
                        </h3>
                        <span className="text-xs text-slate-500 shrink-0 ml-2">
                          {formatTime(conv.lastMessage.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 truncate mt-0.5">
                        {conv.lastMessage.senderId === currentUserId
                          ? "You: "
                          : ""}
                        {conv.lastMessage.content}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-medium mt-1">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div
            className={`${
              mobileView === "list" ? "hidden" : "flex"
            } lg:flex flex-1 flex-col`}
          >
            {selectedUserId && selectedPartner ? (
              <>
                {/* Chat Header */}
                <div className="glass border-b border-white/10 px-4 py-3 flex items-center gap-3 shrink-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    {selectedPartner.avatar ? (
                      <img
                        src={selectedPartner.avatar}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-indigo-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-white">
                      {selectedPartner.name || "Unknown User"}
                    </h3>
                    <p className="text-xs text-slate-400">Online</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {loadingMsg ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">
                        Start the conversation
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderId === currentUserId;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${
                            isMe ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                              isMe
                                ? "bg-indigo-600 text-white rounded-br-md"
                                : "glass border border-white/10 text-slate-200 rounded-bl-md"
                            }`}
                          >
                            <p className="text-sm leading-relaxed">
                              {msg.content}
                            </p>
                            <div
                              className={`flex items-center gap-1 mt-1 ${
                                isMe ? "justify-end" : "justify-start"
                              }`}
                            >
                              <span
                                className={`text-[10px] ${
                                  isMe
                                    ? "text-indigo-200"
                                    : "text-slate-500"
                                }`}
                              >
                                {formatTime(msg.createdAt)}
                              </span>
                              {isMe && (
                                <span
                                  className={`text-[10px] ${
                                    msg.read
                                      ? "text-indigo-300"
                                      : "text-indigo-400/60"
                                  }`}
                                >
                                  {msg.read ? "✓✓" : "✓"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form
                  onSubmit={sendMessage}
                  className="glass border-t border-white/10 p-4 flex items-center gap-3 shrink-0"
                >
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all"
                  >
                    {sending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg font-medium">
                    Select a conversation
                  </p>
                  <p className="text-slate-500 text-sm mt-1">
                    Choose someone from the list to start chatting
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
