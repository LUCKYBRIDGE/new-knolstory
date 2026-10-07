"use client";
import { useEffect, useReducer, useRef, useState } from "react";
import type { RuntimeEvent, RuntimeScene } from "@knolstory/runtime-contract";
import { fitStage } from "@knolstory/runtime-core";
import {presentationPhase} from "../lib/presentation-phase";
import { listAudioResources } from "../lib/audio-resources";
import { parseRuntimeEvent } from "../lib/runtime-events";
import { initialRuntimeStatus, runtimeStatusReducer } from "../lib/runtime-status";

/** One runtime instance; scene updates never change iframe identity or source. */
export function useStoryRuntime(
  scene: RuntimeScene,
  composing: boolean,
  onEvent: (event: RuntimeEvent) => void,
  onDisplaySize?: (size: {width:number;height:number}) => void,
  enabled = true,
) {
  const container = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [size, setSize] = useState({ width: 1280, height: 720 });
  const [ready, setReady] = useState(false);
  const [rendered, setRendered] = useState(-1);
  const [renderEvidence,setRenderEvidence]=useState<Extract<RuntimeEvent,{type:"sceneRendered"}>|null>(null);
  const [runtimeStatus, updateStatus] = useReducer(runtimeStatusReducer, initialRuntimeStatus);
  const callback = useRef(onEvent);
  const sizeCallback = useRef(onDisplaySize);
  useEffect(() => { sizeCallback.current = onDisplaySize; }, [onDisplaySize]);
  const latest = useRef(scene);
  const seq = useRef(0);
  const confirmedResources=useRef(new Set<string>());
  const pendingResources=useRef(new Map<number,readonly string[]>());
  const sendTimer = useRef<number | null>(null);
  const consumedRevision = useRef(-1);
  const confirmedPhase = useRef<string|null>(null);
  const [confirmed, setConfirmed] = useState<string|null>(null);
  useEffect(() => {
    callback.current = onEvent;
    latest.current = scene;
  }, [onEvent, scene]);
  useEffect(() => {
    if(scene.mode==='play') {
      container.current?.parentElement?.scrollTo({top:0});
      window.scrollTo({top:0});
    }
  }, [scene.sceneId,scene.mode,scene.presentationEntry]);
  useEffect(() => {
    const node = container.current;
    if (!enabled || !node) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect && rect.width > 0 && rect.height > 0) {
        const next = {width:Math.round(rect.width),height:Math.round(rect.height)};
        setSize(next); sizeCallback.current?.(next);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);
  useEffect(() => {
    const receive = (message: MessageEvent) => {
      if (
        message.origin !== location.origin ||
        message.source !== frame.current?.contentWindow
      )
        return;
      const event = parseRuntimeEvent(message.data);
      if (!event) return;
      if (event.type === "ready") {
        setReady(true);
        updateStatus(event);
      }
      if (event.type === "error") {
        console.error('Story runtime failed', event.message);
        updateStatus(event);
      }
      if (
        event.type === "sceneRendered" &&
        event.revision === latest.current.revision
      ) {
        setRendered(event.revision); setRenderEvidence(event);
        updateStatus({ type: 'rendered' });
        for(const id of pendingResources.current.get(event.revision)??[])confirmedResources.current.add(id);
        pendingResources.current.clear();
      }
      if (
        event.type === "advanceRequested" ||
        event.type === "choiceSelected" ||
        event.type === "presentationDone"
      ) {
        if (
          event.sceneId !== latest.current.sceneId ||
          event.revision !== latest.current.revision
        )
          return;
        if (event.type === "presentationDone") {
          confirmedPhase.current = presentationPhase(latest.current);
          setConfirmed(confirmedPhase.current);
        }
        if (event.type !== "presentationDone") {
          if (
            latest.current.mode === "play" &&
            latest.current.presentation?.transition?.mode === "confirm" &&
            confirmedPhase.current !== presentationPhase(latest.current)
          )
            return;
          if (consumedRevision.current === event.revision) return;
          consumedRevision.current = event.revision;
        }
      }
      callback.current(event);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  useEffect(() => {
    if (!ready || composing) {
      if (sendTimer.current !== null) window.clearTimeout(sendTimer.current);
      sendTimer.current = null;
      return;
    }
    if (sendTimer.current !== null) return;
    sendTimer.current = window.setTimeout(async () => {
      sendTimer.current = null;
      seq.current += 1;
      const current = latest.current;
      const paths=[...(current.audio?.ambience?.action==='play'?[current.audio.ambience.audioPath]:[]),...(current.audio?.music.action==='play'?[current.audio.music.audioPath]:[]),...(current.audio?.sounds.map(s=>s.audioPath)??[])];
      let audioResources;
      try { audioResources=paths.some(path=>/assets\/audio\/[a-f0-9]{64}\./.test(path)) ? (await listAudioResources()).filter(r=>!confirmedResources.current.has(r.id)&&paths.some(path=>path.includes(r.id.split(':')[2]))) : []; }
      catch(issue) {
        console.error('Story audio resources failed to load', issue);
        if(current.revision===latest.current.revision) updateStatus({ type: 'audioFailed' });
        return;
      }
      if(current.revision!==latest.current.revision)return;
      pendingResources.current.set(current.revision,audioResources.map(r=>r.id));
      frame.current?.contentWindow?.postMessage(
        {
          protocol: 1,
          seq: seq.current,
          revision: current.revision,
          type: "loadScene",
          payload: current, audioResources,
        },
        location.origin,
      );
    }, 33);
  }, [ready, scene, composing]);
  useEffect(
    () => () => {
      if (sendTimer.current !== null) window.clearTimeout(sendTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (ready) return;
    const timer = window.setTimeout(
      () =>
        updateStatus({ type: 'waiting' }),
      90000,
    );
    return () => window.clearTimeout(timer);
  }, [ready]);
  useEffect(() => {
    if (!ready || composing || rendered === scene.revision) return;
    const timer = window.setTimeout(() => updateStatus({ type: 'waiting' }), 15000);
    return () => window.clearTimeout(timer);
  }, [ready, composing, rendered, scene.revision]);
  const audioPending=scene.mode==='play' && (scene.audio?.ambience?.action==='play'||scene.audio?.music.action==='play'||!!scene.audio?.sounds.length) && renderEvidence?.audioState?.unlocked!==true;
  return {
    audioPending,
    container,
    frame,
    ready,
    rendered,
    renderEvidence,
    status: runtimeStatus.message,
    presentationPending:
      audioPending || scene.mode === "play" &&
      scene.presentation?.transition?.mode === "confirm" &&
      confirmed !== presentationPhase(scene),
    fit: fitStage(size, { width: scene.width, height: scene.height }),
  };
}
