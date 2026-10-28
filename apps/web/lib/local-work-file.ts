/** A confirmed save requires closing the stream and reading the same bytes back. */
export type LocalWorkFileHandle = {
  name: string;
  getFile: () => Promise<{text: () => Promise<string>}>;
  createWritable: () => Promise<{
    write: (text: string) => Promise<void>;
    close: () => Promise<void>;
    abort: () => Promise<void>;
  }>;
};
export type LocalWorkFilePicker = (options: {
  suggestedName: string;
  types: {description: string; accept: Record<string, string[]>}[];
}) => Promise<LocalWorkFileHandle>;
export type LocalWorkFileSaveInput = {
  workKey: string;
  name: string;
  extension: '.knolstory' | '.shortstory';
  serialize: () => Promise<string>;
  saveAs?: boolean;
  isCurrent?: () => boolean;
};
export type LocalWorkFileSaveResult = {
  kind: 'saved' | 'download-requested' | 'cancelled';
  name: string;
};

export type LocalFileSession = {
  getOrCreate: (factory: () => ReturnType<typeof createLocalWorkFileSaver>) => ReturnType<typeof createLocalWorkFileSaver>;
};
/** The session owns its saver independently of React props and settings mounts. */
export function createLocalWorkFileSession(): LocalFileSession {
  let saver: ReturnType<typeof createLocalWorkFileSaver> | undefined;
  return {getOrCreate(factory) {return saver ??= factory();}};
}

/** Only messages authored by this file may be shown directly in the editor. */
class LocalWorkFileError extends Error {}

export function localWorkFileErrorMessage(issue: unknown): string {
  if (issue instanceof LocalWorkFileError) return issue.message;
  if (issue instanceof DOMException) {
    if (issue.name === 'NotAllowedError' || issue.name === 'SecurityError') {
      return '파일을 사용할 권한을 확인해 주세요. 다시 시도할 때 권한을 허용하거나, 다른 파일로 저장해 주세요.';
    }
    if (issue.name === 'QuotaExceededError') {
      return '기기의 저장 공간을 확인한 뒤 다시 시도하거나, 다른 위치의 파일로 저장해 주세요.';
    }
  }
  return '파일을 읽거나 쓰는 중 문제가 생겼어요. 파일이 열려 있는 다른 프로그램을 확인한 뒤 다시 시도하거나, 다른 파일로 저장해 주세요.';
}

function fileName(name: string, extension: LocalWorkFileSaveInput['extension']) {
  const base = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim()
    .replace(/\.(knolstory|shortstory)$/i, '').replace(/[. ]+$/, '');
  return `${base || '작품'}${extension}`;
}

async function writeVerified(handle: LocalWorkFileHandle, text: string, isCurrent?: () => boolean) {
  const stream = await handle.createWritable();
  // Opening a writable may await permission or disk access. Do not start a new
  // write after navigation; once writing starts, finish and verify that write.
  if (isCurrent && !isCurrent()) {
    await stream.abort();
    return false;
  }
  try {
    await stream.write(text);
    await stream.close();
  } catch (error) {
    // Keep the original disk/permission error even if cleanup itself fails.
    try {await stream.abort();} catch { /* The caller still receives the write error. */ }
    throw error;
  }
  // Android document providers may briefly return their pre-close snapshot.
  // Retry reads only, never the write: success still requires exact content.
  for (const delay of [0, 100, 250, 500, 1000]) {
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    if (await (await handle.getFile()).text() === text) return true;
  }
  throw new LocalWorkFileError('저장한 파일의 내용을 확인하지 못했습니다. 다른 이름으로 저장해 주세요.');
}

/** Keep handles per work, never in browser storage or under another work identity. */
export function createLocalWorkFileSaver(options: {
  pick?: LocalWorkFilePicker;
  download: (text: string, name: string) => void;
}) {
  const files = new Map<string, {handle: LocalWorkFileHandle; verifiedText: string}>();
  let activeSave = false;
  return {
    async save(input: LocalWorkFileSaveInput): Promise<LocalWorkFileSaveResult> {
      if (activeSave) throw new LocalWorkFileError('파일을 저장 중입니다. 잠시 후 다시 시도해 주세요.');
      if (!input.workKey.trim()) throw new LocalWorkFileError('저장할 작품을 확인해 주세요.');
      if (!['.knolstory', '.shortstory'].includes(input.extension)) throw new LocalWorkFileError('지원하지 않는 작품 파일 형식입니다.');
      const name = fileName(input.name, input.extension);
      const identity = JSON.stringify([input.extension, input.workKey]);
      activeSave = true;
      try {
        const previous = input.saveAs ? undefined : files.get(identity);
        // Invoke the picker in the trusted click stack, before serialization awaits.
        let handle = previous?.handle;
        if (!handle && options.pick) {
          try {
            handle = await options.pick({suggestedName: name, types: [{
              description: '놀스토리 작품 파일', accept: {'application/octet-stream': [input.extension]},
            }]});
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') return {kind: 'cancelled', name};
            throw error;
          }
        }
        const baseline = handle ? previous?.verifiedText ?? await (await handle.getFile()).text() : undefined;
        const text = await input.serialize();
        if (new Blob([text]).size > 25_000_000) throw new LocalWorkFileError('작품 파일은 25 MB까지 저장할 수 있습니다.');
        if (input.isCurrent && !input.isCurrent()) return {kind: 'cancelled', name};
        if (!handle) {
          options.download(text, name);
          return {kind: 'download-requested', name};
        }
        if (await (await handle.getFile()).text() !== baseline) {
          throw new LocalWorkFileError('파일이 외부에서 변경되었습니다. 원본을 보존하고 다른 이름으로 저장해 주세요.');
        }
        if (input.isCurrent && !input.isCurrent()) return {kind: 'cancelled', name};
        if (!await writeVerified(handle, text, input.isCurrent)) return {kind: 'cancelled', name};
        files.set(identity, {handle, verifiedText: text});
        return {kind: 'saved', name: handle.name};
      } finally {
        activeSave = false;
      }
    },
  };
}
