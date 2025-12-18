import config from '../config';
import type { WebSocketMessage } from '../types';

type EventCallback = (data: WebSocketMessage) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private noteId: string | null = null;
  private userId: string | null = null;
  private username: string | null = null;
  private token: string | null = null;
  private listeners: Map<string, EventCallback[]> = new Map();
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;
  private readonly reconnectDelay: number = 1000;

  connect(noteId: string, userId: string, username: string, token?: string): void {
    this.noteId = noteId;
    this.userId = userId;
    this.username = username;
    this.token = token || null;

    const wsUrl = `${config.wsUrl}/ws/notes/${noteId}?user_id=${userId}&username=${encodeURIComponent(username)}${token ? `&token=${token}` : ''}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connected', { type: 'connected' });

      // Request current content
      this.send({
        type: 'get_content',
      });
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        this.emit(message.type, message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error: Event) => {
      console.error('WebSocket error:', error);
      this.emit('error', { type: 'error', message: 'WebSocket error occurred' });
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.emit('disconnected', { type: 'disconnected' });

      // Attempt to reconnect
      if (
        this.reconnectAttempts < this.maxReconnectAttempts &&
        this.noteId &&
        this.userId &&
        this.username
      ) {
        setTimeout(() => {
          this.reconnectAttempts++;
          console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
          this.connect(this.noteId!, this.userId!, this.username!, this.token || undefined);
        }, this.reconnectDelay * this.reconnectAttempts);
      }
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    // Don't clear listeners - they might be reused on reconnect
  }

  send(message: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  sendEdit(operation: string, position: number, content?: string, length?: number): void {
    this.send({
      type: 'edit',
      operation,
      position,
      content,
      length,
    });
  }

  sendCursor(position: number, selectionEnd: number): void {
    this.send({
      type: 'cursor',
      position,
      selection_end: selectionEnd,
    });
  }

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback): void {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: WebSocketMessage): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach((callback) => callback(data));
    }
  }
}

export default new WebSocketService();
