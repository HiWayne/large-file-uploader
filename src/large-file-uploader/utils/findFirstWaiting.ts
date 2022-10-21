import { UploaderData } from "../type";

export const findFirstWaiting = (
  uploadDataList: UploaderData[]
): UploaderData | undefined => {
  let index: number = -1;
  const result = uploadDataList.some((u, _index) => {
    index = _index;
    return u.status === "waiting";
  });
  return result ? uploadDataList[index] : undefined;
};
