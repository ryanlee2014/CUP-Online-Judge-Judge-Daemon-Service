import bluebird from "bluebird";
import fs from "fs";
import path from "path";

export function mkdirCallback(dirname: string, callback: () => void) {
  fs.access(dirname,  (err) => {
    if (!err) {
      callback();
    } else {
      mkdirCallback(path.dirname(dirname), () => {
        fs.mkdir(dirname, callback);
      });
    }
  });
}

export default bluebird.promisify(mkdirCallback);
