import {
  MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import createFileUploader from "../large-file-uploader";
import type { UploaderData } from "../large-file-uploader/type";
import { applyUploadId, uploadChunks, uploadChunksMaybeFailure } from "../mock";
import deleteIcon from "../assets/delete.svg";
import { SphericalProgress } from "../components";

const DemoWrapper = styled.div`
  height: 100vh;
`;

export const Nav = styled.div`
  padding-top: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Desc = styled.p`
  margin-top: 40px;
  text-align: center;
`;

const Content = styled.div`
  padding: 8px 40px;
  display: flex;
  justify-content: space-around;
  align-items: flex-start;
`;

const Left = styled.div`
  padding: 20px;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
`;

const Right = styled.div`
  padding: 20px;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
`;

const ApiButton = styled(({ children, className, onClick }) => (
  <div className={className}>
    <button onClick={onClick}>{children}</button>
  </div>
))`
  margin-top: 20px;
  text-align: center;
`;

const DeleteIcon = styled.div`
  margin-left: 20px;
  padding: 4px;
  width: 20px;
  height: 20px;
  background: url("${deleteIcon}") center / cover no-repeat;
  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }
`;

const UploadItem = ({ uploader }: { uploader: UploaderData }) => {
  const isSuspended = uploader.result === "suspended";
  const isFailure = uploader.result === "failure";
  const isComplete = uploader.result === "completed";
  const isInitialization = uploader.result === "initialization";
  return (
    <Flex>
      <div style={{ width: "200px" }}>
        <p>文件名：{uploader.file.name}</p>
        <Flex>
          进度：
          <SphericalProgress progress={uploader.progress} />
        </Flex>
        <p>状态: {uploader.result}；</p>
      </div>
      <div>
        {isComplete || isInitialization ? null : (
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
              isSuspended || isFailure ? uploader.resume : uploader.pause
            }
          >
            {isSuspended ? "开始" : isFailure ? "恢复" : "暂停"}
          </button>
        )}
      </div>
      <DeleteIcon onClick={uploader.remove} />
    </Flex>
  );
};

const UploadList = styled.div`
  margin-top: 20px;
  padding: 20px;
  border: 1px solid #888;
  border-radius: 16px;
  width: 360px;
  height: 500px;
  overflow-y: auto;

  &::-webkit-scrollbar-track {
    -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
    border-radius: 10px;
    background-color: var(--TRANSPARENT);
  }
  &::-webkit-scrollbar {
    width: 8px;
    background-color: var(--TRANSPARENT);
  }
  &::-webkit-scrollbar-thumb {
    border-radius: 10px;
    -webkit-box-shadow: inset 0 0 6px rgba(255, 255, 255, 0.3);
    background-color: var(--SCROLLBAR_THUMB_COLOR);
  }
`;

const Demo = () => {
  const navigate = useNavigate();

  const [uploaderList, setList] = useState<UploaderData[]>([]);
  const [uploaderMaybeFailureList, setMaybeFailureList] = useState<
    UploaderData[]
  >([]);

  const normalUploadRef: MutableRefObject<() => void> = useRef(null as any);
  const maybeFailureUploadRef: MutableRefObject<() => void> = useRef(
    null as any
  );

  useEffect(() => {
    const normalUploader = createFileUploader({
      offlineStorage: true,
      spaceName: "normal",
      async upload({ chunks, start, end, size }, customParams: number) {
        let id = customParams;
        // 分块上传后端可能需要一个id来记住上传的文件，所以开始先申请一个id
        if (customParams === undefined) {
          id = await applyUploadId();
        }
        await uploadChunks({ id, chunks, start, end, size });
        // return的数据会作为下一次的customParams，这样这个文件每次upload都可以带上你需要的customParams
        return id;
      },
      gotCache(cacheList, uploadDataList) {
        setList(uploadDataList);
      },
      handleProcess(uploadDataList) {
        setList(uploadDataList);
      },
    });
    normalUploadRef.current = normalUploader.uploadFile;
    const maybeFailureUploader = createFileUploader<number>({
      offlineStorage: true,
      spaceName: "maybeFailure",
      async upload({ chunks, start, end, size }, customParams) {
        let id: number = customParams;
        // 分块上传后端可能需要一个id来记住上传的文件，所以开始先申请一个id
        if (customParams === undefined) {
          id = await applyUploadId();
        }
        await uploadChunksMaybeFailure({ id, chunks, start, end, size });
        // return的数据会作为下一次的customParams，这样这个文件每次upload都可以带上你需要的customParams
        return id;
      },
      gotCache(cacheList, uploadDataList) {
        setMaybeFailureList(uploadDataList);
      },
      handleProcess(uploadDataList) {
        setMaybeFailureList(uploadDataList);
      },
    });
    maybeFailureUploadRef.current = maybeFailureUploader.uploadFile;
  }, []);

  const handleUpload = useCallback(() => {
    if (normalUploadRef.current) {
      normalUploadRef.current();
    }
  }, []);

  const handleUploadMaybeFailure = useCallback(() => {
    if (maybeFailureUploadRef.current) {
      maybeFailureUploadRef.current();
    }
  }, []);

  const pauseAll = useCallback(() => {
    uploaderList.forEach((uploader) => uploader.pause());
  }, [uploaderList]);

  const resumeAll = useCallback(() => {
    uploaderList.forEach((uploader) => uploader.resume());
  }, [uploaderList]);

  const pauseAllMaybeFailure = useCallback(() => {
    uploaderMaybeFailureList.forEach((uploader) => uploader.pause());
  }, [uploaderMaybeFailureList]);

  const resumeAllMaybeFailure = useCallback(() => {
    uploaderMaybeFailureList.forEach((uploader) => uploader.resume());
  }, [uploaderMaybeFailureList]);

  return (
    <DemoWrapper>
      <Nav>
        <button
          onClick={() => {
            navigate("/");
          }}
        >
          首页
        </button>
        <h3>&gt;</h3>
        <h3>Demo</h3>
      </Nav>
      <Desc className="read-the-docs">
        上传可选多个文件，上传队列中的每一项可单独暂停/恢复。请求失败自动重试，默认重试3次依然失败转为手动恢复。
      </Desc>
      <ApiButton onClick={() => navigate("/api")}>查看API文档</ApiButton>
      <Content>
        <Left>
          <h3>请求100%成功</h3>
          <div>
            <button onClick={handleUpload}>选择上传文件</button>
            {uploaderList.length ? (
              <div style={{ marginTop: "20px" }}>
                <button onClick={pauseAll}>全部暂停</button>
                <button onClick={resumeAll}>全部开始</button>
              </div>
            ) : null}
          </div>

          <UploadList>
            {uploaderList.map((uploader, index) => (
              <UploadItem uploader={uploader} key={index} />
            ))}
          </UploadList>
        </Left>
        <Right>
          <h3>请求60%几率失败</h3>
          <div>
            <button onClick={handleUploadMaybeFailure}>选择上传文件</button>
            {uploaderMaybeFailureList.length ? (
              <div style={{ marginTop: "20px" }}>
                <button onClick={pauseAllMaybeFailure}>全部暂停</button>
                <button onClick={resumeAllMaybeFailure}>全部开始</button>
              </div>
            ) : null}
          </div>
          <UploadList>
            {uploaderMaybeFailureList.map((uploader, index) => (
              <UploadItem uploader={uploader} key={index} />
            ))}
          </UploadList>
        </Right>
      </Content>
    </DemoWrapper>
  );
};

export default Demo;
