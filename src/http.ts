import http from 'http';


export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'CONNECT' | 'TRACE'

export type HttpResponse = {
  status: number
  headers?: Record<string, string>
  body?: unknown
}

export type HttpRequest<T = unknown> = {
  params: Record<string, string>
  query?: Record<string, string>
  headers?: Record<string, string>
  body?: T
}
