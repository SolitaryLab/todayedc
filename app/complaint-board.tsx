"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Complaint = { id: string; category: "focus" | "general"; date: string; endDate?: string; title: string; content: string; agency: string; images?: Array<{ url: string; uploadedAt: string }> };
type Draft = Omit<Complaint, "id"> & { usePeriod: boolean };

const agencies = ["부산강서구", "수자원공사", "부산도시공사", "부산광역시", "기후에너지환경부"];
const emptyDraft = (): Draft => ({ category: "general", date: new Date().toISOString().slice(0, 10), endDate: "", usePeriod: false, title: "", content: "", agency: "", images: [] });

function datesBetween(start: string, end?: string) {
  const dates: string[] = [];
  const last = end || start;
  const cursor = new Date(`${start}T12:00:00`);
  const limit = new Date(`${last}T12:00:00`);
  while (cursor <= limit && dates.length < 366) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

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
  const [busy, setBusy] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/complaints", { cache: "no-store" });
    const data = await res.json() as { items: Complaint[] };
    setItems(data.items);
    setSelected((current) => {
      const available = data.items.flatMap((item) => datesBetween(item.date, item.endDate));
      return current && available.includes(current) ? current : data.items[0]?.date || "";
    });
    setLoading(false);
  }, []);

  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);
  useEffect(() => { fetch("/api/auth").then((r) => setAuthenticated(r.ok)).catch(() => null); }, []);

  const dates = useMemo(() => [...new Set(items.flatMap((item) => datesBetween(item.date, item.endDate)))].sort((a, b) => b.localeCompare(a)), [items]);
  const visible = items.filter((item) => selected >= item.date && selected <= (item.endDate || item.date));

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
    setBusy(true);
    try {
      let images = draft.images || [];
      if (photoFiles.length) {
        const form = new FormData();
        photoFiles.forEach((file) => form.append("images", file));
        const uploadRes = await fetch("/api/uploads", { method: "POST", body: form });
        if (!uploadRes.ok) { setMessage("사진을 업로드하지 못했습니다. 파일 크기와 저장 공간을 확인해 주세요."); return; }
        const uploaded = await uploadRes.json() as { images: Array<{ url: string; uploadedAt: string }> };
        images = [...images, ...uploaded.images].slice(0, 2);
      }
      const payload = { ...draft, images, endDate: draft.usePeriod ? draft.endDate : undefined };
      const res = await fetch("/api/complaints", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing ? { ...payload, id: editing } : payload) });
      if (!res.ok) { setMessage("저장 공간 연결을 확인해 주세요. 저장되지 않았습니다."); return; }
      setEditing(null); setDraft(emptyDraft()); setPhotoFiles([]); setMessage("저장되었습니다."); await load();
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!window.confirm("이 민원을 삭제할까요?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/complaints?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) { setMessage("삭제하지 못했습니다. 저장 공간 연결을 확인해 주세요."); setAdminOpen(true); return; }
      await load();
    } finally { setBusy(false); }
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="오늘의민원 홈"><span className="brand-mark">오</span><span>오늘의민원</span></a>
        <a className="epeople" href="https://www.epeople.go.kr" target="_blank" rel="noreferrer">국민신문고 바로가기 <span>↗</span></a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy-block">
          <p className="eyebrow"><span /> 함께 만드는 더 나은 일상</p>
          <h1>오늘의 목소리를<br /><em>한 번에</em> 전하세요.</h1>
          <p className="hero-copy">날짜를 고르고 필요한 항목을 복사하세요.<br className="desktop" /> 국민신문고 접수까지 더 쉽고 빠르게 이어집니다.</p>
          <a className="hero-cta" href="#complaint-board">오늘의 민원 보기 <span>↓</span></a>
        </div>
        <aside className="hero-guide" aria-label="이용 방법">
          <p>이용 방법</p>
          <ol><li><b>01</b><span>날짜 선택</span></li><li><b>02</b><span>항목별 복사</span></li><li><b>03</b><span>신문고 접수</span></li></ol>
        </aside>
      </section>

      <section className="board" id="complaint-board" aria-label="날짜별 민원">
        <div className="date-rail">
          <p className="section-label">날짜 선택</p>
          <div className="date-list">
            {dates.map((date) => <button className={selected === date ? "date active" : "date"} onClick={() => setSelected(date)} key={date}><span>{displayDate(date)}</span><b>{items.filter((item) => date >= item.date && date <= (item.endDate || item.date)).length}</b></button>)}
          </div>
        </div>

        <div className="complaints">
          <div className="complaints-head"><div><p className="section-label">선택한 날짜</p><h2>{selected ? displayDate(selected) : "등록된 민원이 없습니다"}</h2></div><span className="count">민원 {visible.length}건</span></div>
          {loading && <div className="empty">민원 내용을 불러오고 있습니다.</div>}
          {!loading && visible.length === 0 && <div className="empty"><span>✓</span><h3>현재 등록된 민원이 없습니다</h3><p>새로운 민원이 올라오면 이곳에서 바로 확인할 수 있어요.</p>{authenticated && <button className="empty-add" onClick={() => setAdminOpen(true)}>첫 민원 등록하기</button>}</div>}
          {visible.map((item, index) => (
            <article className="complaint-card" key={item.id}>
              <div className="card-number">{String(index + 1).padStart(2, "0")}</div>
              <div className={item.category === "focus" ? "category focus" : "category general"}>{item.category === "focus" ? "집중민원" : "일반민원"}{item.endDate && <span>{displayDate(item.date)} ~ {displayDate(item.endDate)}</span>}</div>
              <CopyField label="제목" value={item.title} copyKey={`${item.id}-title`} copied={copied} onCopy={copy} />
              <CopyField label="내용" value={item.content} copyKey={`${item.id}-content`} copied={copied} onCopy={copy} multiline />
              <CopyField label="처리기관" value={item.agency} copyKey={`${item.id}-agency`} copied={copied} onCopy={copy} />
              {item.images && item.images.length > 0 && <div className="complaint-images">{item.images.map((image, imageIndex) => { const imageSrc = `/api/images?url=${encodeURIComponent(image.url)}`; return <a href={imageSrc} target="_blank" rel="noreferrer" key={image.url}><img src={imageSrc} alt={`${item.title} 첨부사진 ${imageIndex + 1}`} /></a>; })}</div>}
              {authenticated && <div className="admin-actions"><button onClick={() => { setEditing(item.id); setDraft({ ...item, usePeriod: Boolean(item.endDate) }); setAdminOpen(true); }}>수정</button><button className="danger" disabled={busy} onClick={() => remove(item.id)}>삭제</button></div>}
            </article>
          ))}
        </div>
      </section>

      <button className="admin-trigger" onClick={() => setAdminOpen(true)}><span>●</span> 관리자 {authenticated ? "메뉴" : "로그인"}</button>
      {adminOpen && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setAdminOpen(false); }}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-title"><button className="close" onClick={() => setAdminOpen(false)} aria-label="닫기">×</button>
        {!authenticated ? <><p className="eyebrow">ADMIN</p><h2 id="admin-title">관리자 로그인</h2><p className="modal-copy">민원을 등록하고 관리하려면 로그인해 주세요.</p><form onSubmit={login} className="admin-form"><label>아이디<input name="username" autoComplete="username" required /></label><label>비밀번호<input name="password" type="password" autoComplete="current-password" required /></label>{message && <p className="form-message error" role="alert">{message}</p>}<button className="primary" type="submit">로그인</button></form></> : <><div className="admin-heading"><div><p className="eyebrow">ADMIN</p><h2 id="admin-title">{editing ? "민원 수정" : "새 민원 등록"}</h2></div><span>관리자 모드</span></div><form onSubmit={save} className="admin-form">
          <fieldset className="category-picker"><legend>민원 구분</legend><div><button type="button" className={draft.category === "focus" ? "active" : ""} onClick={() => setDraft({ ...draft, category: "focus" })}>집중민원</button><button type="button" className={draft.category === "general" ? "active" : ""} onClick={() => setDraft({ ...draft, category: "general" })}>일반민원</button></div></fieldset>
          <div className="date-row"><label>{draft.usePeriod ? "시작일" : "노출 날짜"}<input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value, endDate: draft.endDate && draft.endDate >= e.target.value ? draft.endDate : e.target.value })} required /></label>{draft.usePeriod && <label>종료일<input type="date" min={draft.date} value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} required /></label>}</div>
          <label className="period-check"><input type="checkbox" checked={draft.usePeriod} onChange={(e) => setDraft({ ...draft, usePeriod: e.target.checked, endDate: e.target.checked ? (draft.endDate || draft.date) : "" })} /><span>기간 설정</span><small>선택한 기간의 모든 날짜에 노출합니다</small></label>
          <label>제목<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="민원 제목을 입력하세요" required /></label><label>내용<textarea rows={7} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} placeholder="복사해 사용할 민원 내용을 입력하세요" required /></label>
          <label>처리기관<input value={draft.agency} onChange={(e) => setDraft({ ...draft, agency: e.target.value })} placeholder="처리기관을 입력하거나 아래에서 선택하세요" required /></label><div className="agency-chips" aria-label="자주 쓰는 처리기관">{agencies.map((agency) => <button type="button" className={draft.agency === agency ? "active" : ""} onClick={() => setDraft({ ...draft, agency })} key={agency}>{agency}</button>)}</div>
          <label className="photo-upload">첨부사진 <small>선택사항 · 최대 2장 · 장당 4MB</small><input type="file" accept="image/*" multiple onChange={(e) => { const next = Array.from(e.target.files || []).slice(0, Math.max(0, 2 - (draft.images?.length || 0))); setPhotoFiles(next); }} /></label>
          {((draft.images?.length || 0) + photoFiles.length > 0) && <div className="photo-preview">{(draft.images || []).map((image) => <div key={image.url}><img src={`/api/images?url=${encodeURIComponent(image.url)}`} alt="기존 첨부사진" /><button type="button" onClick={() => setDraft({ ...draft, images: (draft.images || []).filter((item) => item.url !== image.url) })}>사진 제외</button></div>)}{photoFiles.map((file) => <div key={`${file.name}-${file.lastModified}`}><span>{file.name}</span></div>)}</div>}
          <p className="photo-note">첨부사진은 저장 공간 절약을 위해 업로드 10일 후 자동 삭제됩니다.</p>
          {message && <p className={message.includes("않") ? "form-message error" : "form-message"} role="status">{message}</p>}<div className="form-buttons"><button className="primary" disabled={busy} type="submit">{busy ? "처리 중…" : editing ? "수정 저장" : "민원 등록"}</button>{editing && <button type="button" onClick={() => { setEditing(null); setDraft(emptyDraft()); }}>취소</button>}</div></form></>}
      </section></div>}
      <footer><span>오늘의민원</span><p>더 나은 우리 동네를 위한 작은 목소리</p><p>© 2026 Today’s Minwon</p></footer>
    </main>
  );
}

function CopyField({ label, value, copyKey, copied, onCopy, multiline = false }: { label: string; value: string; copyKey: string; copied: string; onCopy: (value: string, key: string) => void; multiline?: boolean }) {
  return <div className={multiline ? "copy-field multiline" : "copy-field"}><span className="field-label">{label}</span><p>{value}</p><button onClick={() => onCopy(value, copyKey)} aria-label={`${label} 복사`} className={copied === copyKey ? "copied" : ""}>{copied === copyKey ? "복사됨 ✓" : "복사"}</button></div>;
}
