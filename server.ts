import { Context, Layer, pipe, Exit, Effect, Runtime, Config, Cause } from 'effect';
import http from 'http';

class HttpError {
  readonly _tag = 'HttpError'
}

type HttpResponse = {
  status: number
  body?: string
}

interface AppConfig {
  helloString: string,
  env: string
}

const AppConfig = Context.Tag<AppConfig>();

const AppConfigLive = Layer.effect(AppConfig, Effect.map(
  Effect.config(Config.string("ENV")),
  (env) => AppConfig.of({
    helloString: 'world',
    env
  }))
);


interface ExampleService {
  sayHello: (str?: string) => Effect.Effect<never, never, string>
}

const ExampleService = Context.Tag<ExampleService>()

const ExampleServiceLive = Layer.effect(ExampleService, Effect.map(AppConfig, (c) => ExampleService.of({
  sayHello: (str?: string) => Effect.succeed(`Hello ${str || c.helloString}`)
})))

const handleRequest = (req: http.IncomingMessage) => Effect.all([ExampleService]).pipe(
  Effect.flatMap(([s1]) => s1.sayHello()),
  Effect.map((body): HttpResponse => ({ status: 200, body })),
);

const handleResponse = (res: http.ServerResponse) => (exit: Exit.Exit<HttpError, HttpResponse>) => {
  Exit.match(exit, {
    onSuccess: (value) => res.write(JSON.stringify(value)),
    onFailure: (cause) => res.write(Cause.pretty(cause)),
  })
  res.end();
};

const handleCloseServer = (server: http.Server) => <R>(done: (done: Effect.Effect<R, never, void>) => void) => {
  server.close(() => done(Effect.unit));
};

type AppContext = Effect.Effect.Context<ReturnType<typeof handleRequest>>

const server = () => Effect.runtime<AppContext>().pipe(
  Effect.flatMap((runtime) => Effect.asyncInterrupt<never, string, never>((done) => {
    const server = http.createServer()

    server.once('error', err => done(Effect.fail(`${err}`)));
  
    server.on('request', (req, res) => Runtime.runCallback(runtime)(
      handleRequest(req),
      handleResponse(res)),
    );
  
    server.listen(3000);
  
    return Effect.async(handleCloseServer(server));
  })),
)

pipe(
  server(),
  Effect.provideLayer(AppConfigLive.pipe(Layer.provide(ExampleServiceLive))),
  Effect.tapError(e => Effect.log(`${e}`)),
  Effect.runFork,
)