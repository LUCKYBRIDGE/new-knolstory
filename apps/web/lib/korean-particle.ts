/** Korean particles after a word the writer chose (a title, a choice label): 을/를, 이/가, 은/는, 과/와.
 * A Hangul syllable with a final consonant takes the first form; without one, the second.
 * A word that ends in anything else (digits, Latin letters, punctuation) gets both forms, e.g. 을(를). */
export type ParticlePair='을/를'|'이/가'|'은/는'|'과/와';
export function particle(word:string,pair:ParticlePair):string{
 const [withFinal,withoutFinal]=pair.split('/') as [string,string];
 const code=word.trim().codePointAt(word.trim().length-1)??0;
 if(code<0xac00||code>0xd7a3)return `${withFinal}(${withoutFinal})`;
 return (code-0xac00)%28===0?withoutFinal:withFinal;
}
/** ‘제목’ followed by its particle. */
export function quoted(word:string,pair:ParticlePair):string{return `‘${word}’${particle(word,pair)}`;}
