import styled from "styled-components";
import SyntaxHighlighter from "react-syntax-highlighter";
import { a11yDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { Nav } from "./Demo";
import { useNavigate } from "react-router-dom";

const apiPropertyMap: {
  key: string;
  desc: string;
  optional: boolean;
  default: string;
  type: string;
}[] = [
  {
    key: "immediately",
    desc: "选择文件后是否立即上传，false则需要手动调用resume上传",
    optional: true,
    default: "true",
    type: "boolean",
  },
  {
    key: "sizeLimit",
    desc: "文件大小限制，单位byte，第一个数字表示最小字节数、第二个数字表示最大字节数，若为null表示没有限制",
    optional: true,
    default: "null",
    type: "[number, number] | null",
  },
  {
    key: "multiple",
    desc: "是否支持多选",
    optional: true,
    default: "true",
    type: "boolean",
  },
  {
    key: "accept",
    desc: "上传的文件类型限制。格式是以逗号为分隔的唯一文件类型说明符列表。参考input标签的accept属性。如'image/png,.doc,.docx'",
    optional: true,
    default: '""',
    type: "string",
  },
  {
    key: "maxNumberOfRequest",
    desc: "最大并发请求数。如果你创建了多个上传器，它们的该项配置是各自独立的",
    optional: true,
    default: "6",
    type: "number",
  },
  {
    key: "retryCountLimit",
    desc: "上传失败最大自动重试次数",
    optional: true,
    default: "3",
    type: "number",
  },
  {
    key: "offlineStorage",
    desc: "是否开启离线缓存。离线缓存开启后，关闭页面也能找回未上传完成的文件继续上传。注意，谨慎开启。某些浏览器数据库对大文件存取耗时较长，可能更新不及时。",
    optional: true,
    default: "false",
    type: "boolean",
  },
  {
    key: "spaceName",
    desc: "离线缓存空间名称，开启离线缓存后有效。如果你打算创建多个上传器，你可能希望将它们的缓存记录隔离开。不设置则记录在公共空间。空间名称接受一个自定义字符串。",
    optional: true,
    default: "''",
    type: "string",
  },
  {
    key: "openHash",
    desc: "是否需要计算文件hash，如果不需要可以明显提升速度",
    optional: true,
    default: "true",
    type: "boolean",
  },
  {
    key: "numberOfThreads",
    desc: "计算hash时的线程数量。设置为1切换为单线程。",
    optional: true,
    default: "5",
    type: "number",
  },
  {
    key: "minSlicedFileSize",
    desc: "允许切片的最小文件大小，单位字节，默认1mb。断点续传需要将文件切片，小于这个大小的文件将不会切片，作为一个整体上传。",
    optional: true,
    default: "1000000",
    type: "number",
  },
  {
    key: "sliceSize",
    desc: "每个切片的大小，单位字节，默认100kb",
    optional: true,
    default: "100000",
    type: "number",
  },
  {
    key: "numberOfChunks",
    desc: "每次上传的切片数量。如果后端接口允许批量上传多个切片，设置多一些可以略微节省总请求流量，但数量过多也会干扰断点续传粒度。",
    optional: true,
    default: "1",
    type: "number",
  },
];

const apiMethodMap: {
  key: string;
  desc: string;
  optional: boolean;
  default: string;
  type: string;
}[] = [
  {
    key: "upload",
    desc: "处理上传请求的方法。接收的第一个参数是分片相关的信息，包括chunks-本次上传的分片blob数组、start-在总分片数组中的起始位置、end-在总分片数组中的结束位置、size-分片总数量、hashSum-所有分片的hash和。第二个参数是自定义数据，来自upload返回的Promise<T>中的T。场景举例：分段上传，后端可能需要一个id来记住上传的文件标识，所以开始前端先申请一个id，upload return这个id，它会作为后续分片上传时收到的的customParams，这样这个文件每次上传分片都可以带上那个id。",
    optional: false,
    default: "",
    type: `
        (
            uploadParams: {
                chunks: Blob[];
                start: number;
                end: number;
                size: number;
                hashSum: string;
            },
            customParams: T
        ) => Promise<T>
    `,
  },
  {
    key: "checkHash",
    desc: "从后端查询上传进度的方法。接受文件hash参数，可以给后端以查询文件上传进度，Promise返回值true表示已完成、number表示下一个该上传index为number的分块",
    optional: false,
    default: "",
    type: "(hash: string) => Promise<number | true>",
  },
  {
    key: "gotCache",
    desc: "读取缓存队列完成时的回调（需要开启离线缓存设置），这时参数有缓存队列和所有队列。",
    optional: true,
    default: "",
    type: "(cacheList: UploaderData[], uploaderDataList: UploaderData[]) => void",
  },
  {
    key: "handleProcess",
    desc: "上传进度回调函数，每当上传进度、上传状态发生变更时会被触发，包括缓存队列。",
    optional: true,
    default: "",
    type: "(uploaderDataList: UploaderData[]) => void",
  },
  {
    key: "error",
    desc: "上传队列发生任何错误时会被触发，包括缓存队列。",
    optional: true,
    default: "",
    type: "(uploaderDataList: UploaderData[]) => void",
  },
  {
    key: "success",
    desc: "上传队列全部完成时（包括上次未传完的缓存队列）会被触发",
    optional: true,
    default: "",
    type: "(data: {result: true; uploaderDataList: UploaderData[]}) => void",
  },
];

const Wrapper = styled.div`
  width: 70vw;
`;

const Table = styled.table`
  margin: 20px 0;
  padding: 20px;
  border-collapse: collapse;
  border: 1px solid #888;
`;

const DocHeads = styled(({ list, className }) => (
  <tr>
    {list.map((item: string, index: number) => (
      <th className={className} key={index}>
        {item}
      </th>
    ))}
  </tr>
))`
  padding: 12px;
  border: 1px solid #888;
`;

const DocRow = styled(({ className, data }) => (
  <tr>
    <td className={className}>{data.key}</td>
    <td className={className}>{data.desc}</td>
    <td className={className}>{data.type}</td>
    <td className={className}>{data.default}</td>
    <td className={className}>{data.optional ? "是" : "否"}</td>
  </tr>
))`
  padding: 12px;
  border: 1px solid #888;
`;

const ApiDoc = () => {
  const navigate = useNavigate();
  return (
    <Wrapper>
      <Nav>
        <button
          onClick={() => {
            navigate("/");
          }}
        >
          首页
        </button>
        <h3>&gt;</h3>
        <button
          onClick={() => {
            navigate("/demo");
          }}
        >
          Demo
        </button>
        <h3>&gt;</h3>
        <h3>API</h3>
      </Nav>
      <h2 style={{ margin: "40px 0" }}>Getting started</h2>
      <SyntaxHighlighter language="typescript" style={a11yDark}>
        {`import createFileUploader, type { UploaderData } from "large-file-uploader";

const uploader = createFileUploader({
    // upload中定义上传逻辑，它是createFileUploader唯一必须的配置，每次分片上传都会调用它
    // 这里举了一个分片上传例子，后端利用id知道分片属于哪个文件
    async upload({ chunks, start, end, size, hashSum }, customParams: number) {
      let id = customParams;
      // 没有customParams代表第一次调用
      if (id === undefined) {
        // 假设后端可能需要一个id来记住上传的文件，所以一开始先申请一个id
        id = await applyUploadId();
      }
      // 上传某个分片
      const response = await uploadChunk({ id, chunks, start, end, size });
      // 假设如果有response.end代表文件传完了
      if (response.end) {
        // 文件上传完成时的返回值会交给 UploaderData 中的result，里面可能有你需要的cdn地址等信息
        return response.data
      } else {
        // 上传过程中，return的数据会作为下一次的customParams，这样该文件每次upload分片都可以带上你需要的customParams（如本例的id）
        return id;
      }
      // 这里只是举例，也可能你是通过文件hash来和后端确认文件的，那直接使用hashSum参数就可以了，hashSum是该文件所有分片hash的和
    },
    init(uploadDataList: UploaderData[]) {
      // 这个回调触发之后才可以使用uploader.uploadFile()
    },
    handleProcess(uploadDataList: UploaderData[]) {
      // 这里可以收到上传列表状态的更新（包括进度、队列增删等变化）
    },
    success() {
      // 上传全部成功之后
    },
    error(uploadDataList: UploaderData[]) {
      // 发生错误时
    },
});
// 拿到上述代码的 uploader 后，调用 uploader.uploadFile，它会调起文件选择器。选择完文件后自动开始上传（你也可以使用 immediately: false 配置，这时仅仅将文件设为暂停状态放入队列中，由用户决定何时开始上传）

/* UploaderData: 
  {   
    result: "completed" | "failure" | "uploading" | "initialization" | "suspended" | "cancel"; // 上传状态
    progress: number; // 当前进度 0~1
    file: File; // 原文件
    result: any; // 上传完成后的后端返回结果
    isCache?: boolean; // 是否是缓存
    pause: () => void; // 暂停
    resume: () => void; // 继续
    remove: () => void; // 删除
  }
*/

// 上传队列中所有文件项对应 uploadDataList: UploaderData[] 数组, 里面包含每个上传项各自的暂停、恢复、移除操作，分别是 uploadDataItem: UploaderData 里的 pause、resume、remove方法
`}
      </SyntaxHighlighter>

      <h2 style={{ margin: "60px 0 40px 0" }}>API文档</h2>
      <Table>
        <thead>
          <DocHeads list={["属性", "描述", "类型", "默认值", "可选"]} />
        </thead>
        <tbody>
          {apiPropertyMap.map((data, index) => (
            <DocRow data={data} key={index} />
          ))}
        </tbody>
      </Table>
      <Table>
        <thead>
          <DocHeads list={["方法", "描述", "类型", "默认值", "可选"]} />
        </thead>
        <tbody>
          {apiMethodMap.map((data, index) => (
            <DocRow data={data} key={index} />
          ))}
        </tbody>
      </Table>
    </Wrapper>
  );
};

export default ApiDoc;
