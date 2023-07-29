import { Cause, Effect, Exit, Runtime, pipe } from "effect";
import { HttpMethod, HttpRequest, HttpResponse } from "./http.js";
import { Chemin } from '@dldc/chemin';
import http from 'http';

export class HttpError {
  readonly _tag = 'HttpError'
  constructor(
    readonly message: string,
    readonly status: number = 500
  ) {}
}

class NodeServerError {
  readonly _tag = 'NodeServerError'
}

export class Route<R, E> {
  constructor(
    readonly method: HttpMethod,
    readonly path: string,
    readonly handler: (req: HttpRequest) => Effect.Effect<R, E, HttpResponse>
  ) {}
}

export class App<R = never, E = never> {
  constructor(
    readonly routes : ReadonlyArray<Route<R, E>> = []
  ) {}

  public use = <RNext, ENext>(
    method: HttpMethod,
    path: string,
    handler: (req: HttpRequest) => Effect.Effect<RNext, ENext, HttpResponse>
  ) => new App<R | RNext, ENext | E>([
    ...this.routes,
    new Route(method, path, handler)
  ])

  public route = (req: http.IncomingMessage): Effect.Effect<R, E | HttpError, HttpResponse> => {
    for (const route of this.routes) {
      const match = Chemin.parse(route.path).match(req.url || '');
      if(match && req.method === route.method) {
        return pipe(
          readBody(req),
          Effect.flatMap((body) => route.handler({ params: match.params, body }))
        )
      }
    }
    return Effect.succeed({ status: 404, body: 'route not found' })
  }

  public serve = (port: number) => Effect.runtime<R>().pipe(
    Effect.flatMap((runtime) => Effect.async<R, E | NodeServerError | HttpError, HttpResponse>((done) => {
      const server = http.createServer();
      server.once('error', err => done(Effect.fail(new NodeServerError)));
      server.on('request', (req, res) => Runtime.runCallback(runtime)(this.route(req), handleResponse(res)));
      server.listen(port);
      return Effect.unit;
    }))
  )
}

// helper

const createResponse = (res: http.ServerResponse) => ({ status, body }: HttpResponse) => {
  res.writeHead(status)
  res.write(JSON.stringify(body))
  res.end()
}

const handleResponse = <E>(res: http.ServerResponse) => (exit: Exit.Exit<E, HttpResponse>) => Exit.match(exit, {
  onSuccess: createResponse(res),
  onFailure: () => createResponse(res)({ status: 500 }),
});

const readBody = (req: http.IncomingMessage) => Effect.async<never, HttpError, string>(done => {
  const data: Buffer[] = [];
  req.on('data', chunk => data.push(chunk))
  req.once('end', () => {
    done(Effect.succeed(Buffer.concat(data).toString('utf-8')))
  })
  req.once('error', () => {
    done(Effect.fail(new HttpError('could not read request body')))
  })
  return Effect.unit
})
