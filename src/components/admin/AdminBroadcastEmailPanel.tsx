import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Send, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type SendResult = { sent: number; failed: number; total: number };

export function AdminBroadcastEmailPanel() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("send-broadcast-email", {
          body: { action: "preview" },
        });
        if (!cancelled) {
          if (error || data?.error) {
            setRecipientCount(null);
          } else {
            setRecipientCount(data.count ?? 0);
          }
        }
      } catch {
        if (!cancelled) setRecipientCount(null);
      } finally {
        if (!cancelled) setLoadingCount(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("send-broadcast-email", {
        body: { action: "send", subject: subject.trim(), text_body: body.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const res: SendResult = { sent: data.sent, failed: data.failed, total: data.total };
      setResult(res);
      if (res.failed === 0) {
        toast.success(`Sent to ${res.sent} user${res.sent !== 1 ? "s" : ""}`);
      } else {
        toast.warning(`Sent ${res.sent}/${res.total} — ${res.failed} failed`);
      }
      setSubject("");
      setBody("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send broadcast");
    } finally {
      setSending(false);
    }
  };

  const canSend = subject.trim().length > 0 && body.trim().length > 0 && !sending;

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Send className="h-5 w-5" />
            Broadcast Email
          </CardTitle>
          <CardDescription>
            Send a plain-text email to all confirmed users. Uses your configured SMTP settings.
            Emails are sent sequentially — large lists may take a minute.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recipient count */}
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
            {loadingCount ? (
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Counting recipients…
              </span>
            ) : recipientCount === null ? (
              <span className="text-muted-foreground">Could not determine recipient count</span>
            ) : (
              <span>
                <strong className="text-foreground">{recipientCount.toLocaleString()}</strong>{" "}
                <span className="text-muted-foreground">confirmed user{recipientCount !== 1 ? "s" : ""} will receive this email</span>
              </span>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="broadcast-subject">Subject</Label>
            <Input
              id="broadcast-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Important update from DATAEEL"
              maxLength={998}
              disabled={sending}
            />
            <p className="text-xs text-muted-foreground text-right">{subject.length}/998</p>
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label htmlFor="broadcast-body">Message</Label>
            <Textarea
              id="broadcast-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message here…"
              rows={10}
              disabled={sending}
              className="font-mono text-sm resize-y"
            />
          </div>

          {/* Send button with confirmation dialog */}
          <div className="flex justify-end pt-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={!canSend}
                  className="bg-primary text-primary-foreground font-semibold gap-2"
                >
                  {sending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                  ) : (
                    <><Send className="h-4 w-4" /> Send to all users</>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Send broadcast email?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will send <strong>&ldquo;{subject}&rdquo;</strong> to{" "}
                    {recipientCount !== null ? (
                      <strong>{recipientCount.toLocaleString()} user{recipientCount !== 1 ? "s" : ""}</strong>
                    ) : (
                      "all confirmed users"
                    )}
                    . This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSend}>
                    Send now
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Result banner */}
      {result && (
        <Card className={`border ${result.failed === 0 ? "border-green-500/30 bg-green-500/5" : "border-yellow-500/30 bg-yellow-500/5"}`}>
          <CardContent className="pt-4 flex items-start gap-3">
            {result.failed === 0 ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
            )}
            <div className="text-sm">
              <p className="font-medium text-foreground">
                {result.failed === 0
                  ? `Successfully sent to ${result.sent.toLocaleString()} user${result.sent !== 1 ? "s" : ""}`
                  : `Sent ${result.sent.toLocaleString()} of ${result.total.toLocaleString()} — ${result.failed} failed`}
              </p>
              {result.failed > 0 && (
                <p className="text-muted-foreground mt-0.5">
                  Some deliveries failed. Check your SMTP logs for details.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
