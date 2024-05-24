
import { CloudFrontClient, CreateInvalidationCommand, GetInvalidationCommand } from '@aws-sdk/client-cloudfront'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import mime from 'mime-types'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { S3Config } from './config.js'

const __filename = fileURLToPath(import.meta.url)
const REMOTE_DIR = S3Config.remoteDir
const OUPUT_DIR = S3Config.outDir
console.log('S3Config==', S3Config)
// Set the region
const s3Client = new S3Client({
  region: S3Config.region,
  credentials: {
    accessKeyId: S3Config.accessKeyId,
    secretAccessKey: S3Config.secretAccessKey,
  },
})
s3Client.middlewareStack.add(
  // eslint-disable-next-line unused-imports/no-unused-vars
  (next, context) => (args) => {
    console.log({
      hostname: args.request.hostname,
      path: args.request.path,
    })
    return next(args)
  },
  { step: 'finalizeRequest' },
)
const cloudFrontClient = new CloudFrontClient({
  region: S3Config.region,
  credentials: {
    accessKeyId: S3Config.accessKeyId,
    secretAccessKey: S3Config.secretAccessKey,
  },
})

const uploadConfig_dev = {
  distDir: path.resolve('./', OUPUT_DIR),
  remoteDir: `${REMOTE_DIR}`,
}

const uploadConfig_production = {
  distDir: path.resolve('./', OUPUT_DIR),
  remoteDir: `${REMOTE_DIR}`,
}

let uploadConfig = null

async function uploadFile(filePath, remotePath) {
  // console.log('uploadFile', filePath, remotePath)
  if (!path.isAbsolute(filePath))
    // eslint-disable-next-line no-throw-literal
    throw `uploadFile::filePath: ${filePath} is not absolute path`

  const stream = fs.createReadStream(filePath)
  stream.on('error', (err) => {
    console.log('File Error', err)
  })

  const uploadParams = {
    Bucket: S3Config.bucket,
    Key: remotePath,
    Body: stream,
  }
  const mimeType = mime.lookup(filePath)
  if (filePath.endsWith('index.html'))
    uploadParams.CacheControl = 'no-store'

  if (mimeType)
    uploadParams.ContentType = mimeType

  try {
    const data = await s3Client.send(new PutObjectCommand(uploadParams))
    console.log('upload', filePath, '  ', remotePath, mimeType)
    return data
  }
  catch (err) {
    console.log(err)
    throw err
  }
}

const uploadDir = async (dirAbsolutePath, remotePath) => {
  const asyncFilesList = [] // 异步存储
  const uploadDirRecursive = async (dirPath, rootPath, promiseList = []) => {
    if (!path.isAbsolute(dirPath))
      // eslint-disable-next-line no-throw-literal
      throw `uploadDirRecursive::dirPath: ${dirPath} is not absolute path`

    if (!path.isAbsolute(rootPath))
      // eslint-disable-next-line no-throw-literal
      throw `uploadDirRecursive::rootPath: ${rootPath} is not absolute path`

    const fileNames = fs.readdirSync(dirPath)
    for (const fileName of fileNames) {
      const filePath = path.resolve(dirPath, fileName)
      const file = fs.statSync(filePath)
      // 如果是文件夹的话需要递归遍历下面的子文件
      if (file.isDirectory()) {
        // if (excludeDirectory.includes(fileName)) {
        //   // 不参与上传的目录 直接跳过
        //   continue
        // }
        await uploadDirRecursive(filePath, rootPath, promiseList)
      }
      else {
        // /live2d/Resources/macosx/sounds
        let relativePath = dirPath.slice(rootPath.length)
        relativePath = remotePath + relativePath.split(path.sep).join(path.posix.sep)
        if (!uploadConfig.remoteDir)
          relativePath = relativePath ? relativePath.replace('/', '') : relativePath

        const remoteKey = relativePath ? `${relativePath}/${fileName}` : relativePath + fileName

        if (!fileName.endsWith('.map')) {
          try {
            // 判断一下是否是index.html文件，是的话最后再上传，防止服务器部署白屏问题
            if (!fileName.startsWith('index.html'))
              promiseList.push(uploadFile(filePath, remoteKey))
            else
              asyncFilesList.push(uploadFile(filePath, remoteKey))
          }
          catch (e) {
            console.error(e)
          }
        }
      }
    }
    console.log('asyncFilesList', asyncFilesList)
    return Promise.all(promiseList.concat(asyncFilesList))
  }

  return uploadDirRecursive(dirAbsolutePath, dirAbsolutePath)
}

const refreshCloudFront = (path) => {
  console.log('refreshCloudFront', path)
  return new Promise((resolve, reject) => {
    const params = {
      DistributionId: S3Config.distributionId,
      InvalidationBatch: {
        CallerReference: String(Date.now()),
        Paths: {
          Quantity: 1,
          Items: [path],
        },
      },
    }
    const command = new CreateInvalidationCommand(params)
    cloudFrontClient
      .send(command)
      .then((data) => {
        console.log(data)
        resolve(data)
      })
      .catch((err) => {
        console.log(err, err.stack)
        reject(err)
      })
  })
}

const checkRefreshCloudFront = (id) => {
  return new Promise((resolve, reject) => {
    const params = {
      DistributionId: S3Config.distributionId,
      Id: id,
    }
    const command = new GetInvalidationCommand(params)
    cloudFrontClient
      .send(command)
      .then((data) => {
        console.log(data)
        resolve(data)
      })
      .catch((err) => {
        console.log(err, err.stack)
        reject(err)
      })
  })
}

const sleep = (seconds) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), seconds * 1000)
  })
}

const main = async () => {
  await uploadDir(uploadConfig.distDir, uploadConfig.remoteDir)
  // const publicPath = uploadConfig.remoteDir ? '/' : ''
  // let data = await refreshCloudFront(`${publicPath}${uploadConfig.remoteDir}/*`)
  const data = await refreshCloudFront(`/*`)
  console.log(data.Invalidation.InvalidationBatch.Paths)
  const id = data.Invalidation.Id

  let status = null
  let flag = true
  while (flag) {
    const data = await checkRefreshCloudFront(id)
    status = data.Invalidation.Status
    if (status === 'Completed') {
      flag = false
      console.log('cdn 刷新已完成')
      break
    }
    console.log('cdn 刷新未完成')
    console.log('5秒后再次查询 cdn 刷新结果')
    await sleep(5)
  }
}

/** 保证node 入口模块路径和当前模块路径相等时，运行main函数 */
if (process.argv[1] === __filename) {
  // console.log('import.meta.url===', import.meta.url, process.argv[1], __filename)
  const env = process.env.NODE_ENV
  if (env === 'development')
    uploadConfig = uploadConfig_dev
  else if (env === 'production')
    uploadConfig = uploadConfig_production
  else
    throw new Error(`不支持的 env: ${env}`)

  main()
}

export {
  uploadFile,
  uploadDir,
  refreshCloudFront,
  checkRefreshCloudFront,
  sleep,
  S3Config,
}
