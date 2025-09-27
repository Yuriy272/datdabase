import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useClients() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let mounted = true;

    supabase.from("clients").select("*").order("company")
      .then(({ data, error }) => { if (!error && mounted) setRows(data || []); });

    const ch = supabase
      .channel("clients-ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" },
        (payload) => setRows(prev => applyChange(prev, payload)))
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(ch); };
  }, []);

  const upsert = async (rec) => {
    const { error } = await supabase.from("clients").upsert(rec);
    if (error) alert(error.message);
  };

  const remove = async (client_id) => {
    const { error } = await supabase.from("clients").delete().eq("client_id", client_id);
    if (error) alert(error.message);
  };

  return { rows, upsert, remove };
}

function applyChange(prev, payload) {
  const r = payload.new || payload.old;
  if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
    const i = prev.findIndex(x => x.client_id === r.client_id);
    if (i >= 0) { const cp=[...prev]; cp[i]=r; return cp; }
    return [r, ...prev];
  }
  if (payload.eventType === "DELETE") return prev.filter(x => x.client_id !== r.client_id);
  return prev;
}
