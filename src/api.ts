import { pipe } from '@effect/data/Function';
import * as EffectHttp from 'effect-http';
import * as Todo from './todos/todos.js'

export const api = pipe(
  EffectHttp.api(),
  EffectHttp.get('todo', '/todos/:id', Todo.schema),
)