import React, { useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import { useClients } from "./hooks/useClients";
import { useProjects } from "./hooks/useProjects";
import { usePeople } from "./hooks/usePeople";
import { useVacancies } from "./hooks/useVacancies";
import { useAssignments } from "./hooks/useAssignments";
import { useAttendance } from "./hooks/useAttendance";

/* helpers */
const clsBtn = (s = "") => `px-3 py-2 rounded-xl border ${s}`;
const clsInp = "w-full border rounded-xl px-3 py-2";
const uid = (p) => p + Math.random().toString(36).slice(2, 8);

// маленький хелпер для виходу і з код-логіну, і з supabase
function signOutAll() {
  try {
    localStorage.removeItem("codeUser");
  } catch {}
  supabase.auth.signOut().finally(() => {
    // просто перезавантажимо, щоб скинути стан
    window.location.reload();
  });
}

export default function App() {
  const [tab, setTab] = useState("dashboard");

  const { rows: clients, upsert: saveClient, remove: delClient } = useClients();
  const { rows: projects, upsert: saveProject, remove: delProject } = useProjects();
  const { rows: people, upsert: savePerson, remove: delPerson } = usePeople();
  const { rows: vacancies, upsert: saveVacancy, remove: delVacancy } = useVacancies();
  const { rows: assignments, upsert: saveAssign, remove: delAssign } = useAssignments();
  const { rows: attendance, upsert: saveAttend, remove: delAttend } = useAttendance();

  const today = new Date().toISOString().slice(0, 10);
  const active = assignments.filter(
    (a) =>
      a.status === "Активний" &&
      (!a.start || a.start <= today) &&
      (!a.end || a.end >= today)
  );
  const activePersonIds = new Set(active.map((a) => a.person_id));

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

  const workedDays = useMemo(() => {
    const m = {};
    attendance.forEach((a) => {
      const s = (a.status || "").toLowerCase();
      if (s.includes("яв") || s.includes("present") || s === "") {
        m[a.person_id] = (m[a.person_id] || 0) + 1;
      }
    });
    return m;
  }, [attendance]);

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
              onClick={() => setTab(k)}
              className={tab === k ? "btn btn-primary" : "btn"}
            >
              {l}
            </button>
          ))}
        </nav>
        <button className="btn" onClick={signOutAll}>
          Вийти
        </button>
      </header>

      <main className="p-4 max-w-7xl mx-auto space-y-8">
        {tab === "dashboard" && (
          <Card title="Дашборд">
            <p className="mb-4 text-sm text-slate-600">
              Ви увійшли за кодом (код-логін). Нижче працює весь інтерфейс: ліди, люди,
              клієнти, проєкти, вакансії, призначення, відвідуваність.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPI label="Усього людей" value={people.length} />
              <KPI label="Працює зараз" value={activePersonIds.size} />
              <KPI label="Клієнтів" value={clients.length} />
              <KPI
                label="Вакансій відкрито"
                value={vacancies.filter((v) => v.status === "Відкрита").length}
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
                ["Статус", (r) => r.status],
                ["Цільовий клієнт", (r) => clientsById[r.target_client_id]?.company || "—"],
                [
                  "Дії",
                  (r) => (
                    <>
                      <PersonModal initial={r} onSave={savePerson} clients={clients} />
                      <button className="btn ml-2" onClick={() => delPerson(r.person_id)}>🗑</button>
                    </>
                  ),
                ],
              ]}
              rows={people.filter((p) => (p.status || "lead") === "lead")}
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
                ["Статус", (r) => r.status],
                ["Цільовий клієнт", (r) => clientsById[r.target_client_id]?.company || "—"],
                ["Днів", (r) => workedDays[r.person_id] || 0],
                [
                  "Дії",
                  (r) => (
                    <>
                      <PersonModal initial={r} onSave={savePerson} clients={clients} />
                      <button className="btn ml-2" onClick={() => delPerson(r.person_id)}>🗑</button>
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
                      <button className="btn ml-2" onClick={() => delClient(r.client_id)}>🗑</button>
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
                      <button className="btn ml-2" onClick={() => delProject(r.project_id)}>🗑</button>
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
                ["Статус", (r) => r.status],
                [
                  "Дії",
                  (r) => (
                    <>
                      <VacancyModal initial={r} onSave={saveVacancy} clients={clients} />
                      <button className="btn ml-2" onClick={() => delVacancy(r.vacancy_id)}>🗑</button>
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
                ["Статус", (r) => r.status],
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
                      <button className="btn ml-2" onClick={() => delAssign(r.assignment_id)}>🗑</button>
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
                      <button className="btn ml-2" onClick={() => delAttend(r.id)}>🗑</button>
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

/* ===== UI building blocks ===== */
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
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="p-3 text-center text-slate-500">
                Немає даних
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
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

/* ===== Modals (forms) ===== */
// (усі модалки нижче — без змін з твоєї версії; я їх скоротив для повідомлення,
// але у тебе вище ми залишили повний код — якщо щось пропустив, скопій з твоєї останньої версії)

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-2xl border shadow p-4 w-full max-w-xl">
        <div className="flex justify-between items-center mb-3">
          <div className="font-semibold">{title}</div>
          <button className="btn" onClick={onClose}>✖</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* … ДАЛІ — твої ClientModal / ProjectModal / PersonModal / VacancyModal / AssignmentModal / AttendanceModal
     — залиш як у своїй версії вище (ми їх уже вставляли повністю). */

/* ===== Logo ===== */
function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 64 64" width="28" height="28">
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

