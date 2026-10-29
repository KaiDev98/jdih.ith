import { config } from 'zod';
import { setNonce } from 'get-nonce';

// Next.js runs this module before client hydration. Keep Zod's browser parser
// free of its new Function JIT probe so the production nonce CSP stays strict.
config({ jitless: true });

// Public confirmation dialogs also inject scroll-lock styles. Configure the
// document nonce before any Radix portal mounts, including client navigation.
const script = document.querySelector<HTMLScriptElement>('script[nonce]');
if (script?.nonce) setNonce(script.nonce);
