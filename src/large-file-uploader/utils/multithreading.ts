const isEqualArray = (array1: any[], array2: any[]) => {
  if (
    Array.isArray(array1) &&
    Array.isArray(array2) &&
    array1.length === array2.length
  ) {
    return array1.every((item, index) => item === array2[index]);
  } else {
    return false;
  }
};

export const createMultithread = (url: string, count: number) => {
  return new Array(count).fill(true).map(() => {
    const worker = new Worker(url);
    return worker;
  });
};

export const multithreading = async (tasksData: any[], threads: Worker[]) => {
  const promiseHandlers: {
    resolve: (value?: any) => void;
    reject: (value?: any) => void;
  }[] = [];
  const promises = tasksData.map((taskData, index) => {
    return new Promise((resolve, reject) => {
      promiseHandlers[index] = { resolve, reject };
      const which = index % threads.length;
      threads[which].postMessage({ data: taskData, index });
    });
  });
  const onmessage = (
    event: MessageEvent<{
      index: number;
      data: any;
      result: boolean;
      task: string;
    }>
  ) => {
    const data: { index: number; data: any; result: boolean } = event.data;
    if (data.result) {
      promiseHandlers[data.index].resolve(data.data);
    } else {
      promiseHandlers[data.index].reject();
    }
  };
  threads.forEach((thread) => {
    thread.addEventListener("message", onmessage);
  });
  return Promise.all(promises).finally(() => {
    threads.forEach((thread) => {
      thread.removeEventListener("message", onmessage);
    });
  });
};

const promiseHandlers: {
  [task: string]: {
    resolve: (value?: any) => void;
    reject: (value?: any) => void;
  }[];
} = {};
let prevThreads: Worker[] = [];
export const createSetTaskToMultithreading = (
  threads: Worker[],
  task: string
) => {
  let index = 0;
  let threadIndex = 0;
  const onmessage = (
    event: MessageEvent<{
      index: number;
      data: any;
      result: boolean;
      task: string;
    }>
  ) => {
    const data = event.data;
    if (data.result) {
      promiseHandlers[data.task][data.index].resolve(data.data);
    } else {
      promiseHandlers[data.task][data.index].reject(data.data);
    }
  };
  if (!isEqualArray(threads, prevThreads)) {
    threads.forEach((thread) => {
      thread.addEventListener("message", onmessage);
    });
    prevThreads = threads;
  }
  return (taskData: any) => {
    let _resolve: (value?: any) => void = () => {},
      _reject: (value?: any) => void = () => {};
    const promise = new Promise((resolve, reject) => {
      _resolve = resolve;
      _reject = reject;
      const numberOfThreads = threads.length;
      threads[threadIndex].postMessage({ data: taskData, index, task });
      if (threadIndex >= numberOfThreads - 1) {
        threadIndex = 0;
      } else {
        threadIndex++;
      }
    });
    if (!promiseHandlers[task]) {
      promiseHandlers[task] = [];
    }
    promiseHandlers[task][index] = { resolve: _resolve, reject: _reject };
    index++;
    return promise.finally(() => {
      promiseHandlers[task][index] = undefined as any;
    });
  };
};
