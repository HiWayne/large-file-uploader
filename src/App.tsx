import { createContext, Dispatch, useMemo, useState } from "react";
import reactLogo from "./assets/react.svg";
import "./App.css";
import Demo from "./Demo";

export const Context = createContext<Dispatch<"home" | "demo">>(null as any);

function App() {
  const [page, setPage] = useState<"home" | "demo">("home");

  const Home = () => {
    return (
      <>
        <div>
          <a href="https://vitejs.dev" target="_blank">
            <img src="/vite.svg" className="logo" alt="Vite logo" />
          </a>
          <a href="https://reactjs.org" target="_blank">
            <img src={reactLogo} className="logo react" alt="React logo" />
          </a>
        </div>
        <h1>文件上传</h1>
        <div className="card">
          <p>· 大文件切片</p>
          <p>· 断点续传</p>
          <p>· 离线保存</p>
        </div>
        <p className="read-the-docs">Click on the Demo button and learn more</p>
        <button onClick={() => setPage("demo")}>Demo</button>
      </>
    );
  };

  const pageMap = useMemo(
    () => ({
      demo: <Demo />,
      home: <Home />,
    }),
    []
  );

  return (
    <Context.Provider value={setPage}>
      <div className="App">{pageMap[page]}</div>
    </Context.Provider>
  );
}

export default App;
