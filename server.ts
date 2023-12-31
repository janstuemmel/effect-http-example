import { Config, Context, Effect, Layer, pipe } from 'effect';
import { App, HttpError } from './src/app.js';

interface AppConfig {
  helloString: string,
  env: string
}

const AppConfig = Context.Tag<AppConfig>();

const AppConfigLive = Layer.effect(AppConfig, Effect.map(
  Effect.config(Config.string("ENV")),
  (env) => AppConfig.of({ helloString: 'world', env }))
);

const app = new App()
  .use('GET', '/todo/:id', (req) => AppConfig.pipe(
    Effect.flatMap(c => Effect.succeed({ status: 200, body: { id: req.params.id, env: c.env } }))
  ))
  .use('GET', '/foo', () => Effect.fail(new HttpError(400, 'hello worlds')))
  .use('GET', '/', () => Effect.fail(new HttpError(500, 'hello2')))

const program = pipe(
  app.serve(3011),
  Effect.provideLayer(AppConfigLive),
  Effect.tapError(e => Effect.log(`${e}`)),
)

Effect.runFork(program)