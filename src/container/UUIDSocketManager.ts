import { v1 as uuidV1 } from 'uuid';

interface UUIDMatcher {
  [id: string]: string
}

export interface ISolutionPackage {
  solutionId: string,
  socketId: string
}

class UUIDSocketManager {
  private readonly uuidMatcher: UUIDMatcher = {};
  private readonly solutionMatcher: UUIDMatcher = {};
  getUUIDSocketInfo(uuid: string) {
    return UUIDSocketManager.decode(this.uuidMatcher[uuid]);
  }

  static decode (encodedPackage: string) {
    const socketId = Buffer.from(encodedPackage.substring(0, 4), "base64").toString("ascii");
    const solutionId = Buffer.from(encodedPackage.substring(4), "base64").toString("ascii");
    return {socketId, solutionId} as ISolutionPackage;
  }

  static encode (str: string) {
    return Buffer.from(str + "").toString("base64");
  }

  static encodeIds(socketId: number | string, solutionId: number | string) {
    return [socketId, solutionId].map(UUIDSocketManager.encode).join("");
  }

  setUUIDSocketInfo(uuid: string, socketId: number | string, solutionId: number | string) {
    this.uuidMatcher[uuid] = UUIDSocketManager.encodeIds(socketId, solutionId);
    setTimeout(() => {
      this.removeUUIDSocketInfo(uuid);
    }, 30000);
    return this;
  }

  removeUUIDSocketInfo(uuid: string) {
    if (Object.prototype.hasOwnProperty.call(this.uuidMatcher, uuid)) {
      delete this.uuidMatcher[uuid];
    }
    return this;
  }

  getUUIDInfo(socketId: number | string, solutionId: number | string) {
    const encoded = UUIDSocketManager.encodeIds(socketId, solutionId);
    return this.solutionMatcher[encoded];
  }

  setUUIDInfo(socketId: number | string, solutionId: number | string, uuid: string) {
    const encoded = UUIDSocketManager.encodeIds(socketId, solutionId);
    this.solutionMatcher[encoded] = uuid;
    setTimeout(() => {
      this.removeUUIDInfo(socketId, solutionId);
    }, 30000);
    return this;
  }

  removeUUIDInfo(socketId: number | string, solutionId: number | string) {
    const encoded = UUIDSocketManager.encodeIds(socketId, solutionId);
    if (Object.prototype.hasOwnProperty.call(this.solutionMatcher, encoded)) {
      delete this.solutionMatcher[encoded];
    }
    return this;
  }

  generateUUID () {
    return uuidV1();
  }
}

export default new UUIDSocketManager();
