import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase"; // лишається як було у тебе

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription?.unsubscribe();
  }, []);

  if (session) return children;

  async function signIn() {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) alert(error.message);
    else alert("Перевір пошту і натисни посилання для входу.");
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50">
      <div className="bg-white border rounded-2xl p-6 w-full max-w-sm shadow-sm">
        <h1 className="font-bold text-lg mb-3">Увійти</h1>
        <input
          className="w-full border rounded-xl px-3 py-2 mb-2"
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
        />
        <button className="btn btn-primary w-full" onClick={signIn}>
          Надіслати магічне посилання
        </button>
      </div>
    </div>
  );
}
