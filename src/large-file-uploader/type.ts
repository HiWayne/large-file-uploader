export interface ProgressData {
  status:
    | "completed"
    | "failure"
    | "uploading"
    | "initialization"
    | "suspended"
    | "cancel"
    | "waiting";
  progress: number;
  total: number;
  file: File;
  result: any;
  createTimestamp: number;
  isCache?: boolean;
}

export interface ControllerData {
  pause: () => void;
  resume: () => void;
  remove: () => void;
  _setUploader?: boolean;
}

export type UploaderData = ProgressData & ControllerData & { file: File };

export interface LargeFileUploaderOptionalOptions {
  // 是否开启切片
  slice: boolean;
  // 每个切片大小，单位字节，默认100kb
  sliceSize: number;
  // 最小可切片文件大小，单位字节
  minSlicedFileSize: number;
  // 每次上传的chunks数量（视后端接口而定）
  numberOfChunks: number;
  // 失败自动重试次数
  retryCountLimit: number;
  // 是否支持多选
  multiple: boolean;
  // 文件类型限制
  accept: string;
  // 是否开启离线缓存
  offlineStorage: boolean;
  // 离线缓存空间名称
  spaceName: string;
  // 选择后是否立即上传
  immediately: boolean;
  // 文件大小限制
  sizeLimit: [number, number] | null;
  // 线程数量
  numberOfThreads: number;
  // 最大请求数
  maxNumberOfRequest: number;
  // 缓存初始化完成回调
  gotCache: (cacheList: UploaderData[], uploadDataList: UploaderData[]) => void;
  // 上传进度回调函数
  update: (uploadDataList: UploaderData[]) => void;
  error: (uploadDataList: UploaderData[]) => void;
  // 上传全部完成回调函数，result: true，data: UploaderData[]
  success: (data: { result: boolean; data: UploaderData[] }) => void;
  openHash: boolean;
  checkHash: ((hash: string) => Promise<number | true>) | undefined;
}

export type Upload<T> = (
  uploadParams: {
    chunks: Blob[] | [File];
    start: number;
    end: number;
    size: number;
    hashSum: string;
  },
  customParams: T,
  update: (data: Partial<UploaderData>) => void
) => Promise<T>;

export interface LargeFileUploaderRequiredOptions<T> {
  upload: Upload<T>;
}

export type LargeFileUploaderOptions<T> =
  Partial<LargeFileUploaderOptionalOptions> &
    LargeFileUploaderRequiredOptions<T>;

export type FullyLargeFileUploaderOptions<T> =
  LargeFileUploaderOptionalOptions & LargeFileUploaderRequiredOptions<T>;

export type CreateUploader = <T>(
  largeFileUploaderOptions: LargeFileUploaderOptions<T>
) => CreateUploaderResponse;

export interface CreateUploaderResponse {
  uploadFile: () => void;
  giveFilesToUpload: (files: File[] | FileList) => void;
}
