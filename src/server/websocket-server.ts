import SocketIo from "socket.io"
import BindSocketEventManager from '../websocket/event/BindSocketEventManager';
import httpServer from './http-server';
const io = SocketIo(httpServer);

io.on("connection", async (socket) => {
  await BindSocketEventManager.bindSocket(socket as any);
});

export default io;
