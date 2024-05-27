"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const S3Manager_1 = __importDefault(require("./S3Manager"));
const uploadAssetsToCdn_1 = require("./uploadAssetsToCdn");
const main = (Config) => {
    const s3Config = Config;
    return ({ filePath, remotePath }) => {
        const { refreshCloudFront, uploadFile } = new S3Manager_1.default(s3Config, {
            distDir: filePath,
            remoteDir: remotePath,
        });
        (0, uploadAssetsToCdn_1.upload)({ filePath, remotePath, refreshCloudFront, uploadFile }).catch((error) => {
            console.error("Error:", error);
        });
    };
};
exports.default = main;
