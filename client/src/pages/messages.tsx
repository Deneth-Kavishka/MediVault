import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Search, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/api";

// Smart timestamp formatter - takes reference time to recalculate on updates
const formatTimestamp = (
  dateString: string,
  referenceTime: Date = new Date()
) => {
  if (!dateString) return "Unknown";

  const date = new Date(dateString);

  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.error("Invalid date:", dateString);
    return "Invalid date";
  }

  const diffMs = referenceTime.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  console.log(
    `⏰ Timestamp: ${dateString.substring(0, 19)}, Diff: ${diffMins} mins`
  );

  // Just now (less than 1 minute)
  if (diffMins < 1) return "Just now";

  // 1-10 minutes: show "X min ago"
  if (diffMins >= 1 && diffMins <= 10) return `${diffMins} min ago`;

  // After 10 minutes: show full date and time
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() !== referenceTime.getFullYear()
        ? "numeric"
        : undefined,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

// Check if message can be edited (within 15 minutes)
const canEditMessage = (createdAt: string): boolean => {
  const diffMs = new Date().getTime() - new Date(createdAt).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  return diffMins <= 15;
};

// Check if message can be deleted (within 30 minutes)
const canDeleteMessage = (createdAt: string): boolean => {
  const diffMs = new Date().getTime() - new Date(createdAt).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  return diffMins <= 30;
};

interface Conversation {
  id: string;
  name: string;
  role: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  role: string;
  username: string;
}

