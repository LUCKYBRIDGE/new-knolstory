'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { compileScene, createInitialDraft, fitStage, moveActor, screenToStage } from '@knolstory/runtime-core';
import { parseRuntimeEvent, type Rect } from '../lib/runtime-events';

export function EditingProbe() {
  const [draft, setDraft] = useState(createInitialDraft);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState('actor-1');
  const [inspector, setInspector] = useState(true);
  const [ready, setReady] = useState(false);
  const [composing, setComposing] = useState(false);
  const dragCleanup = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState('Ren’Py 런타임 준비 중');
  const [rendered, setRendered] = useState(-1);
  const [renderMs, setRenderMs] = useState<number | null>(null);
  const [size, setSize] = useState({ width: 1280, height: 720 });
  const [rendererRect, setRendererRect] = useState<Rect | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const seq = useRef(0);
  const sendTimer = useRef<number | null>(null);
  const latestScene = useRef(compileScene(draft, revision));
  const pendingRevision = useRef(0);
  const sentAt = useRef(new Map<number, number>());
  const [latency, setLatency] = useState<number | null>(null);
  const scene = compileScene(draft, revision);
  const fit = fitStage(size, { width: scene.width, height: scene.height });
  const viewport = rendererRect ? { ...fit, scale: rendererRect.width / scene.width * fit.scale, offsetX: fit.offsetX + rendererRect.x * fit.scale, offsetY: fit.offsetY + rendererRect.y * fit.scale, width: rendererRect.width * fit.scale, height: rendererRect.height * fit.scale } : fit;
  const active = scene.actors.find(actor => actor.id === selected) ?? scene.actors[0];

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      if (rect && rect.width > 0 && rect.height > 0) { dragCleanup.current?.(); setSize({ width: rect.width, height: rect.height }); }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    function receive(message: MessageEvent) {
      if (message.origin !== window.location.origin || message.source !== frame.current?.contentWindow) return;
      const event = parseRuntimeEvent(message.data);
      if (!event) return;
      if (event.type === 'ready') { setReady(true); setStatus(`Ren’Py ${event.runtimeVersion} 연결됨`); }
      if (event.type === 'error') { setStatus(event.message); setReady(false); }
      if (event.type === 'viewportChanged') { dragCleanup.current?.(); setRendererRect(event.rendererRect); }
      if (event.type === 'sceneRendered' && event.revision === pendingRevision.current) {
        setRendered(event.revision); setRenderMs(event.renderMs); setRendererRect(event.rendererRect);
        const start = sentAt.current.get(event.revision);
        if (start !== undefined) setLatency(Math.round(performance.now() - start));
        sentAt.current.clear();
      }
    }
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);
  useEffect(() => {
    latestScene.current = compileScene(draft, revision);
    pendingRevision.current = revision;
    if (!ready || composing) {
      if (sendTimer.current !== null) window.clearTimeout(sendTimer.current);
      sendTimer.current = null;
      return;
    }
    if (sendTimer.current !== null) return;
    sendTimer.current = window.setTimeout(() => {
      sendTimer.current = null;
      const current = latestScene.current;
      sentAt.current.clear();
      sentAt.current.set(current.revision, performance.now());
      seq.current += 1;
      frame.current?.contentWindow?.postMessage({ protocol: 1, seq: seq.current, revision: current.revision, type: 'loadScene', payload: current }, window.location.origin);
    }, 33);
  }, [draft, revision, ready, composing]);
  useEffect(() => () => {
    if (sendTimer.current !== null) window.clearTimeout(sendTimer.current);
  }, []);
  useEffect(() => {
    if (ready) return;
    const timer = window.setTimeout(() => setStatus("런타임 준비가 지연되고 있습니다. 빌드 상태와 연결을 확인해 주세요."), 90000);
    return () => window.clearTimeout(timer);
  }, [ready]);
  useEffect(() => () => dragCleanup.current?.(), []);

  function changeText(text: string) { setDraft(current => ({ ...current, text })); setRevision(current => current + 1); }
  function reposition(id: string, x: number, y: number) {
    setDraft(current => moveActor(current, id, { x, y })); setRevision(current => current + 1);
  }
  function drag(event: React.PointerEvent<HTMLButtonElement>, actor: typeof scene.actors[number]) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelected(actor.id);
    const start = screenToStage({ x: event.clientX - (stage.current?.getBoundingClientRect().left ?? 0), y: event.clientY - (stage.current?.getBoundingClientRect().top ?? 0) }, viewport);
    if (!start) return;
    const target = event.currentTarget;
    function move(pointer: PointerEvent) {
      const bounds = stage.current?.getBoundingClientRect();
      if (!bounds) return;
      const point = screenToStage({ x: pointer.clientX - bounds.left, y: pointer.clientY - bounds.top }, viewport);
      if (point) reposition(actor.id, actor.rect.x + point.x - start!.x, actor.rect.y + point.y - start!.y);
    }
    function end() { target.removeEventListener('pointermove', move); target.removeEventListener('pointerup', end); target.removeEventListener('pointercancel', end); target.removeEventListener('lostpointercapture', end); dragCleanup.current = null; }
    dragCleanup.current?.(); dragCleanup.current = end;
    target.addEventListener('lostpointercapture', end);
    target.addEventListener('pointermove', move); target.addEventListener('pointerup', end); target.addEventListener('pointercancel', end);
  }
  return <main>
    <header className="global-header"><Link className="brand" href="/">놀스토리<span>이야기를 만드는 공간</span></Link><span className="lab-badge">개발 실험실</span></header>
    <section className="context-bar"><div><p className="eyebrow">반응형 편집 · Ren’Py 연결 검증</p><h1>화면은 달라져도, 이야기는 그대로</h1></div><button onClick={() => setInspector(value => !value)} aria-expanded={inspector} aria-controls="inspector">편집 패널 {inspector ? '접기' : '열기'}</button></section>
    <div className={`workspace ${inspector ? '' : 'inspector-closed'}`}>
      <aside className="cut-list" aria-label="컷 목록"><h2>첫 번째 장</h2><button className="cut selected" aria-current="true"><span>01</span>무대 연결 실험</button><p>한 컷의 배치와 대사를 바꾸며 화면 크기를 조절해 보세요.</p></aside>
      <section className="stage-panel" aria-label="이야기 무대"><div className="stage-toolbar"><strong>Ren’Py 무대</strong><span>16:9 · 1280 × 720 실험 기준</span></div>
        <div className="stage-viewport" ref={stage} data-testid="stage-viewport">
          <iframe style={{ position: "absolute", left: fit.offsetX, top: fit.offsetY, width: scene.width, height: scene.height, transform: `scale(${fit.scale})`, transformOrigin: "0 0" }} ref={frame} src="/runtime/index.html" title="Ren’Py 이야기 무대" onError={() => { setReady(false); setStatus("런타임을 불러오지 못했습니다. 입력한 내용은 편집기에 유지됩니다."); }} allow="autoplay; fullscreen" data-testid="runtime-frame" />
          {ready && scene.actors.map(actor => <button key={actor.id} className={`actor-handle ${active?.id === actor.id ? 'active' : ''}`} style={{ left: viewport.offsetX + (actor.rect.x + actor.rect.width / 2) * viewport.scale, top: viewport.offsetY + actor.rect.y * viewport.scale }} aria-label={`${actor.name} 위치 편집`} onPointerDown={event => drag(event, actor)} onClick={() => setSelected(actor.id)}><span aria-hidden="true">✥</span></button>)}
        </div>
        <div className="runtime-status" role="status"><span className={`status-dot ${ready ? 'ready' : ''}`} /><span>{status}</span><span className="render-info">편집 r{revision} · 표시 r{rendered < 0 ? '—' : rendered}{latency !== null ? ` · 반영 ${latency}ms` : ''}{renderMs !== null ? ` · 렌더 ${Math.round(renderMs)}ms` : ''}</span></div>
        {!ready && <p className="runtime-help">첫 로드는 엔진과 한국어 글꼴을 준비합니다. 런타임 빌드가 없으면 실제 무대를 표시할 수 없습니다.</p>}
        <details className="story-text"><summary>현재 컷을 글자로 읽기</summary><p><strong>{draft.speaker}</strong></p><p>{draft.text}</p></details>
      </section>
      <aside id="inspector" className="inspector" hidden={!inspector}><h2>현재 컷 편집</h2><label htmlFor="speaker">화자</label><input onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} id="speaker" value={draft.speaker} maxLength={80} onChange={event => { setDraft(current => ({ ...current, speaker: event.target.value })); setRevision(current => current + 1); }} />
        <label htmlFor="dialogue">대사</label><textarea onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} id="dialogue" value={draft.text} maxLength={8000} rows={7} onChange={event => changeText(event.target.value)} /><p className="field-hint">입력한 내용은 같은 Ren’Py 무대에 반영됩니다.</p>
        <fieldset><legend>인물 위치 · 논리 좌표</legend><label htmlFor="actor">선택한 인물</label><select id="actor" value={active?.id ?? ''} onChange={event => setSelected(event.target.value)}>{scene.actors.map(actor => <option key={actor.id} value={actor.id}>{actor.name}</option>)}</select>
          {active && <div className="coordinates">{(['x', 'y'] as const).map(axis => <label key={axis}>{axis.toUpperCase()}<input aria-label={`인물 ${axis.toUpperCase()} 좌표`} type="number" min={0} max={axis === 'x' ? scene.width - active.rect.width : scene.height - active.rect.height} value={Math.round(active.rect[axis])} onChange={event => { const value = event.target.valueAsNumber; if (Number.isFinite(value)) reposition(active.id, axis === 'x' ? value : active.rect.x, axis === 'y' ? value : active.rect.y); }} /></label>)}</div>}
        </fieldset><p className="field-hint">무대의 ✥ 손잡이를 드래그하거나 좌표를 입력하세요. 화면 크기를 바꿔도 작품 좌표는 유지됩니다.</p>
      </aside>
    </div><footer>이 화면은 편집 연결 검증용입니다. 작품 저장·분기·자산 선택은 다음 개발 단계에서 연결합니다.</footer>
  </main>;
}
