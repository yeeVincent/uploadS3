import { CreateInvalidationCommandOutput } from "@aws-sdk/client-cloudfront";
import { PutObjectCommandOutput } from "@aws-sdk/client-s3";
export declare const upload: (props: {
    filePath: string;
    remotePath: string;
    refreshCloudFront: (path: string) => Promise<CreateInvalidationCommandOutput>;
    uploadFile: (filePath: string, remotePath: string) => Promise<PutObjectCommandOutput>;
}) => Promise<void>;
