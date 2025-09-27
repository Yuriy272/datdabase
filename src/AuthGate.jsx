// src/AuthGate.jsx
import { useEffect, useState } from "react";

const ACCESS_CODE = import.meta.env.VITE_ACCESS_CODE?.trim() ?? "";
const STORAGE_KEY = "cec_auth_ok";

export default function AuthGate({ children }) {
  const [authed, setAuthed] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // якщо вже авторизований
    if (localStorage.getItem(STORAGE_KEY) === "1") {
      setAuthed(true);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!ACCESS_CODE) {
      setError("Код доступу не налаштований (VITE_ACCESS_CODE). Зверніться до адміністратора.");
      return;
    }
    if (code.trim() === ACCESS_CODE) {
      localStorage.setItem(STORAGE_KEY, "1");
      setAuthed(true);
    } else {
      setError("Невірний код. Спробуйте ще раз.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAuthed(false);
  };

  if (authed) {
    return (
      <>
        {/* необов'язково — кнопка виходу десь у шапці */}
        {/* <button onClick={handleLogout} className="absolute right-4 top-4">Вийти</button> */}
        {children}
      </>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-100">
      <div className="w-[420px] rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold mb-4">Вхід</h1>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            inputMode="numeric"
            className="w-full rounded-md border px-3 py-2 outline-none"
            placeholder="Введіть код доступу"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 py-2 text-white hover:bg-blue-700"
          >
            Увійти
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {!ACCESS_CODE && (
          <p className="mt-3 text-sm text-amber-600">
            VITE_ACCESS_CODE не встановлено. Додайте змінну середовища.
          </p>
        )}
      </div>
    </div>
  );
}

