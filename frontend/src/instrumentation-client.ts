import { z } from 'zod';

// Next.js runs this module before client hydration. Keep Zod's browser parser
// free of its new Function JIT probe so the production nonce CSP stays strict.
z.config({ jitless: true });
