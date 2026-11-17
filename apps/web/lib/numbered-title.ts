/** Student works carry the class number in the title ("07_하늘"). It sorts files and submissions,
 * but book covers show the title alone and lists show the number as a small badge. */
const NUMBERED=/^(\d{2})_([\s\S]*)$/;
export function splitNumberedTitle(title:string):{number:string|null;rest:string}{
 const match=NUMBERED.exec(title);
 return match?{number:match[1]!,rest:match[2]!}:{number:null,rest:title};
}
export const coverTitle=(title:string)=>splitNumberedTitle(title).rest;
