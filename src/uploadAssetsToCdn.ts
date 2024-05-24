import { CreateInvalidationCommandOutput } from "@aws-sdk/client-cloudfront";
import { PutObjectCommandOutput } from "@aws-sdk/client-s3";
import fs from "node:fs";
import path from "node:path";

const S3_ENV = process.env.S3_ENV === "prod" ? "prod" : "dev";
const local_relative_path = process.env.LOCAL_PATH
  ? process.env.LOCAL_PATH
  : "src/assets";
const remote_base_path = process.env.REMOTE_PATH
  ? process.env.REMOTE_PATH
  : "assets";
const uploadConfig = {
  distDir: path.resolve("./", local_relative_path),
  remoteDir: `${S3_ENV}/${remote_base_path}`,
};

export const upload = async (props: {
  filePath: string;
  remotePath: string;
  refreshCloudFront: (path: string) => Promise<CreateInvalidationCommandOutput>;
  uploadFile: (
    filePath: string,
    remotePath: string
  ) => Promise<PutObjectCommandOutput>;
}): Promise<void> => {
  const { filePath, remotePath, refreshCloudFront, uploadFile } = props;

  // 传入文件夹，上传文件夹下的所有文件，如果有子文件夹递归上传，区分test和prod环境，上传路径不同
  const findAndUploadDir = async (
    folderPath: string,
    s3FolderKey: string
  ): Promise<void> => {
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
    const uploadPromises = entries.map(async (entry) => {
      const fullPath = path.join(folderPath, entry.name);
      const entryS3Key = path.join(s3FolderKey, entry.name);
      if (entry.isFile()) return uploadFile(fullPath, entryS3Key);
      else if (entry.isDirectory())
        return findAndUploadDir(fullPath, entryS3Key);
    });

    await Promise.all(uploadPromises);
  };

  if (uploadConfig.distDir) {
    // 上传资源文件
    await findAndUploadDir(filePath, remotePath);
    // 刷新cloudfront
    console.log("refreshCloudFront", `/${remotePath}/*`, uploadConfig);
    await refreshCloudFront(`/${remotePath}/*`);
  }
};

/** 脚本执行参考 */
/**
 * @LOCAL_PATH 本地根目录的相对路径
 * @REMOTE_PATH 上传到cdn的路径
 * @NODE_ENV  cdn，这里值固定
 * @S3_ENV  dev | prod
 */

/** 上传到external目录下live2d，到assets目录下，测试环境 */
// LOCAL_PATH=external REMOTE_PATH=assets NODE_ENV=cdn S3_ENV=dev node ./scripts/uploadAssetsToCdn.ts

/** 上传到assets下的所有资源到cdn，测试环境 */
// LOCAL_PATH=src/assets REMOTE_PATH=assets node NODE_ENV=cdn S3_ENV=dev ./scripts/uploadAssetsToCdn.ts