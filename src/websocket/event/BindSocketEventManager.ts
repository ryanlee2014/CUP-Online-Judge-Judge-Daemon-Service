import { Socket } from 'socket.io';
import UUIDSocketManager from '../../container/UUIDSocketManager';
import ErrorHandler from '../../judger/ErrorHandler';
import JudgeManager from '../../judger/JudgeManager';
import LocalJudger from '../../judger/judger';
import ConcurrentLock from '../../lib/decorator/ConcurrentLock';

LocalJudger.setErrorHandler(ErrorHandler);

export interface ISocket extends Socket {
  socketId: number
}

interface ISubmissionInfo {
  solution_id: number,
  source: string,
  custom_input: string | undefined | null,
  test_run: boolean,
  language: number,
  user_id: string,
  problem_id: number,
  spj: boolean,
  time_limit: number,
  memory_limit: number
}

interface ISubmissionRequest {
  solutionId: string,
  data: any,
  admin: boolean,
  no_sim: boolean,
  priority: number
}

interface IRejectInfo {
  reason: string,
  solutionId: number | string
}

class BindSocketEventManager {

  id = 0;

  socketSet = {};

  distinceSocketSet = {};

  constructor() {
    LocalJudger.on('change', (payload) => {
      for (const socketName in this.distinceSocketSet) {
        if (Object.prototype.hasOwnProperty.call(this.distinceSocketSet, socketName)) {
          this.distinceSocketSet[socketName].emit('change', payload);
        }
      }
    });
  }

  @ConcurrentLock
  async incrementId() {
    ++this.id;
    this.id %= 1000;
  }

  public async bindSocket(socket: ISocket) {
    socket.socketId = this.id;
    this.distinceSocketSet[this.id] = socket;
    await this.incrementId();
    socket.on('submission', async (payload: ISubmissionRequest) => {
      const { solutionId, data, admin, no_sim, priority } = payload;
      const uuid = UUIDSocketManager.generateUUID();
      if (UUIDSocketManager.getUUIDInfo(socket.socketId, solutionId)) {
        return;
      }
      UUIDSocketManager.setUUIDSocketInfo(uuid, socket.socketId, solutionId);
      UUIDSocketManager.setUUIDInfo(socket.socketId, solutionId, uuid);
      const problemId = (data as ISubmissionInfo).problem_id;
      if (await LocalJudger.problemDataExist(problemId)) {
        console.log(`Get Submission: ${solutionId}`);
        JudgeManager.updateSubmissionInfo(solutionId, data);
        this.setSocket(uuid, socket);
        LocalJudger.addTask(solutionId, admin, no_sim, priority, socket.socketId);
      } else {
        console.log(`Lost data: ${problemId}`);
        socket.emit('reject_judge', {
          reason: 'No data',
          solutionId: solutionId
        } as IRejectInfo);
      }
    });

    socket.on('status', () => {
      socket.emit('status', LocalJudger.getStatus());
    });

    socket.on('disconnect', () => {
      delete this.distinceSocketSet[socket.socketId];
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
      setTimeout(() => {
        delete this.socketSet[solutionId];
      }, 60000);
    }
  }
}

export default new BindSocketEventManager();
