import { useCallback, useEffect, useState, type ComponentType } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw, Plug, ListTree, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { describeFunctionInvokeError } from "@/lib/edgeFunctionErrors";
import type { SettingStatus, SettingsForm, SettingsStatus } from "./adminSettingsTypes";

type ModelRow = { id: string; label: string; pricing?: { prompt: string | null; completion: string | null } | null };

type UsageStats = {
  days: number;
  requests: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  by_provider: Record<string, { requests: number; tokens: number; cost: number }>;
};

type ConnState = "idle" | "loading" | "ok" | "error";

const providers = [
  { id: "openrouter", label: "OpenRouter" },
  { id: "anthropic", label: "Anthropic" },
  { id: "openai", label: "OpenAI" },
] as const;

type Props = {
  status: SettingsStatus;
  form: SettingsForm;
  set: (key: keyof SettingsForm) => (value: string) => void;
  SecretInput: ComponentType<{ id: string; value: string; placeholder?: string; onChange: (v: string) => void }>;
  ConfiguredBadge: ComponentType<{ status?: SettingStatus }>;
  onSaveAi: () => void;
  saving: boolean;
};

export function AdminAiSettingsPanel({
  status,
  form,
  set,
  SecretInput,
  ConfiguredBadge,
  onSaveAi,
  saving,
}: Props) {
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [modelsOr, setModelsOr] = useState<ModelRow[]>([]);
  const [modelsAn, setModelsAn] = useState<ModelRow[]>([]);
  const [modelsOa, setModelsOa] = useState<ModelRow[]>([]);
  const [loadingModels, setLoadingModels] = useState<string | null>(null);
  const [conn, setConn] = useState<Record<string, ConnState>>({
    openrouter: "idle",
    anthropic: "idle",
    openai: "idle",
  });

  const loadUsage = useCallback(async () => {
    setUsageLoading(true);
    const { data, error } = await supabase.functions.invoke("ai-admin", {
      body: { action: "usage_stats", days: 30 },
    });
    setUsageLoading(false);
    if (error || data?.error) {
      toast.error(typeof data?.error === "string" ? data.error : describeFunctionInvokeError("ai-admin", error));
      return;
    }
    setUsage(data as UsageStats);
  }, []);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  const fetchModels = async (provider: "openrouter" | "anthropic" | "openai") => {
    setLoadingModels(provider);
    const { data, error } = await supabase.functions.invoke("ai-admin", {
      body: { action: "list_models", provider },
    });
    setLoadingModels(null);
    if (error || data?.error) {
      toast.error(typeof data?.error === "string" ? data.error : describeFunctionInvokeError("ai-admin", error));
      return;
    }
    const list = (data?.models as ModelRow[]) ?? [];
    if (provider === "openrouter") setModelsOr(list);
    if (provider === "anthropic") setModelsAn(list);
    if (provider === "openai") setModelsOa(list);
    toast.success(`${list.length} models loaded`);
  };

  const testConn = async (provider: "openrouter" | "anthropic" | "openai") => {
    setConn((c) => ({ ...c, [provider]: "loading" }));
    const { data, error } = await supabase.functions.invoke("ai-admin", {
      body: { action: "test_connection", provider },
    });
    if (error || data?.error) {
      setConn((c) => ({ ...c, [provider]: "error" }));
      toast.error(typeof data?.error === "string" ? data.error : describeFunctionInvokeError("ai-admin", error));
      return;
    }
    const ok = data?.ok === true;
    setConn((c) => ({ ...c, [provider]: ok ? "ok" : "error" }));
    toast[ok ? "success" : "error"](ok ? `Connected (${data?.modelCount ?? "?"} models)` : (data?.detail ?? "Failed"));
  };

  const activeProvider = form.ai_chat_provider || "openrouter";

  const connBadge = (p: string) => {
    const s = conn[p];
    if (s === "loading") return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />;
    if (s === "ok") return <span className="text-xs text-success font-medium">Live</span>;
    if (s === "error") return <span className="text-xs text-destructive font-medium">Failed</span>;
    return <span className="text-xs text-muted-foreground">Not tested</span>;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Assistant usage (racing chat)
          </CardTitle>
          <CardDescription>
            Totals from audit log for the last window. Costs are estimates when the provider does not return native usage
            cost (see each request in Analytics → audit).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {usageLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading stats…
            </div>
          ) : usage ? (
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border border-border p-4 bg-muted/20">
                <div className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Requests ({usage.days}d)</div>
                <div className="text-2xl font-mono-data text-foreground">{usage.requests}</div>
              </div>
              <div className="rounded-lg border border-border p-4 bg-muted/20">
                <div className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Est. cost (USD)</div>
                <div className="text-2xl font-mono-data text-foreground">
                  {usage.estimated_cost_usd < 0.0001 && usage.requests > 0
                    ? "<0.0001"
                    : usage.estimated_cost_usd.toFixed(4)}
                </div>
              </div>
              <div className="rounded-lg border border-border p-4 bg-muted/20 sm:col-span-2">
                <div className="text-muted-foreground text-xs uppercase tracking-wide mb-2">Tokens</div>
                <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono-data text-foreground">
                  <span>Prompt: {usage.total_prompt_tokens.toLocaleString()}</span>
                  <span>Completion: {usage.total_completion_tokens.toLocaleString()}</span>
                  <span>Total: {usage.total_tokens.toLocaleString()}</span>
                </div>
                {Object.keys(usage.by_provider).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground space-y-1">
                    {Object.entries(usage.by_provider).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4">
                        <span className="capitalize">{k}</span>
                        <span>
                          {v.requests} req · {v.tokens.toLocaleString()} tok · ~${v.cost.toFixed(4)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No usage data.</p>
          )}
          <Button type="button" variant="outline" size="sm" onClick={loadUsage} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh usage
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Active provider</CardTitle>
          <CardDescription>
            The racing assistant uses this provider for all logged-in users. Configure keys below, then pick a model (load
            from API or type manually).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Chat provider</Label>
            <Select value={activeProvider} onValueChange={set("ai_chat_provider")}>
              <SelectTrigger className="bg-muted border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* OpenRouter */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="text-foreground">OpenRouter</CardTitle>
            <CardDescription>Unified API; recommended default. Models include pricing metadata for cost hints.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {connBadge("openrouter")}
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => testConn("openrouter")}>
              <Plug className="h-3.5 w-3.5" />
              Test
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1"
              disabled={loadingModels === "openrouter"}
              onClick={() => fetchModels("openrouter")}
            >
              {loadingModels === "openrouter" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ListTree className="h-3.5 w-3.5" />}
              Load models
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="ai-or-key">API key</Label>
              <ConfiguredBadge status={status.openrouter_api_key} />
            </div>
            <SecretInput id="ai-or-key" value={form.openrouter_api_key} placeholder="sk-or-v1-…" onChange={set("openrouter_api_key")} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Model</Label>
              <ConfiguredBadge status={status.openrouter_model} />
            </div>
            {modelsOr.length > 0 ? (
              <Select value={form.openrouter_model || modelsOr[0]?.id} onValueChange={set("openrouter_model")}>
                <SelectTrigger className="bg-muted border-border font-mono text-sm">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent className="max-h-[280px]">
                  {modelsOr.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="font-mono text-xs">
                      {m.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                className="font-mono text-sm bg-muted border-border"
                placeholder="Model id (e.g. openai/gpt-4o-mini) or load models"
                value={form.openrouter_model}
                onChange={(e) => set("openrouter_model")(e.target.value)}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Anthropic */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="text-foreground">Anthropic</CardTitle>
            <CardDescription>Direct Claude API (messages).</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {connBadge("anthropic")}
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => testConn("anthropic")}>
              <Plug className="h-3.5 w-3.5" />
              Test
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1"
              disabled={loadingModels === "anthropic"}
              onClick={() => fetchModels("anthropic")}
            >
              {loadingModels === "anthropic" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ListTree className="h-3.5 w-3.5" />}
              Load models
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="ai-an-key">API key</Label>
              <ConfiguredBadge status={status.anthropic_api_key} />
            </div>
            <SecretInput id="ai-an-key" value={form.anthropic_api_key} placeholder="sk-ant-…" onChange={set("anthropic_api_key")} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Model</Label>
              <ConfiguredBadge status={status.anthropic_model} />
            </div>
            {modelsAn.length > 0 ? (
              <Select value={form.anthropic_model || modelsAn[0]?.id} onValueChange={set("anthropic_model")}>
                <SelectTrigger className="bg-muted border-border font-mono text-sm">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent className="max-h-[280px]">
                  {modelsAn.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="font-mono text-xs">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                className="font-mono text-sm bg-muted border-border"
                placeholder="Model id or load models"
                value={form.anthropic_model}
                onChange={(e) => set("anthropic_model")(e.target.value)}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* OpenAI */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="text-foreground">OpenAI</CardTitle>
            <CardDescription>Direct OpenAI Chat Completions.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {connBadge("openai")}
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => testConn("openai")}>
              <Plug className="h-3.5 w-3.5" />
              Test
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1"
              disabled={loadingModels === "openai"}
              onClick={() => fetchModels("openai")}
            >
              {loadingModels === "openai" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ListTree className="h-3.5 w-3.5" />}
              Load models
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="ai-oa-key">API key</Label>
              <ConfiguredBadge status={status.openai_api_key} />
            </div>
            <SecretInput id="ai-oa-key" value={form.openai_api_key} placeholder="sk-…" onChange={set("openai_api_key")} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Model</Label>
              <ConfiguredBadge status={status.openai_model} />
            </div>
            {modelsOa.length > 0 ? (
              <Select value={form.openai_model || modelsOa[0]?.id} onValueChange={set("openai_model")}>
                <SelectTrigger className="bg-muted border-border font-mono text-sm">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent className="max-h-[280px]">
                  {modelsOa.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="font-mono text-xs">
                      {m.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                className="font-mono text-sm bg-muted border-border"
                placeholder="Model id or load models"
                value={form.openai_model}
                onChange={(e) => set("openai_model")(e.target.value)}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="button" onClick={onSaveAi} disabled={saving} className="bg-primary text-primary-foreground font-semibold">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {saving ? "Saving…" : "Save AI settings"}
        </Button>
      </div>
    </div>
  );
}
