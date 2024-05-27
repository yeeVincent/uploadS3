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
const client_cloudfront_1 = require("@aws-sdk/client-cloudfront");
const client_s3_1 = require("@aws-sdk/client-s3");
const mime_types_1 = __importDefault(require("mime-types"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
class S3Manager {
    constructor(config, uploadConfig) {
        this.uploadFile = (filePath, remotePath) => __awaiter(this, void 0, void 0, function* () {
            if (!node_path_1.default.isAbsolute(filePath))
                throw new Error(`uploadFile::filePath: ${filePath} is not absolute path`);
            const stream = node_fs_1.default.createReadStream(filePath);
            stream.on("error", (err) => {
                console.log("File Error", err);
            });
            const uploadParams = {
                Bucket: this.config.bucket,
                Key: remotePath,
                Body: stream,
            };
            const mimeType = mime_types_1.default.lookup(filePath);
            if (filePath.endsWith("index.html"))
                uploadParams.CacheControl = "no-store";
            if (mimeType)
                uploadParams.ContentType = mimeType;
            try {
                const data = yield this.s3Client.send(new client_s3_1.PutObjectCommand(uploadParams));
                console.log("upload", filePath, "  ", remotePath, mimeType);
                return data;
            }
            catch (err) {
                console.log(err);
                throw err;
            }
        });
        this.uploadDir = (dirAbsolutePath, remotePath) => __awaiter(this, void 0, void 0, function* () {
            const asyncFilesList = [];
            const uploadDirRecursive = (dirPath_1, rootPath_1, ...args_1) => __awaiter(this, [dirPath_1, rootPath_1, ...args_1], void 0, function* (dirPath, rootPath, promiseList = []) {
                if (!node_path_1.default.isAbsolute(dirPath))
                    throw new Error(`uploadDirRecursive::dirPath: ${dirPath} is not absolute path`);
                if (!node_path_1.default.isAbsolute(rootPath))
                    throw new Error(`uploadDirRecursive::rootPath: ${rootPath} is not absolute path`);
                const fileNames = node_fs_1.default.readdirSync(dirPath);
                for (const fileName of fileNames) {
                    const filePath = node_path_1.default.resolve(dirPath, fileName);
                    const file = node_fs_1.default.statSync(filePath);
                    if (file.isDirectory()) {
                        yield uploadDirRecursive(filePath, rootPath, promiseList);
                    }
                    else {
                        let relativePath = dirPath.slice(rootPath.length);
                        relativePath =
                            remotePath + relativePath.split(node_path_1.default.sep).join(node_path_1.default.posix.sep);
                        if (!this.uploadConfig.remoteDir)
                            relativePath = relativePath
                                ? relativePath.replace("/", "")
                                : relativePath;
                        const remoteKey = relativePath
                            ? `${relativePath}/${fileName}`
                            : relativePath + fileName;
                        if (!fileName.endsWith(".map")) {
                            try {
                                if (!fileName.startsWith("index.html"))
                                    promiseList.push(this.uploadFile(filePath, remoteKey));
                                else
                                    asyncFilesList.push(this.uploadFile(filePath, remoteKey));
                            }
                            catch (e) {
                                console.error(e);
                            }
                        }
                    }
                }
                console.log("asyncFilesList", asyncFilesList);
                return Promise.all(promiseList.concat(asyncFilesList));
            });
            return uploadDirRecursive(dirAbsolutePath, dirAbsolutePath);
        });
        this.refreshCloudFront = (path) => {
            console.log("refreshCloudFront", path);
            return new Promise((resolve, reject) => {
                const params = {
                    DistributionId: this.config.distributionId,
                    InvalidationBatch: {
                        CallerReference: String(Date.now()),
                        Paths: {
                            Quantity: 1,
                            Items: [path],
                        },
                    },
                };
                const command = new client_cloudfront_1.CreateInvalidationCommand(params);
                this.cloudFrontClient
                    .send(command)
                    .then((data) => {
                    console.log(data);
                    resolve(data);
                })
                    .catch((err) => {
                    console.log(err, err.stack);
                    reject(err);
                });
            });
        };
        this.config = config;
        this.uploadConfig = uploadConfig;
        this.s3Client = new client_s3_1.S3Client({
            region: this.config.region,
            credentials: {
                accessKeyId: this.config.accessKeyId,
                secretAccessKey: this.config.secretAccessKey,
            },
        });
        this.cloudFrontClient = new client_cloudfront_1.CloudFrontClient({
            region: this.config.region,
            credentials: {
                accessKeyId: this.config.accessKeyId,
                secretAccessKey: this.config.secretAccessKey,
            },
        });
        this.uploadConfig = {
            distDir: node_path_1.default.resolve("./", this.uploadConfig.distDir),
            remoteDir: this.uploadConfig.remoteDir,
        };
        this.s3Client.middlewareStack.add((next, context) => (args) => {
            console.log({
                hostname: args.request.hostname,
                path: args.request.path,
            });
            return next(args);
        }, { step: "finalizeRequest" });
    }
    checkRefreshCloudFront(id) {
        return new Promise((resolve, reject) => {
            const params = {
                DistributionId: this.config.distributionId,
                Id: id,
            };
            const command = new client_cloudfront_1.GetInvalidationCommand(params);
            this.cloudFrontClient
                .send(command)
                .then((data) => {
                console.log(data);
                resolve(data);
            })
                .catch((err) => {
                console.log(err, err.stack);
                reject(err);
            });
        });
    }
    sleep(seconds) {
        return new Promise((resolve) => {
            setTimeout(() => resolve(), seconds * 1000);
        });
    }
    main() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            yield this.uploadDir(this.uploadConfig.distDir, this.uploadConfig.remoteDir);
            const data = yield this.refreshCloudFront(`/*`);
            console.log((_b = (_a = data.Invalidation) === null || _a === void 0 ? void 0 : _a.InvalidationBatch) === null || _b === void 0 ? void 0 : _b.Paths);
            const id = (_c = data.Invalidation) === null || _c === void 0 ? void 0 : _c.Id;
            if (!id) {
                throw new Error("id does not exist");
            }
            let status = undefined;
            let flag = true;
            while (flag) {
                const data = yield this.checkRefreshCloudFront(id);
                status = (_d = data.Invalidation) === null || _d === void 0 ? void 0 : _d.Status;
                if (status === "Completed") {
                    flag = false;
                    console.log("cdn 刷新已完成");
                    break;
                }
                console.log("cdn 刷新未完成");
                console.log("5秒后再次查询 cdn 刷新结果");
                yield this.sleep(5);
            }
        });
    }
}
exports.default = S3Manager;
