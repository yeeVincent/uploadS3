import S3Manager from "./S3Manager.js";
import { upload } from "./uploadAssetsToCdn.js";
import { IConfig, S3Config } from "./uploadType.js";

const main = (Config: S3Config) => {
  const s3Config = Config;

  return ({ filePath, remotePath }: IConfig) => {
    const { refreshCloudFront, uploadFile } = new S3Manager(s3Config, {
      distDir: filePath,
      remoteDir: remotePath,
    });
    upload({ filePath, remotePath, refreshCloudFront, uploadFile }).catch(
      (error) => {
        console.error("Error:", error);
      }
    );
  };
};
export default main;
