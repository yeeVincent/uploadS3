import path from "path";
import { fileURLToPath } from "url";
import { CleanWebpackPlugin } from "clean-webpack-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: "./src/index.ts", // 入口文件
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
    filename: "index.js", // 输出文件名
    path: path.resolve(__dirname, "dist"),
    library: {
      type: "commonjs2", // 使用 CommonJS 模块系统
    },
  },
  plugins: [new CleanWebpackPlugin()],
  externals: {
    "@aws-sdk/client-cloudfront": "commonjs @aws-sdk/client-cloudfront",
    "@aws-sdk/client-s3": "commonjs @aws-sdk/client-s3",
    "mime-types": "commonjs mime-types",
  },
  mode: "production", // 使用 production 模式以进行优化
};
