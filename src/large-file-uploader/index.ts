import { db, FileDoc } from "./storage";
import { ProgressData, UploaderData } from "./type";

interface LargeFileUploaderOptionalOptions {
  // 每个切片大小，单位字节，默认100kb
  sliceSize: number;
  // 最小可切片文件大小，单位字节
  minSlicedFileSize: number;
  // 每次上传的chunks数量（视后端接口而定）
  chunksNumber: number;
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
  // 初始化完成回调
  init: (uploadDataList: UploaderData[]) => void;
  // 上传进度回调函数
  handleProcess: (uploadDataList: UploaderData[]) => void;
  error: (uploadDataList: UploaderData[]) => void;
  // 上传全部完成回调函数，result: true，data: UploaderData[]
  success: (data: { result: boolean; data: UploaderData[] }) => void;
}

interface LargeFileUploaderRequiredOptions<T> {
  upload: (
    uploadParams: {
      chunks: Blob[];
      start: number;
      end: number;
      size: number;
    },
    customParams: T
  ) => Promise<T>;
}

type LargeFileUploaderOptions<T> = Partial<LargeFileUploaderOptionalOptions> &
  LargeFileUploaderRequiredOptions<T>;

type FullyLargeFileUploaderOptions<T> = LargeFileUploaderOptionalOptions &
  LargeFileUploaderRequiredOptions<T>;

const filterUploadDataList = (list: UploaderData[]) =>
  list.filter((uploadData) => uploadData.result !== "cancel");

const autoUpload = <T>(
  start = 0,
  {
    idRef,
    upload,
    updateProgressList,
    computeProgress,
    handleProcess,
    resolve,
    reject,
    sliceStartRef,
    length,
    index,
    chunksNumber,
    chunks,
    customParamsRef,
    retryCountLimit,
    _retryCountRef,
    suspendedRef,
    canceledRef,
    currentUploadListRef,
    offlineStorage,
    spaceName,
    file,
    currentUpdateDataRef,
  }: {
    idRef: { current: number | Promise<number> | undefined };
    upload: (
      uploadParams: {
        chunks: Blob[];
        start: number;
        end: number;
        size: number;
      },
      customParams: T
    ) => Promise<T>;
    updateProgressList: (
      index: number,
      progressData: Partial<UploaderData>
    ) => UploaderData[];
    computeProgress: (n: number) => number;
    handleProcess: (progressDataList: UploaderData[]) => void;
    resolve: (value?: any) => void;
    reject: (value?: any) => void;
    sliceStartRef: { current: number };
    length: number;
    index: number;
    chunksNumber: number;
    chunks: Blob[];
    customParamsRef: { current: T };
    retryCountLimit: number;
    _retryCountRef: { current: number };
    suspendedRef: { current: boolean };
    canceledRef: { current: boolean };
    currentUploadListRef: { current: UploaderData[] };
    offlineStorage: boolean;
    spaceName: string;
    file: File;
    currentUpdateDataRef?: { current: any };
  }
) => {
  if (canceledRef.current) {
    return;
  }
  const handleFail = (start: number) => {
    if (_retryCountRef.current < retryCountLimit) {
      _retryCountRef.current++;
      autoUpload(start, {
        idRef,
        upload,
        updateProgressList,
        computeProgress,
        handleProcess,
        resolve,
        reject,
        sliceStartRef,
        length,
        index,
        chunksNumber,
        chunks,
        customParamsRef,
        retryCountLimit,
        _retryCountRef,
        suspendedRef,
        canceledRef,
        currentUploadListRef,
        offlineStorage,
        spaceName,
        file,
        currentUpdateDataRef,
      });
    } else {
      sliceStartRef.current = start;
      updateProgressList(index, {
        result: "failure",
        progress: computeProgress(start),
      });
      handleProcess(filterUploadDataList(currentUploadListRef.current));
      reject(start);
    }
  };
  if (start >= length) {
    sliceStartRef.current = length;
    updateProgressList(index, {
      result: "completed",
      progress: computeProgress(length),
    });
    handleProcess(filterUploadDataList(currentUploadListRef.current));
    resolve(true);
    if (idRef.current !== undefined) {
      if (typeof idRef.current === "number") {
        db.files.delete(idRef.current);
      } else {
        idRef.current.then((id) => {
          db.files.delete(id);
        });
      }
    }
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
    customParamsRef.current
  )
    .then((data) => {
      if (suspendedRef.current || canceledRef.current) {
        return;
      }
      if (offlineStorage && idRef.current !== undefined) {
        if (typeof idRef.current === "number") {
          db.files.update(idRef.current, {
            result: "uploading",
            start: nextStart,
            end: nextStart + chunksNumber,
            customParams: customParamsRef.current,
          });
        } else {
          currentUpdateDataRef!.current = {
            result: "uploading",
            start: nextStart,
            end: nextStart + chunksNumber,
            customParams: customParamsRef.current,
          };
        }
      }
      _retryCountRef.current = 0;
      customParamsRef.current = data;
      sliceStartRef.current = nextStart;
      updateProgressList(index, {
        result: "uploading",
        progress: computeProgress(nextStart),
      });
      handleProcess(filterUploadDataList(currentUploadListRef.current));
      autoUpload(nextStart, {
        idRef,
        upload,
        updateProgressList,
        computeProgress,
        handleProcess,
        resolve,
        reject,
        sliceStartRef,
        length,
        index,
        chunksNumber,
        chunks,
        customParamsRef,
        retryCountLimit,
        _retryCountRef,
        suspendedRef,
        canceledRef,
        currentUploadListRef,
        offlineStorage,
        spaceName,
        file,
        currentUpdateDataRef,
      });
    })
    .catch(() => {
      if (suspendedRef.current || canceledRef.current) {
        return;
      }
      if (offlineStorage && idRef.current !== undefined) {
        if (typeof idRef.current === "number") {
          db.files.update(idRef.current, {
            result: "failure",
            start: start,
            end: start + chunksNumber,
          });
        } else {
          currentUpdateDataRef!.current = {
            result: "failure",
            start: start,
            end: start + chunksNumber,
          };
        }
      }
      handleFail(start);
    });
};

