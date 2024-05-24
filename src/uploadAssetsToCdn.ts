import { CreateInvalidationCommandOutput } from "@aws-sdk/client-cloudfront";
import { PutObjectCommandOutput } from "@aws-sdk/client-s3";
import fs from "node:fs";
import path from "node:path";

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
  const uploadConfig = {
    distDir: path.resolve("./", filePath),
    remoteDir: `${remotePath}`,
  };
  const uploadDir = async (
    folderPath: string,
    s3FolderKey: string
  ): Promise<void> => {
    const entries = fs.readdirSync(uploadConfig.distDir, {
      withFileTypes: true,
    });

    const uploadPromises = entries.map(async (entry) => {
      const fullPath = path.join(folderPath, entry.name);
      console.log(fullPath, entry.name);
      const entryS3Key = path.join(s3FolderKey, entry.name);
      if (entry.isFile()) return uploadFile(path.resolve(fullPath), entryS3Key);
      else if (entry.isDirectory()) return uploadDir(fullPath, entryS3Key);
    });

    await Promise.all(uploadPromises);
  };

  if (uploadConfig.distDir) {
    // 上传资源文件
    await uploadDir(filePath, remotePath);
    // 刷新cloudfront
    console.log("refreshCloudFront", `/${remotePath}/*`, uploadConfig);
    await refreshCloudFront(`/${remotePath}/*`);
  }
};
