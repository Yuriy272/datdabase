import React, { useMemo, useState, useEffect } from "react";

import { useClients } from "./hooks/useClients";
import { useProjects } from "./hooks/useProjects";
import { usePeople } from "./hooks/usePeople";
import { useVacancies } from "./hooks/useVacancies";
import { useAssignments } from "./hooks/useAssignments";
import { useAttendance } from "./hooks/useAttendance";

/* ---------- helpers / ui ---------- */
const clsInp = "w-full border rounded-xl px-3 py-2";
const uid = (p) => p + Math.random().toString(36).slice(2, 8);
const ENTRY_KEY = "cec:entry-ok"; // локальний прапорець входу за кодом

/* ---------- root component ---------- */
export default function App() {
  /* код-логін */
  const requiredCode = (import.meta.env.VITE_ENTRY_CODE || "").trim() || "123456";
  const forceGate = (import.meta.env.VITE_FORCE_CODE || "") === "1";
  const [hasAccess, setHasAccess] = useState(
    () => localStorage.getItem(ENTRY_KEY) === "1"
  );
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");

  // підтримка форс-виходу через ?logout=1
  useEffect(() => {
    const usp = new URLSearchParams(location.search);
    if (usp.has("logout")) {
      try {
        localStorage.removeItem(ENTRY_KEY);
        localStorage.removeItem("cec_entry_ok"); // старі ключі, якщо були
        localStorage.removeItem("entry_ok");
      } finally {
        window.location.replace(window.location.pathname);
      }
    }
  }, []);

  function handleCheckCode(e) {
    e.preventDefault();
    if (code.trim() === requiredCode) {
      localStorage.setItem(ENTRY_KEY, "1");
      setHasAccess(true);
      setCodeError("");
      window.history.replaceState({}, "", window.location.pathname);
    } else {
      setCodeError("Невірний код. Перевірте і спробуйте ще раз.");
    }
  }

  function handleLogout() {
    try {
      localStorage.removeItem(ENTRY_KEY);
      localStorage.removeItem("cec_entry_ok");
      localStorage.removeItem("entry_ok");
    } finally {
      window.location.replace(window.location.pathname);
    }
  }

  /* дані */
  const { rows: clientsRaw = [],     upsert: saveClient,   remove: delClient }     = useClients();
  const { rows: projectsRaw = [],    upsert: saveProject,  remove: delProject }    = useProjects();
  const { rows: peopleRaw = [],      upsert: savePerson,   remove: delPerson }     = usePeople();
  const { rows: vacanciesRaw = [],   upsert: saveVacancy,  remove: delVacancy }    = useVacancies();
  const { rows: assignmentsRaw = [], upsert: saveAssign,   remove: delAssign }     = useAssignments();
  const { rows: attendanceRaw = [],  upsert: saveAttend,   remove: delAttend }     = useAttendance();

  // на всяк випадок захист від null/undefined
  const clients     = clientsRaw     || [];
  const projects    = projectsRaw    || [];
  const people      = peopleRaw      || [];
  const vacancies   = vacanciesRaw   || [];
  const assignments = assignmentsRaw || [];
  const attendance  = attendanceRaw  || [];

  const [tab, setTab] = useState("dashboard");

  /* розрахунки */
  const today = new Date().toISOString().slice(0, 10);
  const activeAssignments = assignments.filter(
    (a) =>
      (a?.status || "") === "Активний" &&
      (!a?.start || a.start <= today) &&
      (!a?.end || a.end >= today)
  );
  const activePersonIds = new Set(activeAssignments.map((a) => a.person_id));

  const clientsById = useMemo(
    () => Object.fromEntries(clients.map((c) => [c.client_id, c])),
    [clients]
  );
  const peopleById = useMemo(
    () => Object.fromEntries(people.map((p) => [p.person_id, p])),
    [people]
  );
  const projectsById = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.project_id, p])),
    [projects]
  );

  // Порахувати “дні роботи” за attendance (рахуємо все що містить "яв"/"present" або порожній статус)
  const workedDays = useMemo(() => {
    const m = {};
    attendance.forEach((a) => {
      const s = (a?.status || "").toLowerCase();
      if (s.includes("яв") || s.includes("present") || s === "") {
        m[a.person_id] = (m[a.person_id] || 0) + 1;
      }
    });
    return m;
  }, [attendance]);

  /* якщо немає доступу (або увімкнено forceGate) — показуємо модалку з кодом */
  if (!hasAccess || forceGate) {
    return (
      <div className="min-h-screen bg-slate-100">
        <header className="px-4 py-3 bg-white border-b">
          <Logo />
        </header>

        {/* модальне вікно коду */}
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-10 bg-white border rounded-2xl shadow p-4 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-2">Увійти</h2>
            <p className="text-sm text-slate-600 mb-4">
              Введіть код доступу (зараз встановлено: <b>{requiredCode}</b>).
            </p>
            <form onSubmit={handleCheckCode} className="space-y-3">
              <input
                className={clsInp}
                placeholder="Ваш код"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
              />
              {codeError && <div className="text-sm text-red-600">{codeError}</div>}
              <div className="flex justify-end">
                <button type="submit" className="btn btn-primary">
                  Увійти
                </button>
              </div>
            </form>
            <div className="mt-3 text-xs text-slate-500">
              Підказка: можна вийти будь-коли, додавши до адреси <code>?logout=1</code>.
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* основний інтерфейс */
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="px-4 py-3 bg-white border-b sticky top-0 flex items-center justify-between">
        <Logo />
        <nav className="flex gap-1 flex-wrap">
          {[
            ["dashboard", "Дашборд"],
            ["leads", "Ліди"],
            ["people", "Люди"],
            ["clients", "Клієнти"],
            ["projects", "Проєкти"],
            ["vacancies", "Вакансії"],
            ["assignments", "Призначення"],
            ["attendance", "Відвідуваність"],
          ].map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={tab === k ? "btn btn-primary" : "btn"}
            >
              {l}
            </button>
          ))}
        </nav>
        <button type="button" className="btn" onClick={handleLogout}>
          Вийти
        </button>
      </header>

      <main className="p-4 max-w-7xl mx-auto space-y-8">
        {tab === "dashboard" && (
          <Card title="Дашборд">
            <p className="text-sm text-slate-600 mb-4">
              Ви увійшли за кодом. Нижче працює весь інтерфейс (ліди, люди, клієнти,
              проєкти, вакансії, призначення, відвідуваність).
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPI label="Усього людей" value={people.length} />
              <KPI label="Працює зараз" value={activePersonIds.size} />
              <KPI label="Клієнтів" value={clients.length} />
              <KPI
                label="Вакансій відкрито"
                value={vacancies.filter((v) => (v?.status || "") === "Відкрита").length}
              />
            </div>
          </Card>
        )}

        {tab === "leads" && (
          <Card
            title="Ліди"
            action={<PersonModal onSave={savePerson} clients={clients} />}
          >
            <Table
              columns={[
                ["ПІБ", (r) => r.name],
                ["Телефон", (r) => r.phone || "—"],
                ["Рекрутер", (r) => r.recruiter || "—"],
                ["Статус", (r) => r.status || "—"],
                ["Цільовий клієнт", (r) => clientsById[r.target_client_id]?.company || "—"],
                [
                  "Дії",
                  (r) => (
                    <>
                      <PersonModal initial={r} onSave={savePerson} clients={clients} />
                      <button className="btn ml-2" onClick={() => delPerson(r.person_id)}>
                        🗑
                      </button>
                    </>
                  ),
                ],
              ]}
              rows={(people || []).filter((p) => (p.status || "lead") === "lead")}
            />
          </Card>
        )}

        {tab === "people" && (
          <Card
            title="Люди"
            action={<PersonModal onSave={savePerson} clients={clients} />}
          >
            <Table
              rowClass={(r) => (activePersonIds.has(r.person_id) ? "bg-emerald-50" : "")}
              columns={[
                [
                  "ПІБ",
                  (r) => (
                    <span className="flex items-center gap-2">
                      {r.name}
                      {activePersonIds.has(r.person_id) && (
                        <span className="text-xs bg-emerald-200 text-emerald-800 rounded-full px-2">
                          працює
                        </span>
                      )}
                    </span>
                  ),
                ],
                ["Телефон", (r) => r.phone || "—"],
                ["Місто", (r) => r.city || "—"],
                ["Рекрутер", (r) => r.recruiter || "—"],
                ["Статус", (r) => r.status || "—"],
                ["Цільовий клієнт", (r) => clientsById[r.target_client_id]?.company || "—"],
                ["Днів", (r) => workedDays[r.person_id] || 0],
                [
                  "Дії",
                  (r) => (
                    <>
                      <PersonModal initial={r} onSave={savePerson} clients={clients} />
                      <button className="btn ml-2" onClick={() => delPerson(r.person_id)}>
                        🗑
                      </button>
                    </>
                  ),
                ],
              ]}
              rows={people}
            />
          </Card>
        )}

        {tab === "clients" && (
          <Card title="Клієнти" action={<ClientModal onSave={saveClient} />}>
            <Table
              columns={[
                ["Компанія", (r) => r.company],
                ["Локація", (r) => r.location || "—"],
                ["Нотатка", (r) => r.note || "—"],
                [
                  "Дії",
                  (r) => (
                    <>
                      <ClientModal initial={r} onSave={saveClient} />
                      <button className="btn ml-2" onClick={() => delClient(r.client_id)}>
                        🗑
                      </button>
                    </>
                  ),
                ],
              ]}
              rows={clients}
            />
          </Card>
        )}

        {tab === "projects" && (
          <Card
            title="Проєкти"
            action={<ProjectModal onSave={saveProject} clients={clients} />}
          >
            <Table
              columns={[
                ["Назва", (r) => r.name],
                ["Клієнт", (r) => clientsById[r.client_id]?.company || "—"],
                ["Нотатка", (r) => r.note || "—"],
                [
                  "Дії",
                  (r) => (
                    <>
                      <ProjectModal initial={r} onSave={saveProject} clients={clients} />
                      <button className="btn ml-2" onClick={() => delProject(r.project_id)}>
                        🗑
                      </button>
                    </>
                  ),
                ],
              ]}
              rows={projects}
            />
          </Card>
        )}

        {tab === "vacancies" && (
          <Card
            title="Вакансії"
            action={<VacancyModal onSave={saveVacancy} clients={clients} />}
          >
            <Table
              columns={[
                ["Компанія", (r) => clientsById[r.client_id]?.company || "—"],
                ["Позиція", (r) => r.position],
                ["Ставка", (r) => r.rate],
                ["Статус", (r) => r.status || "—"],
                [
                  "Дії",
                  (r) => (
                    <>
                      <VacancyModal initial={r} onSave={saveVacancy} clients={clients} />
                      <button className="btn ml-2" onClick={() => delVacancy(r.vacancy_id)}>
                        🗑
                      </button>
                    </>
                  ),
                ],
              ]}
              rows={vacancies}
            />
          </Card>
        )}

        {tab === "assignments" && (
          <Card
            title="Призначення"
            action={
              <AssignmentModal
                onSave={saveAssign}
                people={people}
                clients={clients}
                projects={projects}
              />
            }
          >
            <Table
              columns={[
                ["Кандидат", (r) => peopleById[r.person_id]?.name || "—"],
                ["Клієнт", (r) => clientsById[r.client_id]?.company || "—"],
                ["Проєкт", (r) => projectsById[r.project_id]?.name || "—"],
                ["Позиція", (r) => r.position || "—"],
                ["Договір", (r) => r.contract_type || "—"],
                ["Ставка", (r) => r.rate || "—"],
                ["Початок", (r) => r.start || "—"],
                ["Кінець", (r) => r.end || "—"],
                ["Статус", (r) => r.status || "—"],
                [
                  "Дії",
                  (r) => (
                    <>
                      <AssignmentModal
                        initial={r}
                        onSave={saveAssign}
                        people={people}
                        clients={clients}
                        projects={projects}
                      />
                      <button className="btn ml-2" onClick={() => delAssign(r.assignment_id)}>
                        🗑
                      </button>
                    </>
                  ),
                ],
              ]}
              rows={assignments}
            />
          </Card>
        )}

        {tab === "attendance" && (
          <Card
            title="Відвідуваність"
            action={<AttendanceModal onSave={saveAttend} people={people} clients={clients} />}
          >
            <Table
              columns={[
                ["Дата", (r) => r.date],
                ["Кандидат", (r) => peopleById[r.person_id]?.name || "—"],
                ["Клієнт", (r) => clientsById[r.client_id]?.company || "—"],
                ["Зміна", (r) => r.shift || "—"],
                ["Години", (r) => r.hours || 0],
                ["Статус", (r) => r.status || "—"],
                [
                  "Дії",
                  (r) => (
                    <>
                      <AttendanceModal
                        initial={r}
                        onSave={saveAttend}
                        people={people}
                        clients={clients}
                      />
                      <button className="btn ml-2" onClick={() => delAttend(r.id)}>
                        🗑
                      </button>
                    </>
                  ),
                ],
              ]}
              rows={attendance}
            />
          </Card>
        )}
      </main>
    </div>
  );
}

