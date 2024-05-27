import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// 获取当前文件的目录名
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function addJsExtension(dir) {
  fs.readdirSync(dir).forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      addJsExtension(filePath);
    } else if (path.extname(file) === ".js") {
      let content = fs.readFileSync(filePath, "utf8");
      content = content.replace(/(from\s+['"])(\..*?)(['"])/g, "$1$2.js$3");
      fs.writeFileSync(filePath, content, "utf8");
    }
  });
}

addJsExtension(path.join(__dirname, "../dist"));