export default function Messages() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessageDialog, setNewMessageDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [newMessageText, setNewMessageText] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Update current time every 10 seconds to refresh timestamps
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      console.log("⏰ Timestamp refresh triggered");
    }, 10000); // Update every 10 seconds

    return () => clearInterval(timer);
  }, []);

  // Fetch conversations list
  const { data: conversations = [], isLoading: conversationsLoading } =
    useQuery<Conversation[]>({
      queryKey: ["conversations"],
      queryFn: async () => {
        const response = await apiRequest<Conversation[]>("/api/conversations");
        console.log("📋 Conversations loaded:", response);
        return response;
      },
      enabled: isAuthenticated,
      refetchInterval: 5000, // Refetch every 5 seconds
    });

  // Fetch available users for new messages
  const {
    data: availableUsers = [],
    isLoading: usersLoading,
    error: usersError,
  } = useQuery<User[]>({
    queryKey: ["available-users"],
    queryFn: async () => {
      const response = await apiRequest<User[]>("/api/users/available");
      console.log("Available users loaded:", response);
      return response;
    },
    enabled: isAuthenticated,
  });

  // Fetch messages for selected chat
  const { data: messages = [], isLoading: messagesLoading } = useQuery<
    Message[]
  >({
    queryKey: ["messages", selectedChat],
    queryFn: async () => {
      if (!selectedChat) return [];
      const response = await apiRequest<Message[]>(
        `/api/messages/${selectedChat}`
      );
      console.log(
        "📨 Messages received:",
        response.map((m) => ({
          id: m.id.substring(0, 8),
          createdAt: m.createdAt,
          message: m.message.substring(0, 20),
        }))
      );
      return response;
    },
    refetchInterval: 3000, // Refetch every 3 seconds for real-time updates
    enabled: !!selectedChat && isAuthenticated,
  });

  // Mark messages as read when viewing conversation
  const markAsReadMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest(`/api/messages/${userId}/read`, {
        method: "PATCH",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { receiverId: string; message: string }) => {
      return await apiRequest<Message>("/api/messages", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: (newMessage) => {
      queryClient.invalidateQueries({ queryKey: ["messages", selectedChat] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setMessageText("");

      // Send via WebSocket for real-time delivery
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "message",
            data: newMessage,
          })
        );
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return await apiRequest(`/api/messages/${messageId}`, {
        method: "DELETE",
      });
    },
    onSuccess: (_, messageId) => {
      queryClient.invalidateQueries({ queryKey: ["messages", selectedChat] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });

      // Broadcast delete via WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "message_deleted",
            data: { messageId, chatId: selectedChat },
          })
        );
      }

      toast({
        title: "Success",
        description: "Message deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    },
  });

  // Edit message mutation
  const editMessageMutation = useMutation({
    mutationFn: async (data: { messageId: string; message: string }) => {
      return await apiRequest(`/api/messages/${data.messageId}`, {
        method: "PATCH",
        body: JSON.stringify({ message: data.message }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages", selectedChat] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });

      // Broadcast edit via WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "message_edited",
            data: {
              messageId: variables.messageId,
              message: variables.message,
              chatId: selectedChat,
            },
          })
        );
      }

      setEditingMessage(null);
      setEditText("");
      toast({
        title: "Success",
        description: "Message updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update message",
        variant: "destructive",
      });
    },
  });

  // Start new conversation mutation
  const startNewConversationMutation = useMutation({
    mutationFn: async (data: { receiverId: string; message: string }) => {
      return await apiRequest<Message>("/api/messages", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: (newMessage) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setNewMessageDialog(false);
      setSelectedUser("");
      setNewMessageText("");
      // Open the new conversation
      setSelectedChat(newMessage.receiverId);
      toast({
        title: "Success",
        description: "Message sent successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    console.log("🔌 Connecting to WebSocket:", wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ WebSocket connected for real-time chat");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📨 WebSocket message received:", data);

        if (data.type === "user_online") {
          // User came online
          const { userId, onlineUsers: onlineUsersList } = data.data;
          console.log(`🟢 User ${userId} is now ONLINE`);
          setOnlineUsers(new Set(onlineUsersList));
        } else if (data.type === "user_offline") {
          // User went offline
          const { userId, onlineUsers: onlineUsersList } = data.data;
          console.log(`⚫ User ${userId} is now OFFLINE`);
          setOnlineUsers(new Set(onlineUsersList));
        } else if (data.type === "message") {
          const message = data.data as Message;

          // Always refresh conversations list to update last message and unread count
          queryClient.invalidateQueries({ queryKey: ["conversations"] });

          // Refresh messages if they involve any active chat
          queryClient.invalidateQueries({
            queryKey: ["messages"],
          });

          console.log("🔄 Refreshed conversations and messages");

          // Show toast notification if message is from someone else
          if (message.senderId !== user.id) {
            toast({
              title: "New Message",
              description:
                message.message.substring(0, 50) +
                (message.message.length > 50 ? "..." : ""),
            });
          }
        } else if (data.type === "message_edited") {
          // Real-time message edit update
          console.log("✏️ Message edited, refreshing...");
          queryClient.invalidateQueries({ queryKey: ["messages"] });
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        } else if (data.type === "message_deleted") {
          // Real-time message delete update
          console.log("🗑️ Message deleted, refreshing...");
          queryClient.invalidateQueries({ queryKey: ["messages"] });
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
      } catch (error) {
        console.error("❌ Error parsing WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("⚠️ WebSocket disconnected");
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [isAuthenticated, user, queryClient, toast]);

  // Mark messages as read when selecting a conversation
  useEffect(() => {
    if (selectedChat) {
      markAsReadMutation.mutate(selectedChat);
    }
  }, [selectedChat]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const handleSendMessage = () => {
    if (messageText.trim() && selectedChat) {
      sendMessageMutation.mutate({
        receiverId: selectedChat,
        message: messageText.trim(),
      });
    }
  };

  const handleStartNewConversation = () => {
    if (selectedUser && newMessageText.trim()) {
      startNewConversationMutation.mutate({
        receiverId: selectedUser,
        message: newMessageText.trim(),
      });
    }
  };

  // Filter conversations by search query
  const filteredConversations = conversations.filter(
    (conv) =>
      conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter available users by search and role
  const filteredUsers = availableUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(userSearchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Get unique roles from available users
  const availableRoles = Array.from(new Set(availableUsers.map((u) => u.role)));

  return (
    <div className="p-6">
      <div className="h-[calc(100vh-8rem)]">
        <Card className="h-full flex flex-col">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Messages</CardTitle>
              <Dialog
                open={newMessageDialog}
                onOpenChange={setNewMessageDialog}
              >
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    New Message
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Start New Conversation</DialogTitle>
                    <DialogDescription>
                      Search for a user and send your first message
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {/* Search and Filter */}
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name, username, or role..."
                          className="pl-9"
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Select
                          value={roleFilter}
                          onValueChange={setRoleFilter}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Roles</SelectItem>
                            {availableRoles.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role.charAt(0).toUpperCase() +
                                  role.slice(1).replace("_", " ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {(userSearchQuery || roleFilter !== "all") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setUserSearchQuery("");
                              setRoleFilter("all");
                            }}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* User Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Select User ({filteredUsers.length}{" "}
                        {filteredUsers.length === 1 ? "user" : "users"})
                      </label>
                      {usersLoading ? (
                        <div className="text-sm text-muted-foreground p-4 text-center border rounded-md">
                          Loading users...
                        </div>
                      ) : usersError ? (
                        <div className="text-sm text-destructive p-4 text-center border border-destructive rounded-md">
                          Error loading users. Please refresh the page.
                        </div>
                      ) : availableUsers.length === 0 ? (
                        <div className="text-sm text-muted-foreground p-4 text-center border rounded-md">
                          No users available. Database may need to be seeded.
                          <br />
                          <code className="bg-muted px-2 py-1 rounded mt-2 inline-block">
                            npm run seed
                          </code>
                        </div>
                      ) : filteredUsers.length === 0 ? (
                        <div className="text-sm text-muted-foreground p-4 text-center border rounded-md">
                          No users match your search.
                        </div>
                      ) : (
                        <ScrollArea className="h-[200px] border rounded-md">
                          <div className="p-2 space-y-1">
                            {filteredUsers.map((user) => (
                              <button
                                key={user.id}
                                onClick={() => setSelectedUser(user.id)}
                                className={`w-full p-3 rounded-lg text-left hover:bg-accent transition-colors ${
                                  selectedUser === user.id
                                    ? "bg-accent border-2 border-primary"
                                    : "border border-transparent"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-8 h-8">
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                      {user.name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">
                                      {user.name}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {user.role.replace("_", " ")}
                                      </Badge>
                                      <p className="text-xs text-muted-foreground truncate">
                                        @{user.username}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </div>

                    {/* Message Input */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Your Message
                      </label>
                      <Input
                        placeholder="Type your first message..."
                        value={newMessageText}
                        onChange={(e) => setNewMessageText(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" &&
                          !startNewConversationMutation.isPending &&
                          handleStartNewConversation()
                        }
                        disabled={!selectedUser}
                      />
                    </div>

                    {/* Send Button */}
                    <Button
                      onClick={handleStartNewConversation}
                      disabled={
                        !selectedUser ||
                        !newMessageText.trim() ||
                        startNewConversationMutation.isPending
                      }
                      className="w-full"
                    >
                      {startNewConversationMutation.isPending
                        ? "Sending..."
                        : "Send Message"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <div className="flex h-full">
              {/* Chat List */}
              <div className="w-80 border-r border-border flex flex-col">
                <div className="p-4 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search conversations..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="input-search-messages"
                    />
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  {conversationsLoading ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Loading conversations...
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      {searchQuery
                        ? "No conversations found"
                        : "No conversations yet"}
                    </div>
                  ) : (
                    <div className="p-2">
                      {filteredConversations.map((chat) => (
                        <button
                          key={chat.id}
                          onClick={() => setSelectedChat(chat.id)}
                          className={`w-full p-3 rounded-lg text-left hover-elevate transition-all duration-200 ${
                            selectedChat === chat.id ? "bg-accent" : ""
                          }`}
                          data-testid={`button-chat-${chat.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="relative">
                              <Avatar className="w-10 h-10 flex-shrink-0">
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {chat.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              {/* Online status indicator */}
                              <div
                                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
                                  onlineUsers.has(chat.id)
                                    ? "bg-green-500"
                                    : "bg-gray-400"
                                }`}
                                title={
                                  onlineUsers.has(chat.id)
                                    ? "Online"
                                    : "Offline"
                                }
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm text-foreground truncate">
                                    {chat.name}
                                  </p>
                                  {onlineUsers.has(chat.id) && (
                                    <span className="text-xs text-green-500">
                                      ●
                                    </span>
                                  )}
                                </div>
                                {chat.unread > 0 && (
                                  <Badge
                                    variant="default"
                                    className="text-xs h-5 px-1.5"
                                  >
                                    {chat.unread}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mb-1">
                                {chat.role}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {chat.lastMessage}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatTimestamp(chat.timestamp, currentTime)}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Chat Window */}
              <div className="flex-1 flex flex-col">
                {selectedChat ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-4 border-b border-border">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {conversations
                              .find((c) => c.id === selectedChat)
                              ?.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">
                            {
                              conversations.find((c) => c.id === selectedChat)
                                ?.name
                            }
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {
                              conversations.find((c) => c.id === selectedChat)
                                ?.role
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4">
                      {messagesLoading ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          Loading messages...
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          No messages yet. Start the conversation!
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {messages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex group ${
                                message.senderId === user?.id
                                  ? "justify-end"
                                  : "justify-start"
                              }`}
                            >
                              <div
                                className={`max-w-[70%] rounded-lg p-3 relative ${
                                  message.senderId === user?.id
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-foreground"
                                }`}
                              >
                                {editingMessage === message.id ? (
                                  <div className="space-y-2">
                                    <Input
                                      value={editText}
                                      onChange={(e) =>
                                        setEditText(e.target.value)
                                      }
                                      className="text-sm"
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          editMessageMutation.mutate({
                                            messageId: message.id,
                                            message: editText,
                                          });
                                        }}
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setEditingMessage(null);
                                          setEditText("");
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-sm">{message.message}</p>
                                    <div className="flex items-center justify-between gap-2 mt-1">
                                      <p
                                        className={`text-xs ${
                                          message.senderId === user?.id
                                            ? "text-primary-foreground/70"
                                            : "text-muted-foreground"
                                        }`}
                                      >
                                        {formatTimestamp(
                                          message.createdAt,
                                          currentTime
                                        )}
                                      </p>
                                      {message.senderId === user?.id && (
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          {canEditMessage(
                                            message.createdAt
                                          ) && (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-6 w-6 p-0"
                                              onClick={() => {
                                                setEditingMessage(message.id);
                                                setEditText(message.message);
                                              }}
                                              title="Edit message (within 15 min)"
                                            >
                                              ✏️
                                            </Button>
                                          )}
                                          {canDeleteMessage(
                                            message.createdAt
                                          ) && (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-6 w-6 p-0"
                                              onClick={() => {
                                                if (
                                                  confirm(
                                                    "Delete this message?"
                                                  )
                                                ) {
                                                  deleteMessageMutation.mutate(
                                                    message.id
                                                  );
                                                }
                                              }}
                                              title="Delete message (within 30 min)"
                                            >
                                              🗑️
                                            </Button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </ScrollArea>

                    {/* Message Input */}
                    <div className="p-4 border-t border-border">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type your message..."
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          onKeyPress={(e) =>
                            e.key === "Enter" &&
                            !sendMessageMutation.isPending &&
                            handleSendMessage()
                          }
                          disabled={sendMessageMutation.isPending}
                          data-testid="input-message"
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={
                            !messageText.trim() || sendMessageMutation.isPending
                          }
                          data-testid="button-send-message"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    Select a conversation to start messaging
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
