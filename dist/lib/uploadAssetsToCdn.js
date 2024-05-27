"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const upload = (props) => __awaiter(void 0, void 0, void 0, function* () {
    const { filePath, remotePath, refreshCloudFront, uploadFile } = props;
    const uploadConfig = {
        distDir: node_path_1.default.resolve("./", filePath),
        remoteDir: `${remotePath}`,
    };
    const uploadDir = (folderPath, s3FolderKey) => __awaiter(void 0, void 0, void 0, function* () {
        const entries = node_fs_1.default.readdirSync(uploadConfig.distDir, {
            withFileTypes: true,
        });
        const uploadPromises = entries.map((entry) => __awaiter(void 0, void 0, void 0, function* () {
            const fullPath = node_path_1.default.join(folderPath, entry.name);
            console.log(fullPath, entry.name);
            const entryS3Key = node_path_1.default.join(s3FolderKey, entry.name);
            if (entry.isFile())
                return uploadFile(node_path_1.default.resolve(fullPath), entryS3Key);
            else if (entry.isDirectory())
                return uploadDir(fullPath, entryS3Key);
        }));
        yield Promise.all(uploadPromises);
    });
    if (uploadConfig.distDir) {
        // 上传资源文件
        yield uploadDir(filePath, remotePath);
        // 刷新cloudfront
        console.log("refreshCloudFront", `/${remotePath}/*`, uploadConfig);
        yield refreshCloudFront(`/${remotePath}/*`);
    }
});
exports.upload = upload;
