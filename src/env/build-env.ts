import fs from "fs";
import path from "path";
global.config = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "config", "registry.json"), "utf-8"));
