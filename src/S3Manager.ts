import {
  CloudFrontClient,
  CreateInvalidationCommand,
  GetInvalidationCommand,
  CreateInvalidationCommandInput,
  GetInvalidationCommandInput,
  CreateInvalidationCommandOutput,
} from "@aws-sdk/client-cloudfront";
import {
  PutObjectCommand,
  S3Client,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import mime from "mime-types";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { S3Config } from "./uploadType";

const __filename = fileURLToPath(import.meta.url);
class S3Manager {
  private s3Client: S3Client;
  private cloudFrontClient: CloudFrontClient;
  private config: S3Config;
  private uploadConfig: { distDir: string; remoteDir: string };

  constructor(config: S3Config) {
    this.config = config;

    this.s3Client = new S3Client({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });

    this.cloudFrontClient = new CloudFrontClient({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });

    this.uploadConfig = {
      distDir: path.resolve("./", this.config.outDir),
      remoteDir: this.config.remoteDir,
    };

    this.s3Client.middlewareStack.add(
      (next, context) => (args: any) => {
        console.log({
          hostname: args.request.hostname,
          path: args.request.path,
        });
        return next(args);
      },
      { step: "finalizeRequest" }
    );
  }

  async uploadFile(filePath: string, remotePath: string) {
    if (!path.isAbsolute(filePath))
      throw new Error(`uploadFile::filePath: ${filePath} is not absolute path`);

    const stream = fs.createReadStream(filePath);
    stream.on("error", (err) => {
      console.log("File Error", err);
    });

    const uploadParams: PutObjectCommandInput = {
      Bucket: this.config.bucket,
      Key: remotePath,
      Body: stream,
    };
    const mimeType = mime.lookup(filePath);
    if (filePath.endsWith("index.html")) uploadParams.CacheControl = "no-store";

    if (mimeType) uploadParams.ContentType = mimeType;

    try {
      const data = await this.s3Client.send(new PutObjectCommand(uploadParams));
      console.log("upload", filePath, "  ", remotePath, mimeType);
      return data;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async uploadDir(dirAbsolutePath: string, remotePath: string) {
    const asyncFilesList: Promise<any>[] = [];
    const uploadDirRecursive = async (
      dirPath: string,
      rootPath: string,
      promiseList: Promise<any>[] = []
    ) => {
      if (!path.isAbsolute(dirPath))
        throw new Error(
          `uploadDirRecursive::dirPath: ${dirPath} is not absolute path`
        );

      if (!path.isAbsolute(rootPath))
        throw new Error(
          `uploadDirRecursive::rootPath: ${rootPath} is not absolute path`
        );

      const fileNames = fs.readdirSync(dirPath);
      for (const fileName of fileNames) {
        const filePath = path.resolve(dirPath, fileName);
        const file = fs.statSync(filePath);
        if (file.isDirectory()) {
          await uploadDirRecursive(filePath, rootPath, promiseList);
        } else {
          let relativePath = dirPath.slice(rootPath.length);
          relativePath =
            remotePath + relativePath.split(path.sep).join(path.posix.sep);
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
              else asyncFilesList.push(this.uploadFile(filePath, remoteKey));
            } catch (e) {
              console.error(e);
            }
          }
        }
      }
      console.log("asyncFilesList", asyncFilesList);
      return Promise.all(promiseList.concat(asyncFilesList));
    };

    return uploadDirRecursive(dirAbsolutePath, dirAbsolutePath);
  }

  refreshCloudFront(path: string) {
    console.log("refreshCloudFront", path);
    return new Promise<CreateInvalidationCommandOutput>((resolve, reject) => {
      const params: CreateInvalidationCommandInput = {
        DistributionId: this.config.distributionId,
        InvalidationBatch: {
          CallerReference: String(Date.now()),
          Paths: {
            Quantity: 1,
            Items: [path],
          },
        },
      };
      const command = new CreateInvalidationCommand(params);
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

  checkRefreshCloudFront(id: string) {
    return new Promise<CreateInvalidationCommandOutput>((resolve, reject) => {
      const params: GetInvalidationCommandInput = {
        DistributionId: this.config.distributionId,
        Id: id,
      };
      const command = new GetInvalidationCommand(params);
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

  sleep(seconds: number) {
    return new Promise<void>((resolve) => {
      setTimeout(() => resolve(), seconds * 1000);
    });
  }

  async main() {
    await this.uploadDir(
      this.uploadConfig.distDir,
      this.uploadConfig.remoteDir
    );
    const data: CreateInvalidationCommandOutput = await this.refreshCloudFront(
      `/*`
    );
    console.log(data.Invalidation?.InvalidationBatch?.Paths);
    const id = data.Invalidation?.Id;
    if (!id) {
      throw new Error("id does not exist");
    }
    let status: string | undefined = undefined;
    let flag = true;
    while (flag) {
      const data: CreateInvalidationCommandOutput =
        await this.checkRefreshCloudFront(id);
      status = data.Invalidation?.Status;
      if (status === "Completed") {
        flag = false;
        console.log("cdn 刷新已完成");
        break;
      }
      console.log("cdn 刷新未完成");
      console.log("5秒后再次查询 cdn 刷新结果");
      await this.sleep(5);
    }
  }
}

export default S3Manager;
