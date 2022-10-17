export const applyUploadId = (): Promise<number> =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve(123456);
    }, 300);
  });

interface UploadChunksDTO {
  id: number;
  chunks: Blob[];
  start: number;
  end: number;
  size: number;
}

export const uploadChunks = (params: UploadChunksDTO): Promise<true> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 300);
  });
};

/**
 *
 * @description 有60%几率失败
 */
export const uploadChunksMaybeFailure = (
  params: UploadChunksDTO
): Promise<true> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() <= 0.6) {
        console.log(`${params.id}: failure`);
        reject(false);
      } else {
        resolve(true);
      }
    }, 300);
  });
};
