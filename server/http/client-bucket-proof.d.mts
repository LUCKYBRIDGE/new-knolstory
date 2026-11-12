/** Server-only transport proof for selecting a stable opaque rate bucket; never authorization. */
export const CLIENT_BUCKET_HEADER='x-knolstory-client-proof';
export type ClientBucketProofConfig=Readonly<{key:string;origin:string;clock?:()=>number}>;
export type ClientBucketRequest=Readonly<{method?:string;url?:string}>;
export type ClientBucketProofRequest=ClientBucketRequest & Readonly<{
 headers?:Readonly<Record<string,string|string[]|undefined>>;
}>;
export function createClientBucketSigner(config:ClientBucketProofConfig):(request:ClientBucketRequest,ip:string)=>string;
export function createClientBucketVerifier(config:ClientBucketProofConfig):(request:ClientBucketProofRequest)=>string|null;
