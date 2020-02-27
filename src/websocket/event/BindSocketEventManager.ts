import { Socket } from 'socket.io';
import JudgeManager from '../../judger/JudgeManager';
import LocalJudger from "../../judger/judger";
class BindSocketEventManager {

  socketSet = {};

  public bindSocket (socket: Socket) {
    socket.on("submission", (payload) => {
      const {solutionId, data, admin} = payload;
      JudgeManager.updateSubmissionInfo(solutionId, data);
      this.setSocket(solutionId, socket);
      LocalJudger.addTask(solutionId, admin);
    });
  }
  setSocket(solutionId: string, socket: Socket) {
    this.socketSet[solutionId] = socket;
  }

  getSocket(solutionId: string): Socket {
    return this.socketSet[solutionId];
  }

  removeSocket(solutionId: string) {
    if (this.socketSet[solutionId]) {
      delete this.socketSet[solutionId];
    }
  }
}

export default new BindSocketEventManager();
