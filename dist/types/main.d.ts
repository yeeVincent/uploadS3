import { IConfig, S3Config } from "./uploadType";
declare const main: (Config: S3Config) => ({ filePath, remotePath }: IConfig) => void;
export default main;
