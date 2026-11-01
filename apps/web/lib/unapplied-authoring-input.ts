/** Invalid or unapplied fields belong to the current editing session, not its serialized project. */
export const UNAPPLIED_AUTHORING_NOTICE='아직 적용하지 못한 입력이 있어요. 표시된 값을 고치거나 원래 값으로 되돌린 뒤 다시 시도해 주세요.';
export function hasUnappliedAuthoringInput(root:Pick<ParentNode,'querySelector'>=document):boolean{
 return !!root.querySelector('[data-unsaved-draft="true"], [aria-invalid="true"]');
}
