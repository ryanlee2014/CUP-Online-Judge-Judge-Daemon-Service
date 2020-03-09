import UUIDSocketManager from '../container/UUIDSocketManager';
import BindSocketEventManager from '../websocket/event/BindSocketEventManager';

class ErrorHandler {
  record (solutionId: number | string, recordId: number | string, socketId: number) {
    BindSocketEventManager.getSocket(UUIDSocketManager.getUUIDInfo(socketId, solutionId)).emit("error_record", {
      solutionId,
      recordId
    })
  }
}

export default new ErrorHandler();
