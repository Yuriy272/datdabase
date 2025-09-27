import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { applyChange } from "./_helpers";

export function useAssignments() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    let m = true;
    supabase.from("assignments").select("*")
      .then(({ data, error }) => { if (!error && m) setRows(data || []); });
    const ch = supabase.channel("assignments-ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "assignments" },
        (p) => setRows(prev => applyChange(prev, p, "assignment_id")))
      .subscribe();
    return () => { m = false; supabase.removeChannel(ch); };
  }, []);
  const upsert = async (rec) => { const { error } = await supabase.from("assignments").upsert(rec); if (error) throw error; };
  const remove = async (id) => { const { error } = await supabase.from("assignments").delete().eq("assignment_id", id); if (error) throw error; };
  return { rows, upsert, remove };
}
