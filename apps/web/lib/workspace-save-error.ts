/** User-facing categories never echo validator excerpts or browser paths from a storage exception. */
export function workspaceSaveFailure(issue:unknown):string{
 const name=issue instanceof Error?issue.name:'',message=issue instanceof Error?issue.message:'';
 if(name==='QuotaExceededError'||/quota|저장 공간|용량|2MB/i.test(message))return '브라우저의 임시 보관 공간이 부족해요. 작품 파일로 저장해 주세요.';
 if(name==='SecurityError'||name==='NotAllowedError')return '브라우저에서 임시 보관을 허용하지 않아요. 작품 파일로 저장해 주세요.';
 if(/삭제/.test(message))return '다른 탭에서 작품이나 보관함이 변경됐어요. 현재 화면의 원고는 그대로 있어요.';
 if(/다른 탭|준비|먼저 불러오/.test(message))return '다른 탭에서 보관한 내용을 확인하고 있어요. 잠시 뒤 다시 시도하거나 작품 파일로 저장해 주세요.';
 return '이 브라우저에 원고를 임시 보관하지 못했어요. 현재 화면의 원고는 그대로 있어요.';
}
