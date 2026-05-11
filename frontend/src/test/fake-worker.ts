// Fake Worker for vitest tests of the pyodide runner. Retains
// addEventListener listeners so tests can drive the request/response
// handshake deterministically. jsdom doesn't run real Workers, and
// PRD_code_sandbox §6.1 mandates mocking the worker anyway.
export class FakeWorker {
  private listeners: Array<(e: MessageEvent) => void> = []
  postedMessages: Array<{ type?: string; requestId?: string }> = []
  addEventListener(_type: string, l: (e: MessageEvent) => void): void {
    if (_type === 'message') this.listeners.push(l)
  }
  removeEventListener(_type: string, l: (e: MessageEvent) => void): void {
    this.listeners = this.listeners.filter((x) => x !== l)
  }
  postMessage(m: unknown): void {
    this.postedMessages.push(m as { type?: string; requestId?: string })
  }
  emit(data: unknown): void {
    for (const l of this.listeners) l(new MessageEvent('message', { data }))
  }
  terminate(): void { /* no-op */ }
}
