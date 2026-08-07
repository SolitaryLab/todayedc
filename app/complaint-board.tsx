"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Complaint = { id: string; date: string; title: string; content: string; agency: string };
type Draft = Omit<Complaint, "id">;

const emptyDraft = (): Draft => ({ date: new Date().toISOString().slice(0, 10), title: "", content: "", agency: "" });

function displayDate(date: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(new Date(`${date}T12:00:00`));
}

export function ComplaintBoard() {
  const [items, setItems] = useState<Complaint[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");
  const [adminOpen, setAdminOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/complaints", { cache: "no-store" });
    const data = await res.json() as { items: Complaint[] };
    setItems(data.items);
    setSelected((current) => current || data.items[0]?.date || "");
    setLoading(false);
  }, []);

  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);
  useEffect(() => { fetch("/api/auth").then((r) => setAuthenticated(r.ok)).catch(() => null); }, []);

  const dates = useMemo(() => [...new Set(items.map((item) => item.date))], [items]);
  const visible = items.filter((item) => item.date === selected);

  async function copy(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(""), 1500);
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const res = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: values.get("username"), password: values.get("password") }) });
    if (res.ok) { setAuthenticated(true); setMessage(""); }
    else setMessage("아이디 또는 비밀번호를 확인해 주세요.");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const res = await fetch("/api/complaints", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing ? { ...draft, id: editing } : draft) });
    if (!res.ok) { setMessage("저장하지 못했습니다. 잠시 후 다시 시도해 주세요."); return; }
    setEditing(null); setDraft(emptyDraft()); setMessage("저장되었습니다."); await load();
  }

  async function remove(id: string) {
    if (!window.confirm("이 민원을 삭제할까요?")) return;
    await fetch(`/api/complaints?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="오늘의민원 홈"><span className="brand-mark">오</span><span>오늘의민원</span></a>
        <a className="epeople" href="https://www.epeople.go.kr" target="_blank" rel="noreferrer">국민신문고 바로가기 <span>↗</span></a>
      </header>

      <section className="hero" id="top">
        <p className="eyebrow">TODAY’S CIVIC VOICE</p>
        <h1>오늘의 목소리를<br /><em>한 번에</em> 전하세요.</h1>
        <p className="hero-copy">날짜를 선택하고 제목, 내용, 처리기관을 각각 복사해<br className="desktop" /> 국민신문고에 간편하게 접수하세요.</p>
      </section>

      <section className="board" aria-label="날짜별 민원">
        <div className="date-rail">
          <p className="section-label">날짜 선택</p>
          <div className="date-list">
            {dates.map((date) => <button className={selected === date ? "date active" : "date"} onClick={() => setSelected(date)} key={date}><span>{displayDate(date)}</span><b>{items.filter((i) => i.date === date).length}</b></button>)}
          </div>
        </div>

        <div className="complaints">
          <div className="complaints-head"><div><p className="section-label">선택한 날짜</p><h2>{selected ? displayDate(selected) : "등록된 민원이 없습니다"}</h2></div><span className="count">민원 {visible.length}건</span></div>
          {loading && <div className="empty">민원 내용을 불러오고 있습니다.</div>}
          {!loading && visible.length === 0 && <div className="empty"><span>✦</span><p>이 날짜에는 등록된 민원이 없습니다.</p></div>}
          {visible.map((item, index) => (
            <article className="complaint-card" key={item.id}>
              <div className="card-number">{String(index + 1).padStart(2, "0")}</div>
              <CopyField label="제목" value={item.title} copyKey={`${item.id}-title`} copied={copied} onCopy={copy} />
              <CopyField label="내용" value={item.content} copyKey={`${item.id}-content`} copied={copied} onCopy={copy} multiline />
              <CopyField label="처리기관" value={item.agency} copyKey={`${item.id}-agency`} copied={copied} onCopy={copy} />
              {authenticated && <div className="admin-actions"><button onClick={() => { setEditing(item.id); setDraft(item); setAdminOpen(true); }}>수정</button><button onClick={() => remove(item.id)}>삭제</button></div>}
            </article>
          ))}
        </div>
      </section>

      <button className="admin-trigger" onClick={() => setAdminOpen(true)}><span>●</span> 관리자 {authenticated ? "메뉴" : "로그인"}</button>
      {adminOpen && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setAdminOpen(false); }}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-title"><button className="close" onClick={() => setAdminOpen(false)} aria-label="닫기">×</button>
        {!authenticated ? <><p className="eyebrow">ADMIN</p><h2 id="admin-title">관리자 로그인</h2><p className="modal-copy">민원을 등록하고 관리하려면 로그인해 주세요.</p><form onSubmit={login} className="admin-form"><label>아이디<input name="username" autoComplete="username" required /></label><label>비밀번호<input name="password" type="password" autoComplete="current-password" required /></label>{message && <p className="form-message error">{message}</p>}<button className="primary" type="submit">로그인</button></form></> : <><p className="eyebrow">ADMIN</p><h2 id="admin-title">{editing ? "민원 수정" : "새 민원 등록"}</h2><form onSubmit={save} className="admin-form"><label>날짜<input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} required /></label><label>제목<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required /></label><label>내용<textarea rows={7} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} required /></label><label>처리기관<input value={draft.agency} onChange={(e) => setDraft({ ...draft, agency: e.target.value })} required /></label>{message && <p className="form-message">{message}</p>}<div className="form-buttons"><button className="primary" type="submit">{editing ? "수정 저장" : "민원 등록"}</button>{editing && <button type="button" onClick={() => { setEditing(null); setDraft(emptyDraft()); }}>취소</button>}</div></form></>}
      </section></div>}
      <footer><span>오늘의민원</span><p>더 나은 우리 동네를 위한 작은 목소리</p><p>© 2026 Today’s Minwon</p></footer>
    </main>
  );
}

function CopyField({ label, value, copyKey, copied, onCopy, multiline = false }: { label: string; value: string; copyKey: string; copied: string; onCopy: (value: string, key: string) => void; multiline?: boolean }) {
  return <div className={multiline ? "copy-field multiline" : "copy-field"}><span className="field-label">{label}</span><p>{value}</p><button onClick={() => onCopy(value, copyKey)} aria-label={`${label} 복사`} className={copied === copyKey ? "copied" : ""}>{copied === copyKey ? "복사됨 ✓" : "복사"}</button></div>;
}
