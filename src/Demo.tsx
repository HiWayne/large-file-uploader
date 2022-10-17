import { useCallback, useContext, useRef, useState } from "react";
import "./Demo.css";
import { Context } from "./App";
import largeFileUploader, { UploaderData } from "./large-file-uploader/index";
import { applyUploadId, uploadChunks, uploadChunksMaybeFailure } from "./mock";

function App() {
  const setPage = useContext(Context);

  const [uploaderList, setList] = useState<UploaderData[][]>([]);
  const [uploaderMaybeFailureList, setMaybeFailureList] = useState<
    UploaderData[][]
  >([]);

  const uploadNumberRef = useRef(0);
  const uploadMaybeFailureNumberRef = useRef(0);

  const handleUpload = () => {
    const uploadNumber = uploadNumberRef.current;
    const _uploaderList = largeFileUploader({
      async upload({ chunks, start, end, size }, customParams) {
        let id = customParams;
        // 分块上传后端可能需要一个id来记住上传的文件，所以开始先申请一个id
        if (!customParams) {
          id = await applyUploadId();
        }
        await uploadChunks({ id, chunks, start, end, size });
        // return的数据会作为下一次的customParams，这样这个文件每次upload都可以带上你需要的customParams
        return id;
      },
      handleProcess(progressList) {
        setList((uploaderList) => {
          uploaderList[uploadNumber] = progressList;
          return [...uploaderList];
        });
      },
    });
    uploaderList[uploadNumber] = _uploaderList;
    setList([...uploaderList]);
    uploadNumberRef.current++;
  };

  const handleUploadMaybeFailure = () => {
    const uploadMaybeFailureNumber = uploadMaybeFailureNumberRef.current;
    const _uploaderList = largeFileUploader({
      async upload({ chunks, start, end, size }, customParams) {
        let id = customParams;
        // 分块上传后端可能需要一个id来记住上传的文件，所以开始先申请一个id
        if (!customParams) {
          id = await applyUploadId();
        }
        await uploadChunksMaybeFailure({ id, chunks, start, end, size });
        // return的数据会作为下一次的customParams，这样这个文件每次upload都可以带上你需要的customParams
        return id;
      },
      handleProcess(progressList) {
        setMaybeFailureList((uploaderMaybeFailureList) => {
          uploaderMaybeFailureList[uploadMaybeFailureNumber] = progressList;
          return [...uploaderMaybeFailureList];
        });
      },
    });
    uploaderMaybeFailureList[uploadMaybeFailureNumber] = _uploaderList;
    setMaybeFailureList([...uploaderMaybeFailureList]);
    uploadMaybeFailureNumberRef.current++;
  };

  const pauseAll = useCallback(() => {
    uploaderList.forEach((uploaderList) =>
      uploaderList.forEach((uploader) => uploader.pause())
    );
  }, [uploaderList]);

  const resumeAll = useCallback(() => {
    uploaderList.forEach((uploaderList) =>
      uploaderList.forEach((uploader) => uploader.resume())
    );
  }, [uploaderList]);

  const pauseAllMaybeFailure = useCallback(() => {
    uploaderMaybeFailureList.forEach((uploaderList) =>
      uploaderList.forEach((uploader) => uploader.pause())
    );
  }, [uploaderMaybeFailureList]);

  const resumeAllMaybeFailure = useCallback(() => {
    uploaderMaybeFailureList.forEach((uploaderList) =>
      uploaderList.forEach((uploader) => uploader.resume())
    );
  }, [uploaderMaybeFailureList]);

  return (
    <div className="demo">
      <div className="back">
        <button onClick={() => setPage("home")}>返回首页</button>
      </div>
      <p className="read-the-docs text-center mt-40px">
        上传可选多个文件，上传队列中的每一项可单独暂停/恢复。请求失败自动重试，默认重试3次依然失败转为手动恢复。
      </p>
      <div className="content">
        <div className="left">
          <h3>请求100%成功</h3>
          <div>
            <button onClick={handleUpload}>上传</button>
          </div>
          {uploaderList.reduce(
            (length, uploaderList) => uploaderList.length + length,
            0
          ) ? (
            <div>
              <button onClick={pauseAll}>全部暂停</button>
              <button onClick={resumeAll}>全部开始</button>
            </div>
          ) : null}
          {uploaderList.map((uploaderList, index1) => {
            return uploaderList.map((uploader, index2) => {
              const isSuspended = uploader.result === "suspended";
              const isFailure = uploader.result === "failure";
              const isComplete = uploader.result === "completed";
              return (
                <div key={`${index1}${index2}`}>
                  <p>文件名：{uploader.file.name}</p>
                  <p>
                    进度：{uploader.progress * 100}%；结果: {uploader.result}；
                    {isComplete ? null : (
                      <button
                        style={
                          isFailure
                            ? {
                                backgroundColor: "#f56c6c",
                                color: "#fff",
                              }
                            : undefined
                        }
                        onClick={
                          isSuspended || isFailure
                            ? uploader.resume
                            : uploader.pause
                        }
                      >
                        {isSuspended ? "继续" : isFailure ? "恢复" : "暂停"}
                      </button>
                    )}
                  </p>
                </div>
              );
            });
          })}
        </div>
        <div className="right">
          <h3>请求60%几率失败</h3>
          <div>
            <button onClick={handleUploadMaybeFailure}>上传</button>
          </div>
          {uploaderMaybeFailureList.reduce(
            (length, uploaderList) => uploaderList.length + length,
            0
          ) ? (
            <div>
              <button onClick={pauseAllMaybeFailure}>全部暂停</button>
              <button onClick={resumeAllMaybeFailure}>全部开始</button>
            </div>
          ) : null}
          {uploaderMaybeFailureList.map((uploaderList, index1) => {
            return uploaderList.map((uploader, index2) => {
              const isSuspended = uploader.result === "suspended";
              const isFailure = uploader.result === "failure";
              const isComplete = uploader.result === "completed";
              return (
                <div key={`${index1}${index2}`}>
                  <p>文件名：{uploader.file.name}</p>
                  <p>
                    进度：{uploader.progress * 100}%；结果: {uploader.result}；
                    {isComplete ? null : (
                      <button
                        style={
                          isFailure
                            ? {
                                backgroundColor: "#f56c6c",
                                color: "#fff",
                              }
                            : undefined
                        }
                        onClick={
                          isSuspended || isFailure
                            ? uploader.resume
                            : uploader.pause
                        }
                      >
                        {isSuspended ? "继续" : isFailure ? "恢复" : "暂停"}
                      </button>
                    )}
                  </p>
                </div>
              );
            });
          })}
        </div>
      </div>
    </div>
  );
}

export default App;
