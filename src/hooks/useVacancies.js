import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { applyChange } from "./_helpers";

export function useVacancies() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    let m = true;
    supabase.from("vacancies").select("*").order("created_at", { ascending: false })
      .then(({ data, error }) => { if (!error && m) setRows(data || []); });
    const ch = supabase.channel("vacancies-ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "vacancies" },
        (p) => setRows(prev => applyChange(prev, p, "vacancy_id")))
      .subscribe();
    return () => { m = false; supabase.removeChannel(ch); };
  }, []);
  const upsert = async (rec) => { const { error } = await supabase.from("vacancies").upsert(rec); if (error) throw error; };
  const remove = async (id) => { const { error } = await supabase.from("vacancies").delete().eq("vacancy_id", id); if (error) throw error; };
  return { rows, upsert, remove };
}
