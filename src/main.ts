import { pipe } from '@effect/data/Function';
import * as EffectHttp from 'effect-http';
import * as Todo from './todos/todos.js'
import { api } from './api.js';

export const server = pipe(
  api,
  EffectHttp.server,
  EffectHttp.handle('todo', Todo.handler),
  EffectHttp.exhaustive
)