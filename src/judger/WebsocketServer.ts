import WebSocket from "ws";
import config from '../lib/config';

export interface IWebsocketServerAdapter {
  onMessage(server: WebSocket, message: any): any;

  onJudgerMessage(server: WebSocket, message: any): any;

  onError(server: WebSocket, message: any): any;
}

export class WebsocketServer {
  public PORT = process.env.PORT || config.judge.port || 0;
  public websocketServer?: WebSocket.Server;
  public adapter?: IWebsocketServerAdapter;

  public setPort(port: number) {
    console.log(`Websocket Server set port:${port}`);
    this.PORT = port;
    return this;
  }

  public startServer() {
    this.websocketServer = new WebSocket.Server({port: this.PORT});
    this.initAdapter();
    return this;
  }

  public getServer() {
    return this.websocketServer;
  }

  public initAdapter() {
    const adapter = this.adapter;
    if (!this.adapter) {
      throw new Error("Websocket Server Adapter has not set.");
    }
    if (!this.websocketServer) {
      throw new Error("Websocket Server not start!");
    }
    this.websocketServer.on("connection", (ws) => {
      ws.on("message", message => {
        adapter!.onMessage(ws, message);
      });
      ws.on("judger", message => {
        adapter!.onJudgerMessage(ws, message);
      });
      ws.on("error", message => {
        adapter!.onError(ws, message);
      });
    });
  }

  public setAdapter(adapter: IWebsocketServerAdapter) {
    this.adapter = adapter;
    return this;
  }
}

export default new WebsocketServer();
