// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

// ====== НАЛАШТУВАННЯ (під свої назви полів/таблиць) ========================
// Таблиця з кодами доступу. Поля: code (text), is_active (bool), expires_at (timestamptz)
const ACCESS_CODES_TABLE = "access_codes"; // змінити, якщо в тебе інша назва
// Ключ у localStorage, де триматимемо локальну “сесію”
const CODE_SESSION_KEY = "codeAuth";
// ===========================================================================

export default function App() {
  const [isReady, setReady] = useState(false);
  const [isAuthed, setAuthed] = useState(false);

  useEffect(() => {
    // Перевіряємо, чи вже є локальна сесія (користувач раніше увійшов кодом)
    const ok = localStorage.getItem(CODE_SESSION_KEY) === "1";
    setAuthed(ok);
    setReady(true);
  }, []);

  if (!isReady) return null;

  return isAuthed ? (
    <AppShell onSignOut={() => signOut(setAuthed)} />
  ) : (
    <CodeLogin onSuccess={() => setAuthed(true)} />
  );
}

// -------------------------- Вхід по коду -----------------------------------
function CodeLogin({ onSuccess }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const disabled = useMemo(() => loading || !code.trim(), [loading, code]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      // 1) Знаходимо код у таблиці
      const { data, error } = await supabase
        .from(ACCESS_CODES_TABLE)
        .select("code,is_active,expires_at")
        .eq("code", code.trim())
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setMsg("Код не знайдено. Перевір правильність.");
        return;
      }

      // 2) Перевіряємо активність та строк дії
      const isActive = !!data.is_active;
      const isExpired =
        data.expires_at && new Date(data.expires_at).getTime() < Date.now();

      if (!isActive) {
        setMsg("Код не активний.");
        return;
      }
      if (isExpired) {
        setMsg("Строк дії коду вичерпано.");
        return;
      }

      // 3) Успіх → вмикаємо локальну "сесію"
      localStorage.setItem(CODE_SESSION_KEY, "1");
      onSuccess?.();
    } catch (err) {
      console.error(err);
      setMsg("Сталася помилка. Спробуй ще раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h1 className="mb-4 text-xl font-semibold">Увійти</h1>

        <label className="mb-2 block text-sm text-gray-600">Код доступу</label>
        <input
          className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-indigo-500"
          placeholder="Введи свій код (напр. 123456)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />

        {msg && (
          <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {msg}
          </div>
        )}

        <button
          type="submit"
          disabled={disabled}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {loading ? "Перевіряю…" : "Увійти кодом"}
        </button>

        <p className="mt-3 text-center text-xs text-gray-500">
          Email / magic-link вимкнено. Вхід тільки за кодом.
        </p>
      </form>
    </div>
  );
}

// -------------------------- Основний додаток -------------------------------
function AppShell({ onSignOut }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Шапка */}
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="text-sm font-semibold">
            Czech Employment Connection
          </div>
          <button
            onClick={onSignOut}
            className="rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
            title="Вихід"
          >
            Вийти
          </button>
        </div>
      </header>

      {/* Контент (тут лишив дуже просту заглушку; твій поточний інтерфейс можна залишити як є) */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">Дашборд</h1>
        <p className="text-sm text-gray-600">
          Ти увійшов за кодом. Тут продовжує працювати весь твій інтерфейс
          (ліди, люди, клієнти, вакансії, призначення, відвідуваність тощо).
        </p>

        {/* TODO: встав свій існуючий контент / компоненти */}
      </main>
    </div>
  );
}

// --------------------------- Вихід -----------------------------------------
function signOut(setAuthed) {
  try {
    localStorage.removeItem(CODE_SESSION_KEY);
  } finally {
    setAuthed(false);
  }
}
