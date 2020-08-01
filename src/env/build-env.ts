import fs from "fs";
import path from "path";

const baseRegistry = {
  registry: []
}

function buildRegistryPath () {
  return path.resolve(process.cwd(), "config", "registry.json");
}

function attachRegistry () {
  if (fs.existsSync(buildRegistryPath())) {
    // do nothing
  }
  else {
    if (!fs.existsSync(path.dirname(buildRegistryPath()))) {
      fs.mkdirSync(path.dirname(buildRegistryPath()));
    }
    fs.writeFileSync(buildRegistryPath(), JSON.stringify(baseRegistry));
  }
}

function buildEnv () {
  attachRegistry();
  global.config = JSON.parse(fs.readFileSync(buildRegistryPath(), "utf-8"));
}

buildEnv();
