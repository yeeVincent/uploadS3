import {
  CloudFrontClient,
  CreateInvalidationCommand,
  GetInvalidationCommand,
  CreateInvalidationCommandInput,
  GetInvalidationCommandInput,
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
import { S3Config } from "./config.js";
import { CreateInvalidationCommandOutput } from "@aws-sdk/client-cloudfront";

const __filename = fileURLToPath(import.meta.url);
const REMOTE_DIR = S3Config.remoteDir;
const OUTPUT_DIR = S3Config.outDir;

console.log("S3Config==", S3Config);

// Set the region
const s3Client = new S3Client({
  region: S3Config.region,
  credentials: {
    accessKeyId: S3Config.accessKeyId,
    secretAccessKey: S3Config.secretAccessKey,
  },
});

s3Client.middlewareStack.add(
  (next, context) => (args: any) => {
    console.log({
      hostname: args.request.hostname,
      path: args.request.path,
    });
    return next(args);
  },
  { step: "finalizeRequest" }
);

const cloudFrontClient = new CloudFrontClient({
  region: S3Config.region,
  credentials: {
    accessKeyId: S3Config.accessKeyId,
    secretAccessKey: S3Config.secretAccessKey,
  },
});

const uploadConfig_dev = {
  distDir: path.resolve("./", OUTPUT_DIR),
  remoteDir: `${REMOTE_DIR}`,
};

const uploadConfig_production = {
  distDir: path.resolve("./", OUTPUT_DIR),
  remoteDir: `${REMOTE_DIR}`,
};

let uploadConfig: { distDir: string; remoteDir: string } | null = null;

async function uploadFile(filePath: string, remotePath: string) {
  if (!path.isAbsolute(filePath))
    throw new Error(`uploadFile::filePath: ${filePath} is not absolute path`);

  const stream = fs.createReadStream(filePath);
  stream.on("error", (err) => {
    console.log("File Error", err);
  });

  const uploadParams: PutObjectCommandInput = {
    Bucket: S3Config.bucket,
    Key: remotePath,
    Body: stream,
  };
  const mimeType = mime.lookup(filePath);
  if (filePath.endsWith("index.html")) uploadParams.CacheControl = "no-store";

  if (mimeType) uploadParams.ContentType = mimeType;

  try {
    const data = await s3Client.send(new PutObjectCommand(uploadParams));
    console.log("upload", filePath, "  ", remotePath, mimeType);
    return data;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

const uploadDir = async (dirAbsolutePath: string, remotePath: string) => {
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
        if (!uploadConfig?.remoteDir)
          relativePath = relativePath
            ? relativePath.replace("/", "")
            : relativePath;

        const remoteKey = relativePath
          ? `${relativePath}/${fileName}`
          : relativePath + fileName;

        if (!fileName.endsWith(".map")) {
          try {
            if (!fileName.startsWith("index.html"))
              promiseList.push(uploadFile(filePath, remoteKey));
            else asyncFilesList.push(uploadFile(filePath, remoteKey));
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
};

const refreshCloudFront = (path: string) => {
  console.log("refreshCloudFront", path);
  return new Promise<CreateInvalidationCommandOutput>((resolve, reject) => {
    const params: CreateInvalidationCommandInput = {
      DistributionId: S3Config.distributionId,
      InvalidationBatch: {
        CallerReference: String(Date.now()),
        Paths: {
          Quantity: 1,
          Items: [path],
        },
      },
    };
    const command = new CreateInvalidationCommand(params);
    cloudFrontClient
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

const checkRefreshCloudFront = (id: string) => {
  return new Promise<CreateInvalidationCommandOutput>((resolve, reject) => {
    const params: GetInvalidationCommandInput = {
      DistributionId: S3Config.distributionId,
      Id: id,
    };
    const command = new GetInvalidationCommand(params);
    cloudFrontClient
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

const sleep = (seconds: number) => {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), seconds * 1000);
  });
};

const main = async () => {
  await uploadDir(uploadConfig!.distDir, uploadConfig!.remoteDir);
  const data: CreateInvalidationCommandOutput = await refreshCloudFront(`/*`);
  console.log(data.Invalidation?.InvalidationBatch?.Paths);
  const id = data.Invalidation?.Id;
  if (!id) {
    throw new Error("id does not exist");
  }
  let status: string | undefined = undefined;
  let flag = true;
  while (flag) {
    const data: CreateInvalidationCommandOutput = await checkRefreshCloudFront(
      id
    );
    status = data.Invalidation?.Status;
    if (status === "Completed") {
      flag = false;
      console.log("cdn 刷新已完成");
      break;
    }
    console.log("cdn 刷新未完成");
    console.log("5秒后再次查询 cdn 刷新结果");
    await sleep(5);
  }
};

if (process.argv[1] === __filename) {
  const env = process.env.NODE_ENV;
  if (env === "development") uploadConfig = uploadConfig_dev;
  else if (env === "production") uploadConfig = uploadConfig_production;
  else throw new Error(`不支持的 env: ${env}`);

  main();
}

export {
  uploadFile,
  uploadDir,
  refreshCloudFront,
  checkRefreshCloudFront,
  sleep,
  S3Config,
};
