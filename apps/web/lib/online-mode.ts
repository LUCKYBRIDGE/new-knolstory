/**
 * KnolStory works fully on the device by default: works are kept in this browser and in 작품 파일.
 * Accounts and online works are optional and only appear in builds made with NEXT_PUBLIC_KNOL_ONLINE=1
 * (ADR 0026). Without it the app never calls the online API.
 */
export const onlineEnabled = process.env.NEXT_PUBLIC_KNOL_ONLINE === '1';
