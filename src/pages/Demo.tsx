import {
  MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { Input, Switch, InputNumber } from "antd";
import createFileUploader from "../large-file-uploader";
import type {
  CreateUploaderResponse,
  UploaderData,
} from "../large-file-uploader/type";
import { applyUploadId, uploadChunks, uploadChunksMaybeFailure } from "../mock";
import deleteIcon from "../assets/delete.svg";
import { Loading, SphericalProgress } from "../components";

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
  const isSuspended = uploader.status === "suspended";
  const isFailure = uploader.status === "failure";
  const isComplete = uploader.status === "completed";
  const isInitialization = uploader.status === "initialization";
  return (
    <Flex>
      <div style={{ width: "200px" }}>
        <p>文件名：{uploader.file.name}</p>
        <Flex>
          进度：
          <SphericalProgress progress={uploader.progress} />
        </Flex>
        <p>状态: {uploader.status}</p>
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

  const [offlineStorage, setOfflineStorage] = useState(true);
  const [immediately, setImmediately] = useState(true);
  const [sizeLimit, setSizeLimit] = useState(null);
  const [multiple, setMultiple] = useState(true);
  const [accept, setAccept] = useState("");
  const [maxNumberOfRequest, setMaxNumberOfRequest] = useState(6);
  const [retryCountLimit, setRetryCountLimit] = useState(3);
  const [openHash, setOpenHash] = useState(true);
  const [numberOfThreads, setNumberOfThreads] = useState(5);
  const [checkHashText, setCheckHashText] = useState("");
  const [uploadSpeed, setUploadSpeed] = useState(100);

  const [uploaderList, setList] = useState<UploaderData[]>([]);
  const [uploaderMaybeFailureList, setMaybeFailureList] = useState<
    UploaderData[]
  >([]);
  const [cacheLoadedInNormal, setCacheLoadedInNormal] = useState(
    !offlineStorage
  );
  const [cacheLoadedInMaybeFailure, setCacheLoadedInMaybeFailure] =
    useState(false);

  const normalUploaderRef: MutableRefObject<CreateUploaderResponse> = useRef(
    null as any
  );
  const maybeFailureUploadRef: MutableRefObject<CreateUploaderResponse> =
    useRef(null as any);

  const checkHash: ((hash: string) => Promise<number | true>) | undefined =
    useMemo(
      () =>
        checkHashText
          ? (new Function("hash", `return (${checkHashText})(hash)`) as (
              hash: string
            ) => Promise<number | true>)
          : undefined,
      [checkHashText]
    );

  useEffect(() => {
    const normalUploader = createFileUploader<number>({
      slice: false,
      offlineStorage,
      immediately,
      sizeLimit,
      multiple,
      accept,
      maxNumberOfRequest,
      retryCountLimit,
      openHash,
      numberOfThreads,
      checkHash,
      spaceName: "normal",
      minSlicedFileSize: 5000,
      sliceSize: 1000,
      async upload({ chunks, start, end, size }, customParams) {
        let id = customParams;
        // 分块上传后端可能需要一个id来记住上传的文件，所以开始先申请一个id
        if (customParams === undefined) {
          id = await applyUploadId();
        }
        await uploadChunks({ id, chunks, start, end, size }, uploadSpeed);
        // return的数据会作为下一次的customParams，这样这个文件每次upload都可以带上你需要的customParams
        return id;
      },
      gotCache(cacheList, uploadDataList) {
        setCacheLoadedInNormal(true);
        setList(uploadDataList);
      },
      update(uploadDataList) {
        setList(uploadDataList);
      },
    });
    normalUploaderRef.current = normalUploader;
    const maybeFailureUploader = createFileUploader<number>({
      offlineStorage,
      immediately,
      sizeLimit,
      multiple,
      accept,
      maxNumberOfRequest,
      retryCountLimit,
      openHash,
      numberOfThreads,
      checkHash,
      spaceName: "maybeFailure",
      minSlicedFileSize: 10000,
      sliceSize: 1000,
      async upload({ chunks, start, end, size }, customParams) {
        let id: number = customParams;
        // 分块上传后端可能需要一个id来记住上传的文件，所以开始先申请一个id
        if (customParams === undefined) {
          id = await applyUploadId();
        }
        await uploadChunksMaybeFailure(
          { id, chunks, start, end, size },
          uploadSpeed
        );
        // return的数据会作为下一次的customParams，这样这个文件每次upload都可以带上你需要的customParams
        return id;
      },
      gotCache(cacheList, uploadDataList) {
        setCacheLoadedInMaybeFailure(true);
        setMaybeFailureList(uploadDataList);
      },
      update(uploadDataList) {
        console.log("update");
        setMaybeFailureList(uploadDataList);
      },
    });
    maybeFailureUploadRef.current = maybeFailureUploader;

    return () => {
      clearAll();
      clearAllMaybeFailure();
    };
  }, [
    offlineStorage,
    immediately,
    sizeLimit,
    multiple,
    accept,
    maxNumberOfRequest,
    retryCountLimit,
    openHash,
    numberOfThreads,
    checkHashText,
    uploadSpeed,
  ]);

  const handleUpload = useCallback(() => {
    if (normalUploaderRef.current) {
      normalUploaderRef.current.uploadFile();
    }
  }, []);

  const handleUploadMaybeFailure = useCallback(() => {
    if (maybeFailureUploadRef.current) {
      maybeFailureUploadRef.current.uploadFile();
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

  const clearAll = useCallback(() => {
    uploaderList.forEach((uploader) => uploader.remove());
  }, [uploaderList]);

  const clearAllMaybeFailure = useCallback(() => {
    uploaderMaybeFailureList.forEach((uploader) => uploader.remove());
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
        上传可一次性选多个文件，每个上传项可单独暂停/恢复/删除。请求失败自动重试，默认自动重试3次然后转为手动重试。
      </Desc>
      <Desc className="read-the-docs" style={{ marginTop: "-12px" }}>
        demo中的上传器最小分片限制已被设置为5kb，≥5kb的小文件也可体验断点续传效果。
      </Desc>
      <ApiButton onClick={() => navigate("/api")}>查看API文档</ApiButton>
      <Content>
        <Left>
          <h3>请求100%成功</h3>
          <div style={{ textAlign: "center" }}>
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
            {cacheLoadedInNormal ? null : <Loading type="block" />}
          </UploadList>
        </Left>
        <Right>
          <h3>请求60%几率失败</h3>
          <div style={{ textAlign: "center" }}>
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
            {cacheLoadedInMaybeFailure ? null : <Loading type="block" />}
          </UploadList>
        </Right>
      </Content>
      {/* <div>
        <Switch
          checkedChildren="开启离线缓存"
          unCheckedChildren="关闭离线缓存"
        ></Switch>
      </div> */}
    </DemoWrapper>
  );
};

export default Demo;
