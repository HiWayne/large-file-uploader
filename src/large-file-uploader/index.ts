export interface ProgressData {
  result:
    | "completed"
    | "failure"
    | "uploading"
    | "initialization"
    | "suspended";
  progress: number;
}

export interface ControllerData {
  pause: () => void;
  resume: () => void;
  _setUploader?: boolean;
}

export type UploaderData = ProgressData & ControllerData & { file: File };

interface LargeFileUploaderOptionalOptions {
  // 每个切片大小，单位字节，默认14kb
  sliceSize: number;
  // 最小可切片文件大小，单位字节
  minSlicedFileSize: number;
  // 是否使用多线程
  multithreadingUpload: boolean;
  // 每次上传的chunks数量（视后端接口而定）
  chunksNumber: number;
  // 失败自动重试次数
  retryCount: number;
  // 上传进度回调函数
  handleProcess: (progressDataList: UploaderData[]) => void;
  // 上传结束回调函数，true-成功、false-失败
  finish: (data: { result: boolean; files: FileList }) => void;
}

interface LargeFileUploaderRequiredOptions {
  upload: (
    uploadParams: {
      chunks: Blob[];
      start: number;
      end: number;
      size: number;
    },
    customParams?: any
  ) => Promise<boolean>;
}

type LargeFileUploaderOptions = Partial<LargeFileUploaderOptionalOptions> &
  LargeFileUploaderRequiredOptions;

type FullyLargeFileUploaderOptions = LargeFileUploaderOptionalOptions &
  LargeFileUploaderRequiredOptions;

const createHiddenUploaderInput = (() => {
  let input: HTMLInputElement;
  let currentControllerList: UploaderData[] = [];
  let handleChange: (event: Event) => void;
  return (
    {
      sliceSize,
      minSlicedFileSize,
      chunksNumber,
      retryCount,
      upload,
      handleProcess,
      finish,
    }: FullyLargeFileUploaderOptions,
    controllerList: UploaderData[]
  ) => {
    currentControllerList = controllerList;
    handleChange = async (event: Event) => {
      if (event.target) {
        const files = (event.target as HTMLInputElement).files;
        if (files) {
          const chunksList = Array.from(files).map((file) => {
            const chunk = [];
            const size = file.size;
            if (size >= minSlicedFileSize) {
              const sliceNumber = Math.ceil(size / sliceSize);
              for (let i = 0; i < sliceNumber; i++) {
                const slicedFile = file.slice(
                  i * sliceSize,
                  (i + 1) * sliceSize
                );
                chunk.push(slicedFile);
              }
            } else {
              chunk.push(file);
            }
            return chunk;
          });
          const createUploaderData = (
            index: number
          ): ProgressData & { file: File } => ({
            result: "initialization",
            progress: 0,
            file: files[index],
          });
          const progressList = chunksList.map((_, index) =>
            createUploaderData(index)
          );
          const updateProgressList = (
            index: number,
            progressData: Partial<UploaderData>
          ): UploaderData[] => {
            progressList[index] = {
              ...progressList[index],
              ...progressData,
            };
            const newProgressList = [...progressList];
            return newProgressList as any;
          };
          const uploadList = chunksList.map((chunks, index) => {
            const length = chunks.length;
            let _retryCount = 0;
            let suspended = false;
            let sliceStart = 0;
            let customParams: any;
            return new Promise((resolve, reject) => {
              const computeProgress = (start: number) =>
                Number((start / length).toFixed(4));
              const handleFail = (start: number) => {
                if (_retryCount < retryCount) {
                  _retryCount++;
                  autoUpload(start);
                } else {
                  sliceStart = start;
                  const progressList = updateProgressList(index, {
                    result: "failure",
                    progress: computeProgress(start),
                  });
                  handleProcess(progressList);
                  reject(start);
                }
              };
              const autoUpload = (start = 0) => {
                if (start >= length) {
                  sliceStart = length;
                  const progressList = updateProgressList(index, {
                    result: "completed",
                    progress: computeProgress(length),
                  });
                  handleProcess(progressList);
                  resolve(true);
                  return;
                }
                const nextStart = start + chunksNumber;
                upload(
                  {
                    chunks: chunks.slice(start, nextStart),
                    start: start,
                    end: nextStart - 1,
                    size: length,
                  },
                  customParams
                )
                  .then((data) => {
                    _retryCount = 0;
                    customParams = data;
                    if (suspended) {
                      return;
                    }
                    sliceStart = nextStart;
                    const progressList = updateProgressList(index, {
                      result: "uploading",
                      progress: computeProgress(nextStart),
                    });
                    handleProcess(progressList);
                    autoUpload(nextStart);
                  })
                  .catch(() => {
                    handleFail(start);
                  });
              };
              currentControllerList[index] = updateProgressList(index, {
                pause() {
                  suspended = true;
                  if (progressList[index].result === "uploading") {
                    handleProcess(
                      updateProgressList(index, {
                        result: "suspended",
                        progress: computeProgress(sliceStart),
                      })
                    );
                  }
                },
                resume() {
                  if (
                    progressList[index].result === "suspended" ||
                    progressList[index].result === "failure"
                  ) {
                    _retryCount = 0;
                    suspended = false;
                    handleProcess(
                      updateProgressList(index, {
                        result: "uploading",
                      })
                    );
                    const start = sliceStart;
                    autoUpload(start);
                  }
                },
              })[index];
              handleProcess(
                updateProgressList(index, {
                  result: "uploading",
                  progress: 0,
                })
              );
              autoUpload();
            });
          });
          const results = await Promise.all(uploadList);
          if (results.every((result, index) => result === true)) {
            finish({ result: true, files });
          } else {
            finish({ result: false, files });
          }
        }
      }
    };
    if (input) {
      return input;
    }
    input = document.createElement("input");
    input.style.display = "none";
    input.type = "file";
    input.multiple = true;
    input.addEventListener("change", (event) => handleChange(event));
    return input;
  };
})();

