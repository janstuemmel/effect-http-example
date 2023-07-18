import * as Schema from '@effect/schema/Schema'
import * as Effect from '@effect/io/Effect';
import { Input } from 'effect-http';
import { api } from '../api.js';

export const schema = {
  response: Schema.string,
  params: {
    id: Schema.string
  }
};

export const handler = ({
  params: { id }
}: Input<typeof api, 'todo'>) => Effect.succeed(id)