const createHiddenUploaderInput = (() => {
  let input: HTMLInputElement;
  let handleChange: (event: Event) => void;
  return <T>(
    {
      sliceSize,
      minSlicedFileSize,
      chunksNumber,
      retryCountLimit,
      multiple,
      accept,
      offlineStorage,
      spaceName,
      immediately,
      sizeLimit,
      upload,
      handleProcess,
    }: FullyLargeFileUploaderOptions<T>,
    currentUploadList: UploaderData[],
    uploadPromiseResolve: (value?: any) => void,
    uploadPromiseReject: (value?: any) => void
  ) => {
    handleChange = async (event: Event) => {
      if (event.target) {
        const files = Array.from(
          (event.target as HTMLInputElement).files!
        ).filter((file) =>
          sizeLimit
            ? file.size >= sizeLimit[0] && file.size <= sizeLimit[1]
            : true
        );
        if (files) {
          const chunksList = files.map((file) => {
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
            Reflect.ownKeys(progressData).forEach((key) => {
              // @ts-ignore
              progressList[index][key] = progressData[key];
            });
            return progressList as UploaderData[];
          };
          const uploadList = chunksList.map((chunks, index) => {
            const length = chunks.length;
            const _retryCountRef = { current: 0 };
            const suspendedRef = { current: false };
            const canceledRef = { current: false };
            const sliceStartRef = { current: 0 };
            const customParamsRef: { current: T } = {
              current: undefined as any,
            };
            const currentUploadListRef: { current: UploaderData[] } = {
              current: currentUploadList,
            };
            const currentUpdateDataRef: { current: any } = {
              current: undefined,
            };
            return new Promise(async (resolve, reject) => {
              let idRef: { current: number | Promise<number> | undefined } = {
                current: undefined,
              };
              const computeProgress = (start: number) => start / length;
              const pause = () => {
                suspendedRef.current = true;
                if (progressList[index].result === "uploading") {
                  updateProgressList(index, {
                    result: "suspended",
                    progress: computeProgress(sliceStartRef.current),
                  });
                  handleProcess(filterUploadDataList(currentUploadList));
                  if (
                    idRef.current !== undefined &&
                    typeof idRef.current !== "number"
                  ) {
                    idRef.current.then((id) => {
                      db.files.update(id, {
                        result: "suspended",
                        start: sliceStartRef.current,
                        end: sliceStartRef.current + chunksNumber,
                      });
                    });
                  } else if (typeof idRef.current === "number") {
                    db.files.update(idRef.current, {
                      result: "suspended",
                      start: sliceStartRef.current,
                      end: sliceStartRef.current + chunksNumber,
                    });
                  }
                }
              };
              const resume = () => {
                if (
                  progressList[index].result === "initialization" ||
                  progressList[index].result === "suspended" ||
                  progressList[index].result === "failure"
                ) {
                  _retryCountRef.current = 0;
                  suspendedRef.current = false;
                  updateProgressList(index, {
                    result: "uploading",
                  });
                  handleProcess(filterUploadDataList(currentUploadList));
                  const start = sliceStartRef.current;
                  autoUpload(start, {
                    idRef,
                    upload,
                    updateProgressList,
                    computeProgress,
                    handleProcess,
                    resolve,
                    reject,
                    sliceStartRef,
                    length,
                    index,
                    chunksNumber,
                    chunks,
                    customParamsRef,
                    retryCountLimit,
                    _retryCountRef,
                    suspendedRef,
                    canceledRef,
                    currentUploadListRef,
                    offlineStorage,
                    spaceName,
                    file: files[index],
                    currentUpdateDataRef,
                  });
                }
              };
              const remove = () => {
                canceledRef.current = true;
                updateProgressList(index, {
                  result: "cancel",
                });
                handleProcess(filterUploadDataList(currentUploadList));
                if (
                  idRef.current !== undefined &&
                  typeof idRef.current !== "number"
                ) {
                  idRef.current.then((id) => {
                    db.files.delete(id);
                  });
                } else if (typeof idRef.current === "number") {
                  db.files.delete(idRef.current);
                }
                resolve(true);
              };
              updateProgressList(index, {
                pause,
                resume,
                remove,
              });
              const indexInTotalList = currentUploadList.length + index;
              currentUploadList[indexInTotalList] = progressList[index] as any;
              if (offlineStorage) {
                idRef.current = db.files.add({
                  file: files[index],
                  chunks: chunks,
                  result: "initialization",
                  start: 0,
                  end: chunksNumber,
                  customParams: customParamsRef.current,
                  spaceName: spaceName || "",
                }) as Promise<number>;

                idRef.current.then((data) => {
                  if (currentUpdateDataRef.current) {
                    db.files.update(data, currentUpdateDataRef.current);
                    idRef.current = data;
                  }
                });
              }
              if (immediately) {
                resume();
              }
            });
          });
          handleProcess(filterUploadDataList(currentUploadList));
          const results = await Promise.all(uploadList);
          if (results.every((result, index) => result === true)) {
            uploadPromiseResolve();
          } else {
            const errorsRecord = results
              .reduce((r: number[], result, index) => {
                if (result !== true) {
                  r.push(index);
                }
                return r;
              }, [])
              .map((index) => files[index]);
            uploadPromiseReject(errorsRecord);
          }
        }
      }
    };
    if (input) {
      input.value = "";
      return input;
    }
    input = document.createElement("input");
    input.style.display = "none";
    input.type = "file";
    input.multiple = multiple ? true : false;
    input.accept = accept;
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

const setDefaultOptions = <T>(
  largeFileUploaderOptions: LargeFileUploaderOptions<T>
): FullyLargeFileUploaderOptions<T> => {
  const defaultOptions: LargeFileUploaderOptionalOptions = {
    sliceSize: 100000,
    minSlicedFileSize: 200000,
    chunksNumber: 1,
    retryCountLimit: 3,
    multiple: true,
    accept: "",
    offlineStorage: false,
    spaceName: "",
    immediately: true,
    sizeLimit: null,
    init: () => {},
    handleProcess: () => {},
    error: (error) => {
      console.error("Large-File-Uploader occurred errors, error detail:");
      console.error(error);
    },
    success: () => {},
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
  remove: () => {
    throw new Error("不要在上传初始化前调用remove");
  },
};

const proxyUploaderList = (newestUploadDataList: UploaderData[]) => {
  return new Proxy(newestUploadDataList, {
    get(newestUploadDataList, index) {
      if (
        Number.isNaN(Number(index)) ||
        newestUploadDataList[index as any]._setUploader
      ) {
        return newestUploadDataList[index as any];
      } else {
        return initialUploader;
      }
    },
    set(newestUploadDataList, index, controller) {
      newestUploadDataList[index as any] = controller;
      newestUploadDataList[index as any]._setUploader = true;
      return true;
    },
  });
};

const uploadFile = <T>(
  newestUploadDataList: UploaderData[],
  largeFileUploaderOptions: LargeFileUploaderOptions<T>,
  uploadPromiseResolve: (value?: any) => void,
  uploadPromiseReject: (value?: any) => void,
  isInit: boolean
) => {
  if (!isInit) {
    return;
  }
  const options = setDefaultOptions<T>(largeFileUploaderOptions);

  const body = document.body;
  const input = createHiddenUploaderInput<T>(
    options,
    newestUploadDataList,
    uploadPromiseResolve,
    uploadPromiseReject
  );
  if (!include(body, input)) {
    document.body.appendChild(input);
  }
  input.click();
};

const getOfflineFiles = async <T>(
  currentUploadList: UploaderData[],
  { spaceName }: FullyLargeFileUploaderOptions<T>
) => {
  const files: FileDoc[] = await db.files
    .where("spaceName")
    .equals(spaceName)
    .toArray();

  return files.map((fileObject, index) => {
    currentUploadList[index] = {
      result:
        fileObject.result === "uploading" ? "suspended" : fileObject.result,
      progress: fileObject.start / fileObject.chunks.length,
      file: fileObject.file,
    } as any;
    return {
      name: fileObject.file.name,
      file: fileObject.file,
      result:
        fileObject.result === "uploading" ? "suspended" : fileObject.result,
      progress: fileObject.start / fileObject.chunks.length,
      fileObject,
    };
  });
};

const createFileUploader = <T>(
  largeFileUploaderOptions: LargeFileUploaderOptions<T>
) => {
  let isInit = false;
  const options = setDefaultOptions<T>(largeFileUploaderOptions);
  const currentUploadList: UploaderData[] = [];
  const suspendAll = () => {
    currentUploadList.forEach((uploader) => uploader.pause());
  };
  window.addEventListener("offline", suspendAll);

  let storagePromiseResolve: (value?: any) => void,
    storagePromiseReject: (value?: any) => void;
  const storagePromise = new Promise((resolve, reject) => {
    storagePromiseResolve = resolve;
    storagePromiseReject = reject;
  });

  let uploadPromiseResolve: (value?: any) => void,
    uploadPromiseReject: (value?: any) => void;
  const uploadPromise = new Promise((resolve, reject) => {
    uploadPromiseResolve = resolve;
    uploadPromiseReject = reject;
  });

  Promise.all([storagePromise, uploadPromise])
    .then(() => {
      options.success({ result: true, data: currentUploadList });
    })
    .catch((error) => {
      options.error(error);
    });

  if (options.offlineStorage) {
    getOfflineFiles(currentUploadList, options)
      .then(
        (
          uploadDataListInStorage: (ProgressData & { fileObject: FileDoc })[]
        ) => {
          const promise = Promise.all(
            uploadDataListInStorage.map((uploadData, index) => {
              return new Promise((resolve, reject) => {
                const suspendedRef = { current: false };
                const canceledRef = { current: false };
                const sliceStartRef = {
                  current: uploadData.fileObject.start,
                };
                const _retryCountRef = { current: 0 };
                const customParamsRef = {
                  current: uploadData.fileObject.customParams,
                };
                const currentUploadListRef = { current: currentUploadList };
                const updateUploadDataList = (
                  index: number,
                  progressData: Partial<UploaderData>
                ): UploaderData[] => {
                  currentUploadList[index] = {
                    ...currentUploadList[index],
                    ...progressData,
                  };
                  return currentUploadList;
                };
                const computeProgress = (start: number) =>
                  start / uploadData.fileObject.chunks.length;
                const pause = () => {
                  suspendedRef.current = true;
                  if (currentUploadList[index].result === "uploading") {
                    updateUploadDataList(index, {
                      result: "suspended",
                      progress: computeProgress(sliceStartRef.current),
                    });
                    options.handleProcess(
                      filterUploadDataList(currentUploadList)
                    );
                    db.files.update(uploadData.fileObject.id!, {
                      result: "suspended",
                      start: sliceStartRef.current,
                      end: sliceStartRef.current + options.chunksNumber,
                    });
                  }
                };
                const resume = () => {
                  if (
                    currentUploadList[index].result === "initialization" ||
                    currentUploadList[index].result === "suspended" ||
                    currentUploadList[index].result === "failure"
                  ) {
                    _retryCountRef.current = 0;
                    suspendedRef.current = false;
                    updateUploadDataList(index, {
                      result: "uploading",
                    });
                    options.handleProcess(
                      filterUploadDataList(currentUploadList)
                    );
                    const start = sliceStartRef.current;
                    autoUpload(start, {
                      idRef: { current: uploadData.fileObject.id },
                      upload: options.upload,
                      updateProgressList: updateUploadDataList,
                      computeProgress,
                      handleProcess: options.handleProcess,
                      resolve,
                      reject,
                      sliceStartRef,
                      length: uploadData.fileObject.chunks.length,
                      index,
                      chunksNumber: options.chunksNumber,
                      chunks: uploadData.fileObject.chunks,
                      customParamsRef,
                      retryCountLimit: options.retryCountLimit,
                      _retryCountRef,
                      suspendedRef,
                      canceledRef,
                      currentUploadListRef,
                      offlineStorage: options.offlineStorage,
                      spaceName: options.spaceName,
                      file: uploadData.fileObject.file,
                    });
                  }
                };
                const remove = () => {
                  canceledRef.current = true;
                  currentUploadList[index].result = "cancel";
                  options.handleProcess(
                    filterUploadDataList(currentUploadList)
                  );
                  db.files.delete(uploadData.fileObject.id!);
                  resolve(true);
                };
                currentUploadList[index].pause = pause;
                currentUploadList[index].resume = resume;
                currentUploadList[index].remove = remove;
              });
            })
          );
          options.init(currentUploadList);
          options.handleProcess(filterUploadDataList(currentUploadList));
          isInit = true;
          return promise;
        }
      )
      .then(() => {
        storagePromiseResolve();
      })
      .catch((error) => {
        storagePromiseReject(error);
      });
  } else {
    // @ts-ignore
    storagePromiseResolve();
  }

  return {
    uploadFile: () =>
      uploadFile<T>(
        currentUploadList,
        largeFileUploaderOptions,
        uploadPromiseResolve,
        uploadPromiseReject,
        isInit
      ),
  };
};

export default createFileUploader;
