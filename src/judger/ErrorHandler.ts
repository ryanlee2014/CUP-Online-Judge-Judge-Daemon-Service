import BindSocketEventManager from '../websocket/event/BindSocketEventManager';

class ErrorHandler {
  record (solutionId: number | string, recordId: number | string) {
    BindSocketEventManager.getSocket(solutionId + "").emit("error_record", {
      solutionId,
      recordId
    })
  }
}

export default new ErrorHandler();
