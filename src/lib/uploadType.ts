import { S3ClientConfig } from "@aws-sdk/client-s3";

export interface IConfig {
  /** 需要上传的文件路径 */
  filePath: string;
  /** 上传到服务器的路径 */
  remotePath: string;
}

export interface S3Config extends S3ClientConfig {
  bucket: string;
  region: string;
  distributionId: string;
  fileEndpoint: string;
  origin: string;
  accessKeyId: string;
  secretAccessKey: string;
  // remoteDir: string;
  // outDir: string;
}

export interface UploadConfig {
  distDir: string;
  remoteDir: string;
}
