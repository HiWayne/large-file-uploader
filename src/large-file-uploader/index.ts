import SparkMD5 from "spark-md5";
import { db, FileDoc } from "./utils/storage";
import {
  CreateUploader,
  FullyLargeFileUploaderOptions,
  LargeFileUploaderOptionalOptions,
  LargeFileUploaderOptions,
  ProgressData,
  Upload,
  UploaderData,
} from "./type";
import { workerFn } from "./utils/worker";
import {
  createMultithread,
  createSetTaskToMultithreading,
} from "./utils/multithreading";
import { findFirstWaiting } from "./utils/findFirstWaiting";

export * from "./type";

const computeUploadDataList = (list: UploaderData[]) => {
  return list.filter((uploadData) => uploadData.status !== "cancel").reverse();
};

const autoUpload = <T>(
  start = 0,
  {
    idRef,
    upload,
    updateUploadDataList,
    computeProgress,
    update,
    resolve,
    reject,
    sliceStartRef,
    length,
    index,
    numberOfChunks,
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
    hashSum,
    currentNumberOfRequestRef,
    maxNumberOfRequest,
  }: {
    idRef: { current: number | Promise<number> | undefined };
    upload: Upload<T>;
    updateUploadDataList: (
      index: number,
      progressData: Partial<UploaderData>
    ) => UploaderData[];
    computeProgress: (n: number) => number;
    update: (progressDataList: UploaderData[]) => void;
    resolve: (value?: any) => void;
    reject: (value?: any) => void;
    sliceStartRef: { current: number };
    length: number;
    index: number;
    numberOfChunks: number;
    chunks: (Blob | File)[];
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
    hashSum: string;
    currentNumberOfRequestRef: { current: number };
    maxNumberOfRequest: number;
  },
  isFirst?: boolean
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
        updateUploadDataList,
        computeProgress,
        update,
        resolve,
        reject,
        sliceStartRef,
        length,
        index,
        numberOfChunks,
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
        hashSum,
        currentNumberOfRequestRef,
        maxNumberOfRequest,
      });
    } else {
      sliceStartRef.current = start;
      updateUploadDataList(index, {
        status: "failure",
        progress: computeProgress(start),
      });
      update(computeUploadDataList(currentUploadListRef.current));
      reject(start);
    }
  };
  if (isFirst && currentNumberOfRequestRef.current < maxNumberOfRequest) {
    updateUploadDataList(index, {
      status: "uploading",
    });
    update(computeUploadDataList(currentUploadListRef.current));
    if (idRef.current !== undefined) {
      if (typeof idRef.current === "number") {
        db.files.update(idRef.current, {
          status: "uploading",
        });
      } else {
        idRef.current.then((id) => {
          db.files.update(id, {
            status: "uploading",
          });
        });
      }
    }
    currentNumberOfRequestRef.current++;
  } else if (
    isFirst &&
    currentNumberOfRequestRef.current >= maxNumberOfRequest
  ) {
    updateUploadDataList(index, {
      status: "waiting",
    });
    update(computeUploadDataList(currentUploadListRef.current));
    if (idRef.current !== undefined) {
      if (typeof idRef.current === "number") {
        db.files.update(idRef.current, {
          status: "waiting",
        });
      } else {
        idRef.current.then((id) => {
          db.files.update(id, {
            status: "waiting",
          });
        });
      }
    }
    return;
  }

  const nextStart = start + numberOfChunks;

  upload(
    {
      chunks: chunks.slice(start, nextStart),
      start: start,
      end: nextStart - 1,
      size: length,
      hashSum,
    },
    customParamsRef.current,
    (data) => {
      if (data) {
        updateUploadDataList(index, {
          ...data,
        });
        update(computeUploadDataList(currentUploadListRef.current));
      }
    }
  )
    .then((data) => {
      if (suspendedRef.current || canceledRef.current) {
        return;
      }
      if (offlineStorage && idRef.current !== undefined) {
        if (typeof idRef.current === "number") {
          db.files.update(idRef.current, {
            status: "uploading",
            start: nextStart,
            end: nextStart + numberOfChunks,
            customParams: customParamsRef.current,
          });
        } else {
          currentUpdateDataRef!.current = {
            status: "uploading",
            start: nextStart,
            end: nextStart + numberOfChunks,
            customParams: customParamsRef.current,
          };
        }
      }
      _retryCountRef.current = 0;
      customParamsRef.current = data;
      sliceStartRef.current = nextStart;
      updateUploadDataList(index, {
        status: "uploading",
        progress: computeProgress(nextStart),
      });
      update(computeUploadDataList(currentUploadListRef.current));
      // 完成
      if (nextStart >= length) {
        currentNumberOfRequestRef.current--;
        sliceStartRef.current = length;
        updateUploadDataList(index, {
          status: "completed",
          progress: computeProgress(length),
          result: data,
        });
        update(computeUploadDataList(currentUploadListRef.current));
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
        const uploader = findFirstWaiting(currentUploadListRef.current);
        if (uploader) {
          uploader.resume();
        }
        return;
      }
      autoUpload(nextStart, {
        idRef,
        upload,
        updateUploadDataList,
        computeProgress,
        update,
        resolve,
        reject,
        sliceStartRef,
        length,
        index,
        numberOfChunks,
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
        hashSum,
        currentNumberOfRequestRef,
        maxNumberOfRequest,
      });
    })
    .catch(() => {
      if (suspendedRef.current || canceledRef.current) {
        return;
      }
      if (offlineStorage && idRef.current !== undefined) {
        if (typeof idRef.current === "number") {
          db.files.update(idRef.current, {
            status: "failure",
            start: start,
            end: start + numberOfChunks,
          });
        } else {
          currentUpdateDataRef!.current = {
            status: "failure",
            start: start,
            end: start + numberOfChunks,
          };
        }
      }
      handleFail(start);
    });
};

