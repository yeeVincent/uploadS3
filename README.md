# xizhi-uploads3

A simple utility to upload local files to Amazon S3. Configure your S3 keys and bucket to complete the upload.

## Features
- Upload files to Amazon S3
- Easy configuration of S3 keys and bucket
- Lightweight and straightforward to use

## Installation

To install the package, use your preferred package manager:

```bash
npm install xizhi-uploads3
# or
pnpm add xizhi-uploads3
```

## Configuration

Before using the package, you need to configure your S3 credentials and bucket information. 

## How to Use

Here is a basic example of how to use the `xizhi-uploads3` package to upload a local file to S3:

Create a new file named `upload.js`:

```ts
import uploadInit from "xizhi-uploads3";

const uploader = uploadInit({
  bucket: "YOUR_BUCKET_NAME",
  region: "YOUR_S3_REGION",
  distributionId: "YOUR_distributionId",
  fileEndpoint: "YOUR_fileEndpoint",
  origin: "YOUR_ORIGIN",
  accessKeyId: "YOUR_ACCESS_KEY_ID",
  secretAccessKey: "YOUR_SECRET_ACCESS_KEY",
});
const localFilePath = './path/to/your/local'; // Note: Use relative path starting from the root directory
const s3Key = 'desired/path';
uploader({
  filePath: localFilePath,
  remotePath: s3Key,
});

```

Next, add a command in your `package.json`:

```ts
  {
    "scripts": {
      "upload": "node YOUR_PATH/upload.js",
    }
  }
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

This should provide a comprehensive guide for users on how to configure and use your package to upload files to S3.