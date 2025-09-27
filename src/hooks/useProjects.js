import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { applyChange } from "./_helpers";

export function useProjects() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    let m = true;
    supabase.from("projects").select("*").order("name")
      .then(({ data, error }) => { if (!error && m) setRows(data || []); });
    const ch = supabase.channel("projects-ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" },
        (p) => setRows(prev => applyChange(prev, p, "project_id")))
      .subscribe();
    return () => { m = false; supabase.removeChannel(ch); };
  }, []);
  const upsert = async (rec) => { const { error } = await supabase.from("projects").upsert(rec); if (error) throw error; };
  const remove = async (id) => { const { error } = await supabase.from("projects").delete().eq("project_id", id); if (error) throw error; };
  return { rows, upsert, remove };
}
