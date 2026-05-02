import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invoiceListKeys } from "@/lib/queryKeys";
import { getInvokeErrorMessage } from "@/lib/edgeFunctionErrors";

export type InvoiceRow = {
  id: string;
  number: string | null;
  amount: number;
  currency: string;
  status: string | null;
  created: number;
  description: string;
  pdf_url: string | null;
  hosted_url: string | null;
};

export async function fetchInvoiceList(): Promise<InvoiceRow[]> {
  const { data, error, response: invokeResponse } = await supabase.functions.invoke("list-invoices");
  if (error) {
    const description = await getInvokeErrorMessage("list-invoices", error, data, invokeResponse);
    throw new Error(description);
  }
  return (data?.invoices as InvoiceRow[] | undefined) ?? [];
}

const STALE_MS = 60_000;
const GC_MS = 15 * 60_000;

export function useInvoiceList(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? invoiceListKeys.list(userId) : [...invoiceListKeys.all, "list", "signed-out"],
    queryFn: fetchInvoiceList,
    enabled: !!userId,
    staleTime: STALE_MS,
    gcTime: GC_MS,
    refetchOnWindowFocus: "always",
  });
}
