import { CreateInvalidationCommandOutput } from "@aws-sdk/client-cloudfront";
import { S3Config, UploadConfig } from "./uploadType";
declare class S3Manager {
    private s3Client;
    private cloudFrontClient;
    private config;
    private uploadConfig;
    constructor(config: S3Config, uploadConfig: UploadConfig);
    uploadFile: (filePath: string, remotePath: string) => Promise<import("@aws-sdk/client-s3").PutObjectCommandOutput>;
    uploadDir: (dirAbsolutePath: string, remotePath: string) => Promise<any[]>;
    refreshCloudFront: (path: string) => Promise<CreateInvalidationCommandOutput>;
    checkRefreshCloudFront(id: string): Promise<CreateInvalidationCommandOutput>;
    sleep(seconds: number): Promise<void>;
    main(): Promise<void>;
}
export default S3Manager;
