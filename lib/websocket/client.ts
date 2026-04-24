import {
  WebSocketMessage,
  WebSocketEventType,
  WebSocketServerEventType,
  ConnectionState,
} from "@/types/websocket";
import { rateLimiter } from "@/lib/rate-limiter";
import { handleAppError } from "@/lib/error-handler";

const RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private messageHandlers: Map<
    WebSocketEventType,
    Set<(msg: WebSocketMessage) => void>
  >;
  private connectionStateHandlers: Set<(state: ConnectionState) => void>;
  private connectionState: ConnectionState = "disconnected";
  private reconnectAttempts = 0;
  private reconnectDelay = INITIAL_RECONNECT_DELAY;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private clientId: string | null = null;
  private walletAddress: string | null = null;

  constructor(url: string) {
    this.url = url;
    this.messageHandlers = new Map();
    this.connectionStateHandlers = new Set();
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Prevent multiple simultaneous connection attempts
        if (
          this.connectionState === "connecting" ||
          this.connectionState === "connected"
        ) {
          return resolve();
        }

        this.setConnectionState("connecting");
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log("[WebSocket Client] Connected");
          this.reconnectAttempts = 0;
          this.reconnectDelay = INITIAL_RECONNECT_DELAY;
          this.setConnectionState("connected");
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WebSocketMessage;

            // Handle connection established
            if (message.type === "connection_established") {
              this.clientId = message.payload.clientId;
            }

            // Handle server-side errors (Preserves clean server messages)
            if (message.type === "error") {
              handleAppError(
                new Error(message.payload.message || "Server error"),
                "SEND_MESSAGE",
              );
            }

            // Call registered handlers
            const handlers = this.messageHandlers.get(message.type);
            handlers?.forEach((handler) => {
              try {
                handler(message);
              } catch (e) {
                console.error("Handler error", e);
              }
            });
          } catch (error) {
            console.error("[WebSocket Client] Parse error", error);
          }
        };

        this.ws.onerror = (error) => {
          this.setConnectionState("error");

          // FIREWALL: Replaces technical Event object with a clean string for the toast
          handleAppError("WS_CONNECTION_FAILED", "NETWORK");

          reject(error);
        };

        this.ws.onclose = (event) => {
          this.setConnectionState("disconnected");
          // Reconnect only if not a manual disconnect
          if (event.code !== 1000) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        this.setConnectionState("error");
        handleAppError(error, "NETWORK");
        reject(error);
      }
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= RECONNECT_ATTEMPTS) {
      handleAppError("RECONNECT_LIMIT_REACHED", "NETWORK");
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      MAX_RECONNECT_DELAY,
    );

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(() => {});
    }, delay);
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }

    this.setConnectionState("disconnected");
  }

  send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  onMessage(
    type: WebSocketServerEventType,
    handler: (msg: WebSocketMessage) => void,
  ) {
    if (!this.messageHandlers.has(type))
      this.messageHandlers.set(type, new Set());
    this.messageHandlers.get(type)?.add(handler);
    return () => this.messageHandlers.get(type)?.delete(handler);
  }

  onConnectionStateChange(handler: (state: ConnectionState) => void) {
    this.connectionStateHandlers.add(handler);
    return () => this.connectionStateHandlers.delete(handler);
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.connectionStateHandlers.forEach((h) => h(state));
    }
  }

  isConnected = () =>
    this.connectionState === "connected" &&
    this.ws?.readyState === WebSocket.OPEN;

  // --- Domain Methods ---

  authenticate(
    userId: string,
    walletAddress: string,
    displayName: string,
    avatarUrl?: string,
  ) {
    this.walletAddress = walletAddress;
    this.send({
      type: "auth",
      payload: { userId, walletAddress, displayName, avatarUrl },
      timestamp: Date.now(),
    });
  }

  joinRoom = (roomId: string) =>
    this.send({
      type: "room_join",
      payload: { roomId },
      timestamp: Date.now(),
    });
  leaveRoom = (roomId: string) =>
    this.send({
      type: "leave_room",
      payload: { roomId },
      timestamp: Date.now(),
    });

  sendMessage(
    roomId: string,
    content: string,
  ): { success: boolean; error?: string } {
    if (!this.walletAddress) {
      handleAppError("Wallet not connected", "WALLET_CONNECT");
      return { success: false };
    }

    // Rate Limit Check
    const rateLimitCheck = rateLimiter.check(this.walletAddress);
    if (!rateLimitCheck.allowed) {
      const seconds = Math.ceil((rateLimitCheck.remainingMs || 0) / 1000);
      const limitMsg = `Please wait ${seconds} second${seconds !== 1 ? "s" : ""} before sending another message.`;

      // Passes the specific countdown message to the firewall
      handleAppError(limitMsg, "SEND_MESSAGE");
      return { success: false, error: limitMsg };
    }

    if (!this.isConnected()) {
      handleAppError("OFFLINE", "NETWORK");
      return { success: false };
    }

    this.send({
      type: "send_message",
      payload: { roomId, content },
      timestamp: Date.now(),
    });
    return { success: true };
  }

  notifyTyping = (roomId: string) =>
    this.send({ type: "typing", payload: { roomId }, timestamp: Date.now() });
  notifyStopTyping = (roomId: string) =>
    this.send({
      type: "stop_typing",
      payload: { roomId },
      timestamp: Date.now(),
    });
}

let instance: WebSocketClient | null = null;

export function getWebSocketClient(url?: string): WebSocketClient {
  if (!instance) {
    const wsUrl =
      url || process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";
    instance = new WebSocketClient(wsUrl);
  }
  return instance;
}

export function resetWebSocketClient() {
  if (instance) {
    instance.disconnect();
    instance = null;
  }
}
