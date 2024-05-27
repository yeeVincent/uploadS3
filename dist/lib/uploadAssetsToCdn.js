import fs from "node:fs";
import path from "node:path";
export const upload = async (props) => {
    const { filePath, remotePath, refreshCloudFront, uploadFile } = props;
    const uploadConfig = {
        distDir: path.resolve("./", filePath),
        remoteDir: `${remotePath}`,
    };
    const uploadDir = async (folderPath, s3FolderKey) => {
        const entries = fs.readdirSync(uploadConfig.distDir, {
            withFileTypes: true,
        });
        const uploadPromises = entries.map(async (entry) => {
            const fullPath = path.join(folderPath, entry.name);
            console.log(fullPath, entry.name);
            const entryS3Key = path.join(s3FolderKey, entry.name);
            if (entry.isFile())
                return uploadFile(path.resolve(fullPath), entryS3Key);
            else if (entry.isDirectory())
                return uploadDir(fullPath, entryS3Key);
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
