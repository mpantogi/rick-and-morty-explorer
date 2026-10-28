import { z } from 'zod'

// Zod probes `new Function` to JIT-compile object parsers; a CSP without 'unsafe-eval' reports each probe.
z.config({ jitless: true })
