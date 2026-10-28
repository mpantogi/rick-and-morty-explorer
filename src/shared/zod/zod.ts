import { z } from 'zod'

// Zod probes `new Function` to JIT-compile object parsers; a CSP without 'unsafe-eval' reports each
// probe. Schema modules import `z` from here, so ESM runs this config before any schema is built.
z.config({ jitless: true })

export { z }
