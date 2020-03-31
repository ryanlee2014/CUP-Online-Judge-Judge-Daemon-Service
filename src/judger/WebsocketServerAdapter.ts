import BindSocketEventManager from '../websocket/event/BindSocketEventManager';
import {IWebsocketServerAdapter } from './WebsocketServer';
import WebSocket from "ws";
import UUIDSocketManager from "../container/UUIDSocketManager";

export class WebsocketServerAdapter implements IWebsocketServerAdapter {
  public onError(_server: WebSocket, message: any): any {
    console.log(message);
  }

  public async onJudgerMessage(_server: WebSocket, message: any) {
    const {finish, judgerId} = message;
    BindSocketEventManager.getSocket(judgerId).emit("judger", message);
    if (finish) {
      const {solutionId, socketId} = UUIDSocketManager.getUUIDSocketInfo(judgerId);
      UUIDSocketManager.removeUUIDInfo(socketId, solutionId);
      UUIDSocketManager.removeUUIDSocketInfo(judgerId);
      BindSocketEventManager.removeSocket(judgerId);
    }
  }

  public onMessage(server: WebSocket, message: any): any {
    let request;
    try {
      request = JSON.parse(message);
    } catch (e) {
      console.log("Parse json caused error: ", e);
      return;
    }
    if (request.type && typeof request.type === "string") {
      server.emit(request.type, request.value, request);
    } else {
      console.error(`Error:Parsing message failed.Receive data:${message}`);
    }
  }
}

export default new WebsocketServerAdapter();
