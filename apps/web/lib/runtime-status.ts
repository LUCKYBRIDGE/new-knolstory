import type { RuntimeEvent } from '@knolstory/runtime-contract';

type RuntimeStatus = Readonly<{ failed: boolean; recoverable:boolean; message: string }>;
type RuntimeStatusSignal = Extract<RuntimeEvent, { type: 'ready' | 'error' }> | { type: 'waiting' | 'audioFailed' | 'rendered' | 'retry' };

export const initialRuntimeStatus: RuntimeStatus = { failed: false, recoverable:false, message: '이야기 무대 준비 중' };

/** Bridge diagnostics remain in logs; a late wait/ready must not hide a failure. */
export function runtimeStatusReducer(status: RuntimeStatus, signal: RuntimeStatusSignal): RuntimeStatus {
  switch (signal.type) {
    case 'error':
      return { failed: true, recoverable:true, message: '이야기 무대를 보여 주지 못했어요. 편집으로 돌아가 이 컷의 그림과 소리를 살펴본 뒤 다시 읽어 주세요.' };
    case 'audioFailed':
      return { failed: true, recoverable:true, message: '소리를 불러오지 못했어요. 편집으로 돌아가 이 컷의 음악·효과음을 살펴본 뒤 다시 읽어 주세요.' };
    case 'retry':
      return initialRuntimeStatus;
    case 'waiting':
      return status.failed ? status : { failed: false, recoverable:true, message: '이야기 무대 연결에 시간이 걸려요. 잠시 기다리거나 편집으로 돌아가 작품을 저장한 뒤 다시 읽기를 시작해 주세요.' };
    case 'ready':
      return status.failed ? status : { failed: false, recoverable:false, message: '이야기 무대 연결됨' };
    case 'rendered':
      return { failed: false, recoverable:false, message: '이야기 무대 연결됨' };
  }
}
