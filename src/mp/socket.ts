import type { ClientMessage, ServerMessage } from './protocol';

export type SocketStatus = 'connecting' | 'open' | 'closed';

export interface MpSocket {
  send(msg: ClientMessage): void;
  close(): void;
}

export interface ConnectHandlers {
  onMessage(msg: ServerMessage): void;
  onStatus(status: SocketStatus): void;
}

export function connect(
  url: string,
  handlers: ConnectHandlers,
  WS: typeof WebSocket = WebSocket
): MpSocket {
  const ws = new WS(url);
  handlers.onStatus('connecting');
  ws.onopen = () => handlers.onStatus('open');
  ws.onclose = () => handlers.onStatus('closed');
  ws.onmessage = (e: MessageEvent) => {
    try {
      handlers.onMessage(JSON.parse(e.data) as ServerMessage);
    } catch {
      /* ignore malformed frame */
    }
  };
  return {
    send: (msg) => {
      if (ws.readyState === WS.OPEN) ws.send(JSON.stringify(msg));
    },
    close: () => ws.close(),
  };
}
