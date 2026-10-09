import type { RuntimeEvent } from '@knolstory/runtime-contract';

type RuntimeStatus = Readonly<{ failed: boolean; message: string }>;
type RuntimeStatusSignal = Extract<RuntimeEvent, { type: 'ready' | 'error' }> | { type: 'waiting' | 'audioFailed' | 'rendered' };

export const initialRuntimeStatus: RuntimeStatus = { failed: false, message: '이야기 무대 준비 중' };

/** Bridge diagnostics remain in logs; a late wait/ready must not hide a failure. */
export function runtimeStatusReducer(status: RuntimeStatus, signal: RuntimeStatusSignal): RuntimeStatus {
  switch (signal.type) {
    case 'error':
      return { failed: true, message: '이야기 무대를 표시하지 못했습니다. 편집으로 돌아가 현재 컷의 그림·음원을 확인한 뒤 다시 읽기를 시작해 주세요.' };
    case 'audioFailed':
      return { failed: true, message: '음원을 불러오지 못했습니다. 편집으로 돌아가 현재 컷의 음악·효과음을 확인한 뒤 다시 읽기를 시작해 주세요.' };
    case 'waiting':
      return status.failed ? status : { failed: false, message: '이야기 무대 연결에 시간이 걸립니다. 잠시 기다리거나 편집으로 돌아가 작품을 저장한 뒤 다시 읽기를 시작해 주세요.' };
    case 'ready':
      return status.failed ? status : { failed: false, message: '이야기 무대 연결됨' };
    case 'rendered':
      return { failed: false, message: '이야기 무대 연결됨' };
  }
}
