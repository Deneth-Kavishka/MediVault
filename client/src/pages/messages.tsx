import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Messages() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");

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

  const chatList = [
    {
      id: "1",
      name: "Dr. Sarah Johnson",
      role: "Cardiologist",
      avatar: null,
      lastMessage: "Please make sure to take your medication regularly",
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      unread: 2,
    },
    {
      id: "2",
      name: "Dr. Michael Chen",
      role: "Neurologist",
      avatar: null,
      lastMessage: "Your test results look good",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      unread: 0,
    },
    {
      id: "3",
      name: "Pharmacy Department",
      role: "MediPharm",
      avatar: null,
      lastMessage: "Your prescription is ready for pickup",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
      unread: 1,
    },
  ];

  const messages = selectedChat
    ? [
        {
          id: "1",
          senderId: "other",
          text: "Hello! How are you feeling today?",
          timestamp: new Date(Date.now() - 1000 * 60 * 60),
        },
        {
          id: "2",
          senderId: "me",
          text: "I'm doing better, thank you. The medication is helping.",
          timestamp: new Date(Date.now() - 1000 * 60 * 45),
        },
        {
          id: "3",
          senderId: "other",
          text: "That's great to hear! Please make sure to take your medication regularly and follow the prescribed dosage.",
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
        },
        {
          id: "4",
          senderId: "me",
          text: "Will do. Thank you, doctor!",
          timestamp: new Date(Date.now() - 1000 * 60 * 20),
        },
      ]
    : [];

  const handleSendMessage = () => {
    if (messageText.trim()) {
      // Handle send message logic
      setMessageText("");
    }
  };

  return (
    <div className="p-6">
      <div className="h-[calc(100vh-8rem)]">
        <Card className="h-full flex flex-col">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-2xl">Messages</CardTitle>
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
                      data-testid="input-search-messages"
                    />
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2">
                    {chatList.map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => setSelectedChat(chat.id)}
                        className={`w-full p-3 rounded-lg text-left hover-elevate transition-all duration-200 ${
                          selectedChat === chat.id ? "bg-accent" : ""
                        }`}
                        data-testid={`button-chat-${chat.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="w-10 h-10 flex-shrink-0">
                            <AvatarImage
                              src={chat.avatar || undefined}
                              alt={chat.name}
                            />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {chat.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="font-medium text-sm text-foreground truncate">
                                {chat.name}
                              </p>
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
                              {formatDistanceToNow(chat.timestamp, {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
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
                          <AvatarImage
                            src={
                              chatList.find((c) => c.id === selectedChat)
                                ?.avatar || undefined
                            }
                          />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {chatList
                              .find((c) => c.id === selectedChat)
                              ?.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">
                            {chatList.find((c) => c.id === selectedChat)?.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {chatList.find((c) => c.id === selectedChat)?.role}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${
                              message.senderId === "me"
                                ? "justify-end"
                                : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                message.senderId === "me"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-foreground"
                              }`}
                            >
                              <p className="text-sm">{message.text}</p>
                              <p
                                className={`text-xs mt-1 ${
                                  message.senderId === "me"
                                    ? "text-primary-foreground/70"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {formatDistanceToNow(message.timestamp, {
                                  addSuffix: true,
                                })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    {/* Message Input */}
                    <div className="p-4 border-t border-border">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type your message..."
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          onKeyPress={(e) =>
                            e.key === "Enter" && handleSendMessage()
                          }
                          data-testid="input-message"
                        />
                        <Button
                          onClick={handleSendMessage}
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
