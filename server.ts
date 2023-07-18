import { listen } from 'effect-http'
import { server } from './src/main.js'
import { runPromise } from '@effect/io/Effect'
import { pipe } from '@effect/data/Function'

pipe(
  server,
  listen({ port: 3000 }),
  runPromise,
)