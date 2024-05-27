import S3Manager from "./S3Manager.js";
import { upload } from "./uploadAssetsToCdn.js";
const main = (Config) => {
    const s3Config = Config;
    return ({ filePath, remotePath }) => {
        const { refreshCloudFront, uploadFile } = new S3Manager(s3Config, {
            distDir: filePath,
            remoteDir: remotePath,
        });
        upload({ filePath, remotePath, refreshCloudFront, uploadFile }).catch((error) => {
            console.error("Error:", error);
        });
    };
};
export default main;