const createHiddenUploaderInputOrCreateDirectlyUpload = (
  files?: File[] | FileList
) => {
  let input: HTMLInputElement;
  let handleChange: (
    event: Event | File[] | FileList,
    directly?: boolean
  ) => void;

  const scriptBlob = new Blob([`(${workerFn})()`], {
    type: "application/javascript",
  });

  const blobURL = URL.createObjectURL(scriptBlob);

  return <T>(
    {
      slice,
      sliceSize,
      minSlicedFileSize,
      numberOfChunks,
      retryCountLimit,
      multiple,
      accept,
      offlineStorage,
      spaceName,
      immediately,
      sizeLimit,
      numberOfThreads,
      openHash,
      maxNumberOfRequest,
      upload,
      update,
      checkHash,
    }: FullyLargeFileUploaderOptions<T>,
    currentUploadList: UploaderData[],
    uploadPromiseResolve: (value?: any) => void,
    uploadPromiseReject: (value?: any) => void
  ) => {
    const workers =
      numberOfThreads > 1 ? createMultithread(blobURL, numberOfThreads) : [];
    // 可以作为input事件，也可直接传入文件
    handleChange = async (
      event: Event | File[] | FileList,
      directly?: boolean
    ) => {
      if (directly || (event as Event).target) {
        const files = directly
          ? Array.isArray(event)
            ? event
            : Array.from(event as FileList)
          : Array.from(
              ((event as Event).target as HTMLInputElement).files!
            ).filter((file) =>
              sizeLimit
                ? file.size >= sizeLimit[0] && file.size <= sizeLimit[1]
                : true
            );
        if (files) {
          const currentNumberOfRequestRef: { current: number } = { current: 0 };
          const createUploaderData = (index: number): ProgressData => ({
            status: "initialization",
            progress: 0,
            file: files[index],
            result: null,
            createTimestamp: new Date().getTime(),
            total: 0,
          });
          const progressList = files.map((_, index) => {
            const uploader = createUploaderData(index);
            // 每个文件都加在缓存文件后面，上一个文件会让currentUploadList.length + 1，要抵消掉
            const indexInTotalList = currentUploadList.length;
            currentUploadList[indexInTotalList] = uploader as any;
            return uploader;
          });
          const updateUploadDataList = (
            index: number,
            progressData: Partial<UploaderData>
          ): UploaderData[] => {
            Reflect.ownKeys(progressData).forEach((key) => {
              // @ts-ignore
              progressList[index][key] = progressData[key];
            });
            return progressList as UploaderData[];
          };
          update(computeUploadDataList(currentUploadList));
          const uploadList = files.map(async (file, index) => {
            const spark = new SparkMD5();
            const chunks: (Blob | File)[] = [];
            const size = file.size;
            const sliceStartRef = { current: 0 };
            let length = 0;
            let md5HexHash = "";
            const computeProgress = (start: number) => start / length;

            // 未开启切片或文件大小小于切片限制则将整个文件作为第一个切片, chunk: [File]
            if (slice && size >= minSlicedFileSize) {
              const sliceNumber = Math.ceil(size / sliceSize);
              const setTaskToMultithreading = createSetTaskToMultithreading(
                workers,
                `${Math.random().toFixed(6)}-${index}`
              );
              const multithreadTasksPromise = [];
              for (let i = 0; i < sliceNumber; i++) {
                const slicedFile = file.slice(
                  i * sliceSize,
                  (i + 1) * sliceSize
                );
                chunks.push(slicedFile);
                if (openHash && numberOfThreads > 1) {
                  const text = await slicedFile.text();
                  multithreadTasksPromise[i] = setTaskToMultithreading(text);
                } else if (openHash && numberOfThreads <= 1) {
                  const text = await slicedFile.text();
                  spark.append(text);
                }
              }
              length = chunks.length;
              if (openHash) {
                if (numberOfThreads > 1) {
                  const results = await Promise.all(multithreadTasksPromise);
                  md5HexHash = results.reduce(
                    (hash: string, result) => hash + result,
                    ""
                  );
                } else {
                  md5HexHash = spark.end();
                }
                if (checkHash) {
                  const result = await checkHash(md5HexHash);
                  if (result === true) {
                    sliceStartRef.current = length;
                    updateUploadDataList(index, {
                      status: "completed",
                      progress: 1,
                    });
                    update(computeUploadDataList(currentUploadList));
                  } else if (typeof result === "number") {
                    sliceStartRef.current = result;
                    updateUploadDataList(index, {
                      status: "suspended",
                      progress: computeProgress(result),
                    });
                    update(computeUploadDataList(currentUploadList));
                  }
                }
              } else {
                updateUploadDataList(index, {
                  status: "suspended",
                });
                update(computeUploadDataList(currentUploadList));
              }
            } else {
              chunks.push(file);
              length = chunks.length;
            }
            updateUploadDataList(index, { total: length });
            update(computeUploadDataList(currentUploadList));
            const _retryCountRef = { current: 0 };
            const suspendedRef = { current: false };
            const canceledRef = { current: false };
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
              const pause = () => {
                suspendedRef.current = true;
                if (progressList[index].status === "uploading") {
                  currentNumberOfRequestRef.current--;
                  updateUploadDataList(index, {
                    status: "suspended",
                    progress: computeProgress(sliceStartRef.current),
                  });
                  update(computeUploadDataList(currentUploadList));
                  const uploader = findFirstWaiting(
                    currentUploadListRef.current
                  );
                  if (uploader) {
                    uploader.resume();
                  }
                  if (
                    idRef.current !== undefined &&
                    typeof idRef.current !== "number"
                  ) {
                    idRef.current.then((id) => {
                      db.files.update(id, {
                        status: "suspended",
                        start: sliceStartRef.current,
                        end: sliceStartRef.current + numberOfChunks,
                      });
                    });
                  } else if (typeof idRef.current === "number") {
                    db.files.update(idRef.current, {
                      status: "suspended",
                      start: sliceStartRef.current,
                      end: sliceStartRef.current + numberOfChunks,
                    });
                  }
                }
              };
              const resume = () => {
                if (
                  progressList[index].status === "initialization" ||
                  progressList[index].status === "suspended" ||
                  progressList[index].status === "failure"
                ) {
                  _retryCountRef.current = 0;
                  suspendedRef.current = false;
                  const start = sliceStartRef.current;
                  autoUpload(
                    start,
                    {
                      idRef,
                      upload,
                      updateUploadDataList,
                      computeProgress,
                      update,
                      resolve,
                      reject,
                      sliceStartRef,
                      length,
                      index,
                      numberOfChunks,
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
                      hashSum: md5HexHash,
                      currentNumberOfRequestRef,
                      maxNumberOfRequest,
                    },
                    true
                  );
                }
              };
              const remove = () => {
                currentNumberOfRequestRef.current--;
                canceledRef.current = true;
                updateUploadDataList(index, {
                  status: "cancel",
                });
                update(computeUploadDataList(currentUploadList));
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
              updateUploadDataList(index, {
                pause,
                resume,
                remove,
              });
              if (offlineStorage && sliceStartRef.current < length) {
                idRef.current = db.files.add({
                  file: files[index],
                  chunks: chunks,
                  status: "suspended",
                  start: 0,
                  end: numberOfChunks,
                  customParams: customParamsRef.current,
                  spaceName: spaceName || "",
                  hashSum: md5HexHash,
                  createTimestamp: progressList[index].createTimestamp,
                }) as Promise<number>;

                idRef.current.then((id) => {
                  if (currentUpdateDataRef.current) {
                    db.files.update(id, currentUpdateDataRef.current);
                    idRef.current = id;
                  }
                });
              }
              if (immediately && sliceStartRef.current < length) {
                resume();
              }
            });
          });
          const results = await Promise.all(uploadList);
          if (results.every((result) => result === true)) {
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
    if (files) {
      handleChange(files, true);
    } else {
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
    }
  };
};

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
    slice: true,
    sliceSize: 100000,
    minSlicedFileSize: 1000000,
    numberOfChunks: 1,
    retryCountLimit: 3,
    multiple: true,
    accept: "",
    offlineStorage: false,
    spaceName: "",
    immediately: true,
    sizeLimit: null,
    numberOfThreads: 3,
    openHash: true,
    maxNumberOfRequest: 6,
    gotCache: () => {},
    update: () => {},
    error: (error) => {
      console.error("Large-File-Uploader occurred errors, error detail:");
      console.error(error);
    },
    success: () => {},
    checkHash: undefined,
  };
  return { ...defaultOptions, ...largeFileUploaderOptions };
};

const uploadFile = <T>(
  newestUploadDataList: UploaderData[],
  largeFileUploaderOptions: LargeFileUploaderOptions<T>,
  uploadPromiseResolve: (value?: any) => void,
  uploadPromiseReject: (value?: any) => void
) => {
  const options = setDefaultOptions<T>(largeFileUploaderOptions);

  const body = document.body;
  const createInput = createHiddenUploaderInputOrCreateDirectlyUpload();
  const input = createInput<T>(
    options,
    newestUploadDataList,
    uploadPromiseResolve,
    uploadPromiseReject
  ) as HTMLInputElement;
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

  const fileCacheCount = files.length;
  const currentUploadListLength = currentUploadList.length;
  if (fileCacheCount && currentUploadListLength) {
    for (let i = currentUploadListLength - 1; i >= 0; i--) {
      currentUploadList[i + fileCacheCount] = currentUploadList[i];
    }
  }
  return files.map((fileObject, index) => {
    currentUploadList[index] = {
      status: "suspended" as "suspended",
      progress: fileObject.start / fileObject.chunks.length,
      isCache: true,
      file: fileObject.file,
      result: null,
      createTimestamp: fileObject.createTimestamp,
      total: fileObject.chunks.length,
    } as any;
    return {
      name: fileObject.file.name,
      file: fileObject.file,
      status: "suspended" as "suspended",
      progress: fileObject.start / fileObject.chunks.length,
      result: null,
      createTimestamp: fileObject.createTimestamp,
      total: fileObject.chunks.length,
      fileObject,
    };
  });
};

const createFileUploader: CreateUploader = <T = never>(
  largeFileUploaderOptions: LargeFileUploaderOptions<T>
) => {
  const options = setDefaultOptions<T>(largeFileUploaderOptions);
  const currentUploadList: UploaderData[] = [];

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
          const currentNumberOfRequestRef = { current: 0 };
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
                  if (currentUploadList[index].status === "uploading") {
                    currentNumberOfRequestRef.current--;
                    updateUploadDataList(index, {
                      status: "suspended",
                      progress: computeProgress(sliceStartRef.current),
                    });
                    options.update(computeUploadDataList(currentUploadList));
                    const uploader = findFirstWaiting(
                      currentUploadListRef.current
                    );
                    if (uploader) {
                      uploader.resume();
                    }
                    db.files.update(uploadData.fileObject.id!, {
                      status: "suspended",
                      start: sliceStartRef.current,
                      end: sliceStartRef.current + options.numberOfChunks,
                    });
                  }
                };
                const resume = () => {
                  if (
                    currentUploadList[index].status === "initialization" ||
                    currentUploadList[index].status === "suspended" ||
                    currentUploadList[index].status === "failure"
                  ) {
                    _retryCountRef.current = 0;
                    suspendedRef.current = false;
                    const start = sliceStartRef.current;
                    autoUpload(
                      start,
                      {
                        idRef: { current: uploadData.fileObject.id },
                        upload: options.upload,
                        updateUploadDataList: updateUploadDataList,
                        computeProgress,
                        update: options.update,
                        resolve,
                        reject,
                        sliceStartRef,
                        length: uploadData.fileObject.chunks.length,
                        index,
                        numberOfChunks: options.numberOfChunks,
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
                        hashSum: uploadData.fileObject.hashSum,
                        currentNumberOfRequestRef,
                        maxNumberOfRequest: options.maxNumberOfRequest,
                      },
                      true
                    );
                  }
                };
                const remove = () => {
                  currentNumberOfRequestRef.current--;
                  canceledRef.current = true;
                  currentUploadList[index].status = "cancel";
                  options.update(computeUploadDataList(currentUploadList));
                  db.files.delete(uploadData.fileObject.id!);
                  resolve(true);
                };
                currentUploadList[index].pause = pause;
                currentUploadList[index].resume = resume;
                currentUploadList[index].remove = remove;
              });
            })
          );
          options.gotCache(
            currentUploadList.slice(0, uploadDataListInStorage.length),
            currentUploadList
          );
          options.update(computeUploadDataList(currentUploadList));
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
        uploadPromiseReject
      ),
    giveFilesToUpload: (files: File[] | FileList) => {
      const uploadDirectly =
        createHiddenUploaderInputOrCreateDirectlyUpload(files);
      uploadDirectly<T>(
        options,
        currentUploadList,
        uploadPromiseResolve,
        uploadPromiseReject
      ) as HTMLInputElement;
    },
  };
};

export default createFileUploader;
