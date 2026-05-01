import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getInvokeErrorMessage } from "@/lib/edgeFunctionErrors";
import { RACING_ASSISTANT_MAX_HISTORY, RACING_ASSISTANT_MAX_MESSAGE_CHARS } from "@/lib/racingAssistantLimits";
import { cn } from "@/lib/utils";

type Role = "user" | "assistant";

type Msg = { role: Role; content: string };

export function DataeelAiAssistant() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUsageMeta, setLastUsageMeta] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, lastUsageMeta]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || !user) return;
    if (text.length > RACING_ASSISTANT_MAX_MESSAGE_CHARS) {
      setError(`Message too long (max ${RACING_ASSISTANT_MAX_MESSAGE_CHARS} characters).`);
      return;
    }
    setError(null);
    setInput("");
    const historyPayload = messages
      .slice(-RACING_ASSISTANT_MAX_HISTORY)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    const { data, error: fnError } = await supabase.functions.invoke("racing-assistant", {
      body: {
        message: text,
        history: historyPayload,
      },
    });

    setLoading(false);

    const serverError =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error?: unknown }).error === "string" &&
      (data as { error: string }).error.trim().length > 0;

    if (fnError || serverError) {
      const msg = await getInvokeErrorMessage("racing-assistant", fnError, data);
      setError(msg);
      const bubble =
        msg.length > 480 ? `${msg.slice(0, 477).trim()}…` : msg;
      setMessages((prev) => [...prev, { role: "assistant", content: bubble }]);
      return;
    }

    const reply = typeof data?.reply === "string" ? data.reply : "";
    if (reply) {
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    }

    const u = data?.usage as
      | {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
          estimated_cost_usd?: number;
        }
      | undefined;
    const prov = typeof data?.provider === "string" ? data.provider : "";
    const model = typeof data?.model === "string" ? data.model : "";
    const fromCache =
      data &&
      typeof data === "object" &&
      (data as { cached?: boolean }).cached === true;
    if (fromCache && prov === "cache") {
      setLastUsageMeta("Saved answer (repeated question) · $0 · 0 tok");
    } else if (u && prov) {
      const cost = typeof u.estimated_cost_usd === "number" ? u.estimated_cost_usd : 0;
      const tok =
        u.total_tokens ?? (u.prompt_tokens ?? 0) + (u.completion_tokens ?? 0);
      setLastUsageMeta(
        `${prov}${model ? ` · ${model}` : ""} · ~$${cost.toFixed(4)} · ${tok} tok`,
      );
    } else {
      setLastUsageMeta(null);
    }
  }, [input, loading, user, messages]);

  if (!user || pathname.startsWith("/auth")) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-2 pointer-events-none">
      <div
        className={cn(
          "pointer-events-auto flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden transition-all duration-200 origin-bottom-right min-h-0",
          open ? "w-[min(100vw-2rem,380px)] h-[min(70vh,480px)] opacity-100" : "w-0 h-0 opacity-0 overflow-hidden",
        )}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">DATAEEL assistant</p>
              <p className="text-[10px] text-muted-foreground truncate">Racing &amp; betting basics · short answers</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => setOpen(false)} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4">
          <div className="py-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ask about odds vocabulary, win/place/show, exotics at a high level, or how to read a race — not for picks
                or guarantees.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={`${i}-${m.content.slice(0, 12)}`}
                className={cn(
                  "text-sm rounded-xl px-3 py-2 max-w-[95%] whitespace-pre-wrap",
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "mr-auto bg-muted text-foreground border border-border",
                )}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Thinking…
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        {error && <p className="text-[11px] text-destructive px-4 pb-1">{error}</p>}
        {lastUsageMeta && (
          <p className="text-[10px] text-muted-foreground px-4 pb-1 font-mono truncate" title={lastUsageMeta}>
            {lastUsageMeta}
          </p>
        )}

        <div className="p-3 border-t border-border bg-card space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. What is an exacta?"
            className="min-h-[72px] max-h-[120px] text-sm bg-muted border-border resize-none"
            maxLength={RACING_ASSISTANT_MAX_MESSAGE_CHARS}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground">
              {input.length}/{RACING_ASSISTANT_MAX_MESSAGE_CHARS}
            </span>
            <Button size="sm" className="gap-1" onClick={send} disabled={loading || !input.trim()}>
              <Send className="h-3.5 w-3.5" />
              Send
            </Button>
          </div>
        </div>
      </div>

      <Button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "pointer-events-auto h-14 w-14 rounded-full shadow-xl border-2 border-primary/30 bg-primary text-primary-foreground hover:brightness-110 p-0",
          open && "ring-2 ring-offset-2 ring-offset-background ring-primary",
        )}
        aria-expanded={open}
        aria-label={open ? "Close DATAEEL assistant" : "Open DATAEEL assistant"}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>
    </div>
  );
}
