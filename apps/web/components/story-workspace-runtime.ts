"use client";
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import {captureNativeSaveThumbnail} from '../lib/native-save-thumbnail';
import {runtimeAudioPaths,runtimeServiceAudioPaths,type RuntimeEvent,type RuntimeScene} from "@knolstory/runtime-contract";
import { fitStage } from "@knolstory/runtime-core";
import {observeDisplaySize} from '../lib/observe-display-size';
import {presentationPhase} from "../lib/presentation-phase";
import {readerPresentationReady} from "../lib/reader-presentation-ready";
import {ServiceAudioDelivery} from '../lib/service-audio-delivery';
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
  inputBlocked = false,
) {
  const container = useRef<HTMLDivElement>(null);
  const [containerNode,setContainerNode]=useState<HTMLDivElement|null>(null);
  const attachContainer=useCallback((node:HTMLDivElement|null)=>{container.current=node;setContainerNode(node);},[]);
  const frame = useRef<HTMLIFrameElement>(null);
  const [size, setSize] = useState({ width: 1280, height: 720 });
  const [ready, setReady] = useState(false);
  const [rendered, setRendered] = useState(-1);
  const [renderEvidence,setRenderEvidence]=useState<Extract<RuntimeEvent,{type:"sceneRendered"}>|null>(null);
  const [runtimeStatus, updateStatus] = useReducer(runtimeStatusReducer, initialRuntimeStatus);
  const callback = useRef(onEvent);
  const blocked = useRef(inputBlocked);
  useEffect(() => { blocked.current = inputBlocked; }, [inputBlocked]);
  const sizeCallback = useRef(onDisplaySize);
  useEffect(() => { sizeCallback.current = onDisplaySize; }, [onDisplaySize]);
  const latest = useRef(scene);
  const seq = useRef(0);
  const serviceDelivery=useRef<ServiceAudioDelivery|null>(null);
  if(serviceDelivery.current==null)serviceDelivery.current=new ServiceAudioDelivery();
  const confirmedServicePaths=useRef<ReadonlySet<string>>(new Set());
  const pendingServicePaths=useRef(new Map<number,readonly string[]>());
  useEffect(()=>()=>serviceDelivery.current?.clear(),[]);
  const confirmedResources=useRef(new Set<string>());
  const pendingResources=useRef(new Map<number,readonly string[]>());
  const sendTimer = useRef<number | null>(null);
  const consumedRevision = useRef(-1);
  const renderedRevision=useRef(-1);
  const captureThumbnail=useCallback(async()=>{const snapshot=latest.current;if(snapshot.mode!=='play')return undefined;for(let attempt=0;attempt<20&&renderedRevision.current!==snapshot.revision;attempt++){await new Promise(resolve=>setTimeout(resolve,25));if(latest.current!==snapshot)throw Error('저장 중 장면이 바뀌었습니다. 현재 컷에서 다시 저장해 주세요.');}if(renderedRevision.current!==snapshot.revision)return undefined;return captureNativeSaveThumbnail(frame.current,()=>latest.current===snapshot&&renderedRevision.current===snapshot.revision);},[]);
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
  useLayoutEffect(() => {
    if (!enabled || !containerNode) return;
    return observeDisplaySize(containerNode,next=>{
      setSize(previous=>previous.width===next.width&&previous.height===next.height?previous:next);
      sizeCallback.current?.(next);
    });
  }, [enabled,containerNode,scene.mode]);
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
        confirmedServicePaths.current=new Set();
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
        renderedRevision.current=event.revision;
        updateStatus({ type: 'rendered' });
        for(const id of pendingResources.current.get(event.revision)??[])confirmedResources.current.add(id);
        pendingResources.current.clear();
        confirmedServicePaths.current=new Set(pendingServicePaths.current.get(event.revision)??[]);pendingServicePaths.current.clear();
      }
      if (
        event.type === "advanceRequested" ||
        event.type === "backRequested" ||
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
          if (blocked.current) return;
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
      const paths=runtimeAudioPaths(current.audio);
      const servicePaths=runtimeServiceAudioPaths(current.audio);
      let audioResources,serviceAudioResources;
      try { audioResources=paths.some(path=>/assets\/audio\/[a-f0-9]{64}\./.test(path)) ? (await listAudioResources()).filter(r=>!confirmedResources.current.has(r.id)&&paths.some(path=>path.includes(r.id.split(':')[2]))) : [];serviceAudioResources=await serviceDelivery.current!.load(servicePaths,confirmedServicePaths.current); }
      catch(issue) {
        console.error('Story audio resources failed to load', issue);
        if(current.revision===latest.current.revision) updateStatus({ type: 'audioFailed' });
        return;
      }
      if(current.revision!==latest.current.revision)return;
      pendingResources.current.set(current.revision,audioResources.map(r=>r.id));
      pendingServicePaths.current.set(current.revision,servicePaths);
      frame.current?.contentWindow?.postMessage(
        {
          protocol: 1,
          seq: seq.current,
          revision: current.revision,
          type: "loadScene",
          payload: current, audioResources, serviceAudioResources,
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
  const audioPending=scene.mode==='play' && runtimeAudioPaths(scene.audio).length>0 && renderEvidence?.audioState?.unlocked!==true;
  return {
    captureThumbnail,
    presentationReady: readerPresentationReady(scene, rendered, confirmed, audioPending, runtimeStatus.failed),
    audioPending,
    container,
    attachContainer,
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
