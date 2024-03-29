/* eslint-disable no-console */
/**
 * Class LocalJudger
 */
import {spawn} from "child_process";
import events from "events";
import fs from "fs";
import os from "os";
import path from "path";
import UUIDSocketManager from '../container/UUIDSocketManager';
import config from '../lib/config';
import mkdir from '../lib/mkdir';
import JudgeManager from './JudgeManager';
import WebsocketServerAdapter from './WebsocketServerAdapter';
import WebsocketServer, {WebsocketServer as ws} from "./WebsocketServer"
import TolerableAsync from "../lib/decorator/TolerableAsync";
const PriorityQueue = require("tinyqueue");
const eventEmitter = events.EventEmitter;
class LocalJudger extends eventEmitter {

  public static formatSolutionId(solution_id: any) {
    if (typeof solution_id === "object" && solution_id !== null) {
      if (!isNaN(solution_id.submission_id)) {
        solution_id = solution_id.submission_id;
      } else if (!isNaN(solution_id.solution_id)) {
        solution_id = solution_id.solution_id;
      } else {
        console.log("Error:Not valid solution_id");
      }
    } else {
      solution_id = parseInt(solution_id);
    }
    return solution_id;
  }

  public static JudgeExists(_target: any, _propertyName: string, propertyDescriptor: PropertyDescriptor) {
    const method = propertyDescriptor.value;
    propertyDescriptor.value = async function (...args: readonly any[]) {
      const thisTarget = this as LocalJudger;
      if (thisTarget.judgerExist) {
        return method.apply(this, args);
      }
      else if (fs.existsSync(`${process.cwd()}/wsjudged`)) {
        thisTarget.judgerExist = true;
        return method.apply(this, args);
      }
      else {
        return false;
      }
    }
  }
  public judgerExist = fs.existsSync(`${process.cwd()}/wsjudged`);
  public readonly websocketServer: ws;
  public oj_home = "";
  public judge_queue = [];
  public waiting_queue = null;
  public in_waiting_queue = null;
  public judging_queue = [];
  public latestSolutionID = 0;
  public CPUModel = null;
  public CPUSpeed = null;
  public platform = null;
  public errorHandler = null;
  public SUBMISSION_INFO_PATH = "";
  public CPUDetails = null;
  /**
   * 构造判题机
   * @param {String} home_dir 评测机所在的目录
   * @param {Number} judger_num 评测机数量
   */
  constructor(home_dir: string, judger_num: number) {
    super();
    this.oj_home = home_dir;
    this.judge_queue = [...Array(judger_num).keys()].map(x => x + 1);
    this.waiting_queue = new PriorityQueue([], function (a: any, b: any) {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      } else {
        return b.solution_id - a.solution_id;
      }
    });
    this.in_waiting_queue = {};
    this.judging_queue = [];
    this.latestSolutionID = 0;
    const CPUDetails = this.CPUDetails = os.cpus();
    this.CPUModel = CPUDetails[0].model;
    this.CPUSpeed = CPUDetails[0].speed;
    this.platform = os.platform();
    this.errorHandler = null;
    this.SUBMISSION_INFO_PATH = path.join(config.judger.oj_home, "submission");
    let wsport: any = process.env.WSPORT || config.judger.port;
    this.websocketServer = WebsocketServer.setPort(wsport).setAdapter(WebsocketServerAdapter).startServer();
    if (this.platform !== "linux" && this.platform !== "darwin") {
      throw new Error("Your platform doesn't support right now");
    }
  }

  public errorHandle(solutionId: number, runnerId: number, socketId: number) {
    if (this.errorHandler !== null) {
      this.errorHandler.record(solutionId, runnerId, socketId);
    }
  }

  public setErrorHandler(errorHandler: any) {
    this.errorHandler = errorHandler;
  }


  /**
   * 返回Judger状态
   * @returns {{judging: Array, free_judger: Array, waiting: Array, last_solution_id: number|*, oj_home: String|*}} 返回评测机的所有状态
   */

  public getStatus() {
    return {
      judging: this.judging_queue,
      free_judger: this.judge_queue,
      waiting: this.waiting_queue,
      last_solution_id: this.latestSolutionID,
      oj_home: this.oj_home,
      cpu_details: this.CPUDetails,
      cpu_model: this.CPUModel,
      cpu_speed: this.CPUSpeed,
      platform: this.platform
    };
  }

  public updateLatestSolutionId(solutionId: number) {
    this.latestSolutionID = Math.max(this.latestSolutionID, solutionId);
  }

  public async makeShareMemoryDirectory () {
    try {
      // @ts-ignore
      await mkdir("/home/judge/submission");
    }
    catch (e) {
      // do nothing
    }
  }

  @TolerableAsync
  public async writeSubmissionInfoToDisk (solutionId: number, socketId: number) {
    await this.makeShareMemoryDirectory();
    const submissionInfo = await JudgeManager.buildSubmissionInfo(solutionId);
    const submissionInfoJson = JSON.stringify(submissionInfo);
    console.log(`Solution Id: ${solutionId}, submissionInfo:${submissionInfoJson}`);
    const uuid = UUIDSocketManager.getUUIDInfo(socketId, solutionId);
    // @ts-ignore
    await fs.writeFileSync(path.join(this.SUBMISSION_INFO_PATH, `${uuid}.json`), submissionInfoJson, { mode: 0o777 });
    return uuid;
  }

  /**
   * 运行后台判题机
   * @param {Number} solution_id 提交ID
   * @param {boolean} admin 提交是否来自管理员
   * @param {boolean} no_sim 提交是否启用判重
   * @param {Number} priority 判题优先级
   * @param {Number} socketId SocketIO的ID
   * @returns {Promise<void>} 返回一个空Promise
   */

  @LocalJudger.JudgeExists
  public async addTask(solution_id: any, admin: boolean, no_sim = false, priority = 1, socketId: number = 1) {
    solution_id = LocalJudger.formatSolutionId(solution_id);
    if (!this.judging_queue.includes(solution_id) &&
      !this.in_waiting_queue[solution_id]) {
      this.updateLatestSolutionId(solution_id);
      if (this.judge_queue.length !== 0) {
        this.judging_queue.push(solution_id);
        this.runJudger(solution_id, this.judge_queue.shift(), admin, no_sim, socketId);
      } else {
        this.waiting_queue.push({
          solution_id,
          priority,
          admin,
          no_sim,
          socketId
        });
        this.in_waiting_queue[solution_id] = true;
      }
    }
    return true;
  }

  /**
   * 运行后台判题机
   * @param {Number|String} problemId 问题ID
   * @returns {Promise<Boolean>} 若存在题目文件，则返回true
   */

  async problemDataExist (problemId: number | string) {
    problemId = Math.abs(parseInt(problemId as string));
    try {
      await fs.promises.access(path.join(this.oj_home, "data", problemId + ""));
      return true;
    }
    catch (e) {
      return false;
    }
  }

  /**
   * （回调）获取剩余的任务
   */

  public getRestTask() {
    if (this.judge_queue.length && this.waiting_queue.length) {
      const task = this.waiting_queue.pop();
      const solution_id = task.solution_id;
      const admin = task.admin;
      const no_sim = task.no_sim;
      const socketId = task.socketId;
      delete this.in_waiting_queue[solution_id];
      this.runJudger(solution_id, this.judge_queue.shift(), admin, no_sim, socketId);
      this.judging_queue.push(solution_id);
    }
  }

  /**
   * 运行后台判题机
   * @param {Number} milisecond 延迟时间(毫秒)
   * @returns {Promise<void>} 返回一个空Promise
   */
  // @ts-ignore
  private async delay(milisecond: number) {
    return await new Promise(resolve => {
      setTimeout(() => {
        resolve(null);
      }, milisecond);
    })
  }


  /**
   * 运行后台判题机
   * @param {Number} solution_id 提交ID
   * @param {Number} runner_id 判题机ID
   * @param {Boolean} admin 管理员提交
   * @param {Boolean} no_sim 不启用判重
   * @param {Boolean} socketId socket连接的ID
   * @returns {Promise<void>} 返回一个空Promise
   */

  public async runJudger(solution_id: number, runner_id: number, admin = false, no_sim = false, socketId: number) {
    const judgerId = await this.writeSubmissionInfoToDisk(solution_id, socketId);
    UUIDSocketManager.setUUIDInfoTimer(socketId, solution_id);
    UUIDSocketManager.setUUIDSocketInfoTimer(UUIDSocketManager.getUUIDInfo(solution_id, socketId));
    const stderrBuilder: any = [], stdoutBuilder: any = [];
    const args: any[] = ["-solution_id", solution_id, "-runner_id", runner_id, "-dir", this.oj_home, "-judger_id", judgerId];
    if (judgerId) {
      args.push("-no-mysql");
    }
    if (admin) {
      args.push("-admin");
    }
    if (no_sim) {
      args.push("-no-sim");
    }
    args.push("-stdin");
    console.log(`Running arguments: `, args.join(" "));
    const judger = spawn(`${process.cwd()}/wsjudged`, args);
    judger.stdin.write(JSON.stringify(await JudgeManager.buildSubmissionInfo(solution_id)) + "\n");
    if (process.env.NODE_ENV === "test") {
      console.log("arguments: ", args);
    }
    let killed = false;
    const timeoutID = setTimeout(() => {
      killed = true;
      judger.kill("SIGKILL");
    }, 1000 * 60);// kill process after 100s
    this.emit("change", this.getStatus().free_judger);
    judger.on("close", (EXITCODE: any) => {
      if (process.env.NODE_ENV === "test") {
        console.log(`solution_id: ${solution_id}, EXITCODE:${EXITCODE}`);
      }
      this.judge_queue.push(runner_id);
      if(!killed) {
        clearTimeout(timeoutID);
      }
      const solutionPOS = this.judging_queue.indexOf(solution_id);
      if (~solutionPOS) {
        this.judging_queue.splice(solutionPOS, 1);
      }
      this.emit("change", this.getStatus().free_judger);
      this.getRestTask();
      if (null === EXITCODE || EXITCODE) {
        console.log("stdout: \n", stdoutBuilder.join(""));
        console.log("stderr: \n", stderrBuilder.join(""));
        this.errorHandle(solution_id, runner_id, socketId);
      }
    });
    judger.stdout.on("data", (resp: any) => {stdoutBuilder.push(resp.toString());});
    judger.stderr.on("data", (resp: any) => {stderrBuilder.push(resp.toString());});
  }
}

export default new LocalJudger(config.judger.oj_home, Math.min(config.judger.oj_judge_num, os.cpus().length));
