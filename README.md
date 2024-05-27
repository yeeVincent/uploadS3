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

```ts
import { uploadFile } from 'xizhi-uploads3';

const s3Config = {
  accessKeyId: 'YOUR_ACCESS_KEY_ID',
  secretAccessKey: 'YOUR_SECRET_ACCESS_KEY',
  region: 'YOUR_S3_REGION',
  bucketName: 'YOUR_BUCKET_NAME',
};

const localFilePath = './path/to/your/local/file.txt'; // Use relative path, not path alias
const s3Key = 'desired/path/in/s3/file.txt';

uploadFile(s3Config, localFilePath, s3Key)
  .then((response) => {
    console.log('File uploaded successfully:', response);
  })
  .catch((error) => {
    console.error('Error uploading file:', error);
  });
```

### Configuration Object

- `accessKeyId`: Your AWS Access Key ID.
- `secretAccessKey`: Your AWS Secret Access Key.
- `region`: The AWS region where your S3 bucket is located.
- `bucketName`: The name of your S3 bucket.

### Parameters

- `localFilePath`: The relative path to the local file you want to upload. **Do not use path aliases; use relative paths instead.**
- `s3Key`: The desired key (path) in the S3 bucket where the file will be uploaded.

### Notes

- Ensure that your AWS credentials have the necessary permissions to upload files to the specified S3 bucket.
- Always use relative paths for the `localFilePath` to avoid issues with path resolution.

## Example

```ts
import { uploadFile } from 'uploadS3';

const s3Config = {
  accessKeyId: 'YOUR_ACCESS_KEY_ID',
  secretAccessKey: 'YOUR_SECRET_ACCESS_KEY',
  region: 'YOUR_S3_REGION',
  bucketName: 'YOUR_BUCKET_NAME',
};

const localFilePath = './uploads/myFile.txt'; // Use relative path
const s3Key = 'uploads/myFile.txt';

uploadFile(s3Config, localFilePath, s3Key)
  .then((response) => {
    console.log('File uploaded successfully:', response);
  })
  .catch((error) => {
    console.error('Error uploading file:', error);
  });
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

This should provide a comprehensive guide for users on how to configure and use your package to upload files to S3.