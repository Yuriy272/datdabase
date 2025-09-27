import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function usePeople() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let mounted = true;

    supabase.from("people").select("*").order("name")
      .then(({ data, error }) => { if (!error && mounted) setRows(data || []); });

    const ch = supabase
      .channel("people-ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "people" },
        (payload) => setRows(prev => applyChange(prev, payload)))
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(ch); };
  }, []);

  const upsert = async (rec) => {
    const { error } = await supabase.from("people").upsert(rec);
    if (error) alert(error.message);
  };

  const remove = async (person_id) => {
    const { error } = await supabase.from("people").delete().eq("person_id", person_id);
    if (error) alert(error.message);
  };

  return { rows, upsert, remove };
}

function applyChange(prev, payload) {
  const r = payload.new || payload.old;
  if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
    const i = prev.findIndex(x => x.person_id === r.person_id);
    if (i >= 0) { const cp=[...prev]; cp[i]=r; return cp; }
    return [r, ...prev];
  }
  if (payload.eventType === "DELETE") return prev.filter(x => x.person_id !== r.person_id);
  return prev;
}
