import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: "./src/main.ts",
  target: "node", // 确保 Webpack 以 Node.js 环境为目标
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "dist"),
    library: {
      type: "commonjs2", // 使用 CommonJS 模块系统
    },
  },
  mode: "development", // 或 'production'，根据需要选择
};
