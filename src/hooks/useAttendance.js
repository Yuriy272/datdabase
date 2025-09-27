import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { applyChange } from "./_helpers";

export function useAttendance() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    let m = true;
    supabase.from("attendance").select("*").order("date", { ascending: false })
      .then(({ data, error }) => { if (!error && m) setRows(data || []); });
    const ch = supabase.channel("attendance-ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" },
        (p) => setRows(prev => applyChange(prev, p, "id")))
      .subscribe();
    return () => { m = false; supabase.removeChannel(ch); };
  }, []);
  const upsert = async (rec) => { const { error } = await supabase.from("attendance").upsert(rec); if (error) throw error; };
  const remove = async (id) => { const { error } = await supabase.from("attendance").delete().eq("id", id); if (error) throw error; };
  return { rows, upsert, remove };
}