/* ---------- UI blocks ---------- */
function Card({ title, action, children }) {
  return (
    <div className="bg-white border rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}
function Table({ columns, rows, rowClass }) {
  const safeRows = Array.isArray(rows) ? rows : [];
  return (
    <div className="overflow-x-auto border rounded-xl">
      <table className="w-full text-sm">
        <thead className="bg-slate-100">
          <tr>
            {columns.map(([h], i) => (
              <th key={i} className="text-left p-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {safeRows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="p-3 text-center text-slate-500">
                Немає даних
              </td>
            </tr>
          )}
          {safeRows.map((r, i) => (
            <tr key={i} className={`border-t ${rowClass ? rowClass(r) : ""}`}>
              {columns.map(([_, cell], j) => (
                <td key={j} className="p-2">
                  {cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function KPI({ label, value }) {
  return (
    <div className="bg-white border rounded-2xl p-4 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-slate-600 text-sm">{label}</div>
    </div>
  );
}

/* ---------- Modals ---------- */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-2xl border shadow p-4 w-full max-w-xl">
        <div className="flex justify-between items-center mb-3">
          <div className="font-semibold">{title}</div>
          <button type="button" className="btn" onClick={onClose}>
            ✖
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ClientModal({ initial, onSave }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  const [f, setF] = useState(
    initial || { client_id: "", company: "", location: "", note: "" }
  );

  function save() {
    const payload = {
      ...f,
      client_id: (f.client_id || "").trim(),
      company: (f.company || "").trim(),
      location: (f.location || "").trim(),
      note: (f.note || "").trim(),
    };
    if (!payload.company) {
      setErr("Вкажи назву компанії/заводу.");
      return;
    }
    if (!payload.client_id) payload.client_id = uid("C");
    setErr("");
    onSave(payload);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="btn"
        onClick={() => {
          setF(initial || { client_id: "", company: "", location: "", note: "" });
          setErr("");
          setOpen(true);
        }}
      >
        {initial ? "✏️ Ред." : "➕ Додати"}
      </button>

      {open && (
        <Modal
          title={initial ? "Клієнт / Завод" : "Новий клієнт / завод"}
          onClose={() => setOpen(false)}
        >
          <div className="grid gap-2">
            <input
              className={clsInp}
              placeholder="ID (необов'язково)"
              value={f.client_id}
              onChange={(e) => setF({ ...f, client_id: e.target.value })}
            />
            <input
              className={clsInp}
              placeholder="Компанія / Завод *"
              value={f.company}
              onChange={(e) => setF({ ...f, company: e.target.value })}
            />
            <input
              className={clsInp}
              placeholder="Локація (місто)"
              value={f.location}
              onChange={(e) => setF({ ...f, location: e.target.value })}
            />
            <textarea
              className={clsInp}
              placeholder="Нотатка"
              value={f.note}
              onChange={(e) => setF({ ...f, note: e.target.value })}
            />
            {err && <div className="text-red-600 text-sm">{err}</div>}
          </div>
          <div className="mt-3 flex justify-end">
            <button type="button" className="btn btn-primary" onClick={save}>
              Зберегти
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function ProjectModal({ initial, onSave, clients = [] }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(
    initial || {
      project_id: "",
      name: "",
      client_id: clients[0]?.client_id || "",
      note: "",
    }
  );
  return (
    <>
      <button
        type="button"
        className="btn"
        onClick={() => {
          setF(
            initial || {
              project_id: "",
              name: "",
              client_id: clients[0]?.client_id || "",
              note: "",
            }
          );
          setOpen(true);
        }}
      >
        {initial ? "✏️ Ред." : "➕ Додати"}
      </button>
      {open && (
        <Modal title={initial ? "Проєкт" : "Новий проєкт"} onClose={() => setOpen(false)}>
          <input
            className={clsInp + " mb-2"}
            placeholder="Назва"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
          <select
            className={clsInp + " mb-2"}
            value={f.client_id}
            onChange={(e) => setF({ ...f, client_id: e.target.value })}
          >
            {clients.map((c) => (
              <option key={c.client_id} value={c.client_id}>
                {c.company}
              </option>
            ))}
          </select>
          <textarea
            className={clsInp}
            placeholder="Нотатка"
            value={f.note}
            onChange={(e) => setF({ ...f, note: e.target.value })}
          />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (!f.project_id) f.project_id = uid("PR");
                onSave(f);
                setOpen(false);
              }}
            >
              Зберегти
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function PersonModal({ initial, onSave, clients = [] }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(
    initial || {
      person_id: "",
      name: "",
      phone: "",
      city: "",
      citizenship: "",
      doc: "",
      recruiter: "",
      birth_date: "",
      status: "lead",
      target_client_id: null,
    }
  );

  return (
    <>
      <button
        type="button"
        className="btn"
        onClick={() => {
          setF(
            initial || {
              person_id: "",
              name: "",
              phone: "",
              city: "",
              citizenship: "",
              doc: "",
              recruiter: "",
              birth_date: "",
              status: "lead",
              target_client_id: null,
            }
          );
          setOpen(true);
        }}
      >
        {initial ? "✏️ Ред." : "➕ Додати"}
      </button>

      {open && (
        <Modal title={initial ? "Людина" : "Нова людина"} onClose={() => setOpen(false)}>
          <div className="grid sm:grid-cols-2 gap-2">
            <input
              className={clsInp}
              placeholder="ID (P1…)"
              value={f.person_id}
              onChange={(e) => setF({ ...f, person_id: e.target.value })}
            />
            <input
              className={clsInp}
              placeholder="ПІБ"
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
            />
            <input
              className={clsInp}
              placeholder="Телефон"
              value={f.phone || ""}
              onChange={(e) => setF({ ...f, phone: e.target.value })}
            />
            <input
              className={clsInp}
              placeholder="Місто"
              value={f.city || ""}
              onChange={(e) => setF({ ...f, city: e.target.value })}
            />
            <input
              className={clsInp}
              placeholder="Громадянство"
              value={f.citizenship || ""}
              onChange={(e) => setF({ ...f, citizenship: e.target.value })}
            />
            <input
              className={clsInp}
              placeholder="Документ"
              value={f.doc || ""}
              onChange={(e) => setF({ ...f, doc: e.target.value })}
            />
            <input
              className={clsInp}
              placeholder="Рекрутер"
              value={f.recruiter || ""}
              onChange={(e) => setF({ ...f, recruiter: e.target.value })}
            />
            <input
              type="date"
              className={clsInp}
              value={f.birth_date || ""}
              onChange={(e) => setF({ ...f, birth_date: e.target.value })}
            />

            <select
              className={clsInp + " col-span-2"}
              value={f.target_client_id ?? ""}
              onChange={(e) =>
                setF({
                  ...f,
                  target_client_id: e.target.value === "" ? null : e.target.value,
                })
              }
            >
              <option value="">— без цільового клієнта —</option>
              {clients.map((c) => (
                <option key={c.client_id} value={c.client_id}>
                  {c.company}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const payload = { ...f, target_client_id: f.target_client_id || null };
                if (!payload.person_id) payload.person_id = uid("P");
                onSave(payload);
                setOpen(false);
              }}
            >
              Зберегти
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function VacancyModal({ initial, onSave, clients = [] }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(
    initial || {
      vacancy_id: "",
      client_id: clients[0]?.client_id || "",
      position: "",
      rate: 0,
      status: "Відкрита",
    }
  );
  return (
    <>
      <button
        type="button"
        className="btn"
        onClick={() => {
          setF(
            initial || {
              vacancy_id: "",
              client_id: clients[0]?.client_id || "",
              position: "",
              rate: 0,
              status: "Відкрита",
            }
          );
          setOpen(true);
        }}
      >
        {initial ? "✏️ Ред." : "➕ Додати"}
      </button>
      {open && (
        <Modal title={initial ? "Вакансія" : "Нова вакансія"} onClose={() => setOpen(false)}>
          <select
            className={clsInp + " mb-2"}
            value={f.client_id}
            onChange={(e) => setF({ ...f, client_id: e.target.value })}
          >
            {clients.map((c) => (
              <option key={c.client_id} value={c.client_id}>
                {c.company}
              </option>
            ))}
          </select>
          <input
            className={clsInp + " mb-2"}
            placeholder="Позиція"
            value={f.position}
            onChange={(e) => setF({ ...f, position: e.target.value })}
          />
          <input
            type="number"
            className={clsInp + " mb-2"}
            placeholder="Ставка"
            value={f.rate}
            onChange={(e) => setF({ ...f, rate: Number(e.target.value) })}
          />
          <select
            className={clsInp}
            value={f.status}
            onChange={(e) => setF({ ...f, status: e.target.value })}
          >
            <option>Відкрита</option>
            <option>Закрита</option>
          </select>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (!f.vacancy_id) f.vacancy_id = uid("V");
                onSave(f);
                setOpen(false);
              }}
            >
              Зберегти
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function AssignmentModal({ initial, onSave, people = [], clients = [], projects = [] }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(
    initial || {
      assignment_id: "",
      person_id: people[0]?.person_id || "",
      client_id: clients[0]?.client_id || "",
      project_id: "",
      position: "",
      contract_type: "DPČ",
      rate: 0,
      status: "Активний",
      start: new Date().toISOString().slice(0, 10),
      end: "",
    }
  );
  return (
    <>
      <button
        type="button"
        className="btn"
        onClick={() => {
          setF(
            initial || {
              assignment_id: "",
              person_id: people[0]?.person_id || "",
              client_id: clients[0]?.client_id || "",
              project_id: "",
              position: "",
              contract_type: "DPČ",
              rate: 0,
              status: "Активний",
              start: new Date().toISOString().slice(0, 10),
              end: "",
            }
          );
          setOpen(true);
        }}
      >
        {initial ? "✏️ Ред." : "➕ Додати"}
      </button>
      {open && (
        <Modal title={initial ? "Призначення" : "Нове призначення"} onClose={() => setOpen(false)}>
          <select
            className={clsInp + " mb-2"}
            value={f.person_id}
            onChange={(e) => setF({ ...f, person_id: e.target.value })}
          >
            {people.map((p) => (
              <option key={p.person_id} value={p.person_id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            className={clsInp + " mb-2"}
            value={f.client_id}
            onChange={(e) => setF({ ...f, client_id: e.target.value })}
          >
            {clients.map((c) => (
              <option key={c.client_id} value={c.client_id}>
                {c.company}
              </option>
            ))}
          </select>
          <select
            className={clsInp + " mb-2"}
            value={f.project_id}
            onChange={(e) => setF({ ...f, project_id: e.target.value })}
          >
            <option value="">—</option>
            {projects
              .filter((p) => p.client_id === f.client_id)
              .map((p) => (
                <option key={p.project_id} value={p.project_id}>
                  {p.name}
                </option>
              ))}
          </select>
          <input
            className={clsInp + " mb-2"}
            placeholder="Позиція"
            value={f.position || ""}
            onChange={(e) => setF({ ...f, position: e.target.value })}
          />
          <input
            className={clsInp + " mb-2"}
            placeholder="Договір"
            value={f.contract_type || ""}
            onChange={(e) => setF({ ...f, contract_type: e.target.value })}
          />
          <input
            type="number"
            className={clsInp + " mb-2"}
            placeholder="Ставка"
            value={f.rate || 0}
            onChange={(e) => setF({ ...f, rate: Number(e.target.value) })}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              className={clsInp}
              value={f.start || ""}
              onChange={(e) => setF({ ...f, start: e.target.value })}
            />
            <input
              type="date"
              className={clsInp}
              value={f.end || ""}
              onChange={(e) => setF({ ...f, end: e.target.value })}
            />
          </div>
          <select
            className={clsInp + " mt-2"}
            value={f.status}
            onChange={(e) => setF({ ...f, status: e.target.value })}
          >
            <option>Активний</option>
            <option>Завершено</option>
          </select>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (!f.assignment_id) f.assignment_id = uid("A");
                onSave(f);
                setOpen(false);
              }}
            >
              Зберегти
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function AttendanceModal({ initial, onSave, people = [], clients = [] }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(
    initial || {
      id: "",
      date: new Date().toISOString().slice(0, 10),
      person_id: people[0]?.person_id || "",
      client_id: clients[0]?.client_id || "",
      shift: "День",
      hours: 12,
      status: "Явка",
    }
  );
  return (
    <>
      <button
        type="button"
        className="btn"
        onClick={() => {
          setF(
            initial || {
              id: "",
              date: new Date().toISOString().slice(0, 10),
              person_id: people[0]?.person_id || "",
              client_id: clients[0]?.client_id || "",
              shift: "День",
              hours: 12,
              status: "Явка",
            }
          );
          setOpen(true);
        }}
      >
        {initial ? "✏️ Ред." : "➕ Додати"}
      </button>
      {open && (
        <Modal
          title={initial ? "Відвідуваність" : "Запис відвідуваності"}
          onClose={() => setOpen(false)}
        >
          <input
            type="date"
            className={clsInp + " mb-2"}
            value={f.date}
            onChange={(e) => setF({ ...f, date: e.target.value })}
          />
          <select
            className={clsInp + " mb-2"}
            value={f.person_id}
            onChange={(e) => setF({ ...f, person_id: e.target.value })}
          >
            {people.map((p) => (
              <option key={p.person_id} value={p.person_id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            className={clsInp + " mb-2"}
            value={f.client_id}
            onChange={(e) => setF({ ...f, client_id: e.target.value })}
          >
            {clients.map((c) => (
              <option key={c.client_id} value={c.client_id}>
                {c.company}
              </option>
            ))}
          </select>
          <input
            className={clsInp + " mb-2"}
            placeholder="Зміна (День/Ніч)"
            value={f.shift}
            onChange={(e) => setF({ ...f, shift: e.target.value })}
          />
          <input
            type="number"
            className={clsInp + " mb-2"}
            placeholder="Години"
            value={f.hours}
            onChange={(e) => setF({ ...f, hours: Number(e.target.value) })}
          />
          <input
            className={clsInp}
            placeholder="Статус"
            value={f.status}
            onChange={(e) => setF({ ...f, status: e.target.value })}
          />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (!f.id) f.id = uid("T");
                onSave(f);
                setOpen(false);
              }}
            >
              Зберегти
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ---------- Logo ---------- */
function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 64 64" width="28" height="28" aria-hidden="true">
        <defs>
          <linearGradient id="flagGrad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#d7141a" />
            <stop offset="50%" stopColor="#11457e" />
            <stop offset="100%" stopColor="#ffd700" />
          </linearGradient>
        </defs>
        <path
          d="M32 4l8 16 18 2-12 12 3 18-17-9-17 9 3-18-12-12 18-2z"
          fill="url(#flagGrad)"
        />
      </svg>
      <span className="font-bold">Czech Employment Connection</span>
    </div>
  );
}


