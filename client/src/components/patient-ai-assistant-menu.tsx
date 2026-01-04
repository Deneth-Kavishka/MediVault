import { useEffect, useMemo, useRef, useState } from "react";
import { Headset, Send } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const CONSENT_KEY = "mv_ai_patient_medical_records_access";

export function PatientAiAssistantMenu() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const isPatient = user?.role === "patient";

  const [consent, setConsent] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !isPatient) return;
    try {
      const raw = localStorage.getItem(CONSENT_KEY);
      if (raw === "true") setConsent(true);
      else if (raw === "false") setConsent(false);
      else setConsent(null);
    } catch {
      setConsent(null);
    }
  }, [isAuthenticated, isPatient]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const canSend = useMemo(() => {
    return !!draft.trim() && !loading && consent !== null;
  }, [draft, loading, consent]);

  if (!isAuthenticated || !isPatient) return null;

  const persistConsent = (value: boolean) => {
    setConsent(value);
    try {
      localStorage.setItem(CONSENT_KEY, String(value));
    } catch {
      // ignore
    }
  };

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text) return;

    if (consent === null) {
      toast({
        title: "Permission required",
        description: "Please choose whether to allow medical record access.",
        variant: "destructive",
      });
      return;
    }

    setDraft("");
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    try {
      const res = await apiRequest("POST", "/api/ai/patient-assistant", {
        message: text,
        allowMedicalRecords: consent,
      });
      const data = (await res.json()) as { answer?: string };
      const answer = String(data?.answer || "").trim();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: answer || "Sorry, I couldn't generate a response.",
        },
      ]);
    } catch (err: any) {
      const msg = err?.message || "Failed to contact AI assistant";
      toast({
        title: "AI Assistant error",
        description: msg,
        variant: "destructive",
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I couldn't generate a response right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          aria-label="AI assistant"
          className="h-auto px-2 py-1"
        >
          <span className="flex flex-col items-center leading-none">
            <Headset className="h-5 w-5" />
            <span className="mt-1 text-[10px] text-muted-foreground">
              AI Assistant
            </span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[420px] p-0">
        <div className="p-3">
          <DropdownMenuLabel className="p-0">AI Assistant</DropdownMenuLabel>
          <div className="text-xs text-muted-foreground mt-1">
            Health tips, routines, exercise ideas, and doctor suggestions.
          </div>
        </div>

        <DropdownMenuSeparator />

        {consent === null ? (
          <div className="p-3 space-y-2">
            <div className="text-sm font-medium">
              Allow access to your medical records?
            </div>
            <div className="text-xs text-muted-foreground">
              If you allow access, answers can be more personalized. If not, you
              will receive general guidance.
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => persistConsent(true)}>
                Allow
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => persistConsent(false)}
              >
                Not now
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-3 py-2">
            <div className="text-xs text-muted-foreground">
              Medical record access: {consent ? "Allowed" : "Not allowed"}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="px-0 h-auto text-xs"
              onClick={() => {
                // Let the user change their mind.
                persistConsent(!consent);
              }}
            >
              {consent ? "Disable" : "Enable"}
            </Button>
          </div>
        )}

        <DropdownMenuSeparator />

        <div className="px-3 pb-3">
          <div
            ref={scrollRef}
            className="max-h-[260px] overflow-auto rounded-md border bg-background p-2 space-y-2"
          >
            {messages.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                Ask something like: “Create a simple daily routine for me”,
                “Suggest exercises for my condition”, or “Help me find a doctor
                for …”.
              </div>
            ) : (
              messages.map((m, idx) => (
                <div
                  key={idx}
                  className={
                    m.role === "user"
                      ? "text-sm rounded-md bg-muted px-2 py-1"
                      : "text-sm rounded-md bg-primary/5 px-2 py-1"
                  }
                >
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {m.role === "user" ? "You" : "Assistant"}
                  </div>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              ))
            )}
            {loading ? (
              <div className="text-xs text-muted-foreground">Thinking…</div>
            ) : null}
          </div>

          <div className="mt-2 flex gap-2 items-end">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type your question…"
              className="min-h-[70px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  if (canSend) void sendMessage();
                }
              }}
            />
            <Button
              size="icon"
              onClick={() => void sendMessage()}
              disabled={!canSend}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Tip: press Ctrl+Enter to send.
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
