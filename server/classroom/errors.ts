/** Safe public classroom error; no manuscript or credential payloads. */
export class ClassroomError extends Error{
 constructor(readonly status:number,readonly code:string){super(code);this.name='ClassroomError';}
}
