import { S3ClientConfig } from "@aws-sdk/client-s3";

export interface IConfig {
  s3Config: S3Config;
  filePath: string;
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
  remoteDir: string;
  outDir: string;
}
