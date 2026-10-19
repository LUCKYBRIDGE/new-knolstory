import {estimateDialogueCapacity,LANDSCAPE_DIALOGUE_REFERENCE,PORTRAIT_DIALOGUE_REFERENCE,type DialogueCapacityReference} from '../lib/dialogue-capacity';
import styles from './dialogue-capacity-hint.module.css';
type Props={text:string;reference?:DialogueCapacityReference};
export function DialogueCapacityHint({text,reference}:Props){
 const landscape=estimateDialogueCapacity(text,LANDSCAPE_DIALOGUE_REFERENCE);
 const portrait=estimateDialogueCapacity(text,PORTRAIT_DIALOGUE_REFERENCE);
 const custom=reference?estimateDialogueCapacity(text,reference):null;
 return <div className={styles.hint}>
  <p aria-live="polite" aria-atomic="true">가로 예상 {landscape.lineCount}/{landscape.lineBudget}줄 · 세로 예상 {portrait.lineCount}/{portrait.lineBudget}줄 · {landscape.overflow&&portrait.overflow?'가로·세로 글 넘김 예상':landscape.overflow?'가로 글 넘김 예상':portrait.overflow?'세로 글 넘김 예상':'두 양식 모두 한 화면 예상'}</p>
  <details><summary>글 분량 계산 기준</summary>
   <p>현재 {portrait.characterCount}자(공백·줄바꿈 포함) · Enter {portrait.manualBreaks}회. 기본 글자 기준으로 한 줄에 한글 약 {landscape.columnsPerLine}자(가로)·{portrait.columnsPerLine}자(세로)를 담는다고 가정한 예상입니다.</p>
   <p>16:9·9:16 이야기 화면에서 기본 본문 최대 3줄·5줄을 기준으로 계산합니다. Enter를 누르면 남은 칸과 관계없이 다음 줄을 사용하며, 빈 줄도 한 줄을 차지합니다. 한글·이모지는 약 한 칸, 영문·숫자·공백은 약 반 칸으로 셉니다. 기본 글꼴·문장 경계에 따라 페이지 나눔이 달라질 수 있습니다. 독자의 글씨 크기 조절은 페이지의 글 분량을 바꾸지 않고 글 영역 높이만 바꿉니다. 글자 수 제한이 아니며 실제 미리보기에서 확인해주세요.</p>
   {custom&&<p>전달된 본문 영역 참고: 약 {custom.lineCount}/{custom.lineBudget}줄 · {custom.overflow?'글 넘김 예상':'한 화면 예상'}</p>}
   <p>분량을 채울 필요는 없습니다. 대사는 한 번의 말, 해설은 하나의 행동이나 분위기처럼 자연스러운 호흡으로 나누면 읽기 편합니다.</p>
  </details>
 </div>;
}
