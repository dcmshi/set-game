import { connect, type SocketStatus } from './socket';
import type { ServerMessage } from './protocol';

class FakeWS {
  static OPEN = 1;
  static instances: FakeWS[] = [];
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  sent: string[] = [];
  constructor(public url: string) {
    FakeWS.instances.push(this);
  }
  send(d: string) {
    this.sent.push(d);
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
  _open() {
    this.readyState = FakeWS.OPEN;
    this.onopen?.();
  }
  _msg(m: ServerMessage) {
    this.onmessage?.({ data: JSON.stringify(m) });
  }
}

beforeEach(() => (FakeWS.instances = []));

it('reports status transitions and parses inbound messages', () => {
  const statuses: SocketStatus[] = [];
  const messages: ServerMessage[] = [];
  connect(
    'ws://x',
    { onStatus: (s) => statuses.push(s), onMessage: (m) => messages.push(m) },
    FakeWS as never
  );
  const ws = FakeWS.instances[0];
  expect(statuses).toEqual(['connecting']);
  ws._open();
  ws._msg({ type: 'error', code: 'x', message: 'y' });
  expect(statuses).toEqual(['connecting', 'open']);
  expect(messages[0]).toEqual({ type: 'error', code: 'x', message: 'y' });
});

it('only sends when the socket is open, and serializes messages', () => {
  const sock = connect('ws://x', { onStatus: () => {}, onMessage: () => {} }, FakeWS as never);
  const ws = FakeWS.instances[0];
  sock.send({ type: 'startGame' });
  expect(ws.sent).toHaveLength(0);
  ws._open();
  sock.send({ type: 'startGame' });
  expect(JSON.parse(ws.sent[0])).toEqual({ type: 'startGame' });
});
