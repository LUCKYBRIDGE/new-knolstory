export const INSTALL_PROMPT_EVENT='knol-install-prompt';
/** Runs before hydration (inline in the root layout) so an early install prompt is not lost. */
export const INSTALL_CAPTURE_SCRIPT=`addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__knolInstallPrompt=e;dispatchEvent(new Event('${INSTALL_PROMPT_EVENT}'))});addEventListener('appinstalled',function(){window.__knolInstallPrompt=null;dispatchEvent(new Event('${INSTALL_PROMPT_EVENT}'))});`;
