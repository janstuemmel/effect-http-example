import {expect, it} from 'vitest';
import { App } from './app.js';
import { Effect, pipe } from 'effect';
import { IncomingMessage } from 'http'
import { createRequest } from 'node-mocks-http';

it('should route', () => {
  const r = new App().
    use('GET', '/todo/:id', ({ params }) => Effect.succeed({
      status: 200,
      body: params.id
    }));
  const req = createRequest<IncomingMessage>({ url: '/todo/1337', method: 'GET' })
  const handler = r.route(req);
  expect(Effect.runPromise(handler)).resolves.toMatchInlineSnapshot(`
    {
      "body": "1337",
      "status": 200,
    }
  `)
  req.send() 
})

it('should read request body', () => {
  const r = new App().
    use('GET', '/', ({ body }) => Effect.succeed({ status: 200, body }));
  const req = createRequest<IncomingMessage>({ url: '/todo/1337', method: 'GET' })
  const handler = r.route(req);
  expect(Effect.runPromise(handler)).resolves.toMatchInlineSnapshot(`
    {
      "body": "hello world!",
      "status": 200,
    }
  `)
  req.send('hello world!') 
})

it('should route fail', () => {
  const r = new App()
    .use('GET', '/todo/:id', () => Effect.fail(new Error('test error')))
    .use('GET', '/', () => Effect.fail(500));

  const req = createRequest<IncomingMessage>({ url: '/todo/1337', method: 'GET' })

  const program = r.route(req).pipe(
    Effect.catchAll(e => Effect.succeed(e.toString()))
  );

  expect(Effect.runPromise(program)).resolves.toMatchInlineSnapshot('"Error: test error"')

  req.send();
})

it('route not found', () => {
  const r = new App()
  const s = createRequest<IncomingMessage>({ url: '/todo/1337', method: 'GET' })
  const handler = r.route(s)

  expect(Effect.runSync(handler)).toEqual({
    status: 404,
    body: 'route not found'
  })
})
