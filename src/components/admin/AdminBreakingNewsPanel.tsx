import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, PlusCircle, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TickerItem {
  id: string;
  text: string;
  active: boolean;
  sort_order: number;
  created_at: string;
}

export const AdminBreakingNewsPanel = () => {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkText, setBulkText] = useState("");
  const [adding, setAdding] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("breaking_news_items")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      setItems(data ?? []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load ticker items");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleAddBulk = async () => {
    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      toast.error("Enter at least one ticker item");
      return;
    }

    setAdding(true);
    try {
      const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) : -1;
      const rows = lines.map((text, idx) => ({
        text,
        active: true,
        sort_order: maxOrder + 1 + idx,
      }));
      const { error } = await supabase.from("breaking_news_items").insert(rows);
      if (error) throw error;
      toast.success(`Added ${lines.length} ticker item${lines.length > 1 ? "s" : ""}`);
      setBulkText("");
      fetchItems();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add items");
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (item: TickerItem) => {
    setTogglingId(item.id);
    try {
      const { error } = await supabase
        .from("breaking_news_items")
        .update({ active: !item.active })
        .eq("id", item.id);
      if (error) throw error;
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, active: !i.active } : i))
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update item");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("breaking_news_items").delete().eq("id", id);
      if (error) throw error;
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Item deleted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete item");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("Delete ALL ticker items? This cannot be undone.")) return;
    try {
      const { error } = await supabase
        .from("breaking_news_items")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all rows
      if (error) throw error;
      setItems([]);
      toast.success("All items deleted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete all items");
    }
  };

  return (
    <div className="space-y-6">
      {/* Add new items */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Add Ticker Items</CardTitle>
          <CardDescription>
            Paste one item per line. Each line becomes a separate ticker entry. All new items are active by default.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bulk-news">Items (one per line)</Label>
            <Textarea
              id="bulk-news"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`Aptitude algorithm picks Winner in race#1, race#3; Churchill Downs May8, 2026\nConcert algorithm hits PICK 3 in race#8; Churchill Downs May8, 2026`}
              rows={8}
              className="font-mono text-sm resize-y"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleAddBulk} disabled={adding || bulkText.trim().length === 0}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlusCircle className="h-4 w-4 mr-2" />}
              {adding ? "Adding…" : "Add Items"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current items list */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Current Ticker Items</CardTitle>
              <CardDescription>
                {loading ? "Loading…" : `${items.length} item${items.length !== 1 ? "s" : ""} · ${items.filter((i) => i.active).length} active`}
              </CardDescription>
            </div>
            {items.length > 0 && (
              <Button variant="destructive" size="sm" onClick={handleDeleteAll}>
                Delete All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No ticker items yet. Add some above.
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className={`flex items-start gap-3 rounded-md border p-3 text-sm transition-colors ${
                    item.active ? "border-border bg-muted/20" : "border-border/50 bg-muted/5 opacity-60"
                  }`}
                >
                  <span className="flex-1 font-mono leading-snug break-all">{item.text}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title={item.active ? "Hide" : "Show"}
                      onClick={() => handleToggle(item)}
                      disabled={togglingId === item.id}
                    >
                      {togglingId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : item.active ? (
                        <Eye className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      title="Delete"
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                    >
                      {deletingId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
