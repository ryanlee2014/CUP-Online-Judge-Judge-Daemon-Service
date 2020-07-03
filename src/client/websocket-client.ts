import SocketIoClient from "socket.io-client";
import BindSocketEventManager, { ISocket } from '../websocket/event/BindSocketEventManager';

class WebsocketClient {
  sockets: SocketIOClient.Socket[];
  constructor() {
    const registry = global.config.registry;
    this.sockets = registry.map(e => SocketIoClient(e));
    this.sockets.forEach(e => {
      e.on("connect", () => {
        e.emit("type", {
          type: "judger"
        });
        BindSocketEventManager.bindSocket(e as unknown as ISocket);
      });
    });
  }

  getSockets () {
    return this.sockets;
  }
}

export default new WebsocketClient();