const include = (parent: HTMLElement, child: Node) => {
  const children = parent.children;
  const length = children.length;
  for (let i = length - 1; i >= 0; i--) {
    const _child = parent.children[i];
    if (_child === child) {
      return true;
    }
  }
};

const setDefaultOptions = (
  largeFileUploaderOptions: LargeFileUploaderOptions
): FullyLargeFileUploaderOptions => {
  const defaultOptions: LargeFileUploaderOptionalOptions = {
    sliceSize: 14000,
    minSlicedFileSize: 20000,
    multithreadingUpload: true,
    chunksNumber: 3,
    retryCount: 3,
    handleProcess: () => {},
    finish: () => {},
  };
  return { ...defaultOptions, ...largeFileUploaderOptions };
};

const initialUploader: UploaderData = {
  result: "initialization",
  progress: 0,
  file: {} as any,
  pause: () => {
    throw new Error("不要在上传前调用pause");
  },
  resume: () => {
    throw new Error("不要在上传前调用resume");
  },
};

const proxyUploaderList = (controllerList: UploaderData[]) => {
  return new Proxy(controllerList, {
    get(controllerList, index) {
      if (
        controllerList[index as any] !== undefined ||
        controllerList[index as any]._setUploader
      ) {
        return controllerList[index as any];
      } else {
        return initialUploader;
      }
    },
    set(controllerList, index, controller) {
      controllerList[index as any] = controller;
      controllerList[index as any]._setUploader = true;
      return true;
    },
  });
};

const largeFileUploader = (
  largeFileUploaderOptions: LargeFileUploaderOptions
) => {
  const options = setDefaultOptions(largeFileUploaderOptions);
  const controllerList: UploaderData[] = proxyUploaderList([]);
  const body = document.body;
  const input = createHiddenUploaderInput(options, controllerList);
  if (!include(body, input)) {
    document.body.appendChild(input);
  }
  input.click();
  return controllerList;
};

export default largeFileUploader;
