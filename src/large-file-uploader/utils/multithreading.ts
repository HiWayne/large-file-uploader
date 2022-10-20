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
  threads.forEach((thread) => {
    thread.onmessage = (event) => {
      const data: { index: number; data: any; result: boolean } = event.data;
      if (data.result) {
        promiseHandlers[data.index].resolve(data.data);
      } else {
        promiseHandlers[data.index].reject();
      }
    };
  });
  return Promise.all(promises);
};

export const createSetTaskToMultithreading = (threads: Worker[]) => {
  let index = 0;
  let threadIndex = 0;
  const promiseHandlers: {
    resolve: (value?: any) => void;
    reject: (value?: any) => void;
  }[] = ([] = []);
  threads.forEach(thread => {
    thread.onmessage = (event) => {
      const data: { index: number; data: any; result: boolean } = event.data;
      if (data.result) {
        promiseHandlers[data.index].resolve(data.data);
      } else {
        promiseHandlers[data.index].reject(data.data);
      }
    };
  })
  return (taskData: any) => {
    let _resolve: (value?: any) => void = () => {},
      _reject: (value?: any) => void = () => {};
    const promise = new Promise((resolve, reject) => {
      _resolve = resolve;
      _reject = reject;
      const numberOfThreads = threads.length;
      threads[threadIndex].postMessage({ data: taskData, index });
      if (threadIndex >= numberOfThreads - 1) {
        threadIndex = 0;
      } else {
        threadIndex++;
      }
    });
    promiseHandlers[index] = { resolve: _resolve, reject: _reject };
    index++;
    return promise;
  };
};
