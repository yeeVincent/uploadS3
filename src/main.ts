import S3Manager from "./S3Manager";
import { upload } from "./uploadAssetsToCdn";
import { IConfig } from "./uploadType";

const main = (Config: IConfig) => {
  const { filePath, remotePath, s3Config } = Config;
  const { refreshCloudFront, uploadFile } = new S3Manager(s3Config);
  upload({ filePath, remotePath, refreshCloudFront, uploadFile }).catch(
    (error) => {
      console.error("Error:", error);
    }
  );
};
export default main;
