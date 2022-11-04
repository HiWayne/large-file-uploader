import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import viteLogo from "../../public/vite.svg";
import reactLogo from "../assets/react.svg";

const Home = () => {
  const navigate = useNavigate();

  // let github pages support SPA
  useEffect(() => {
    const path = localStorage.getItem("path");
    if (path) {
      localStorage.removeItem("path");
      navigate(path);
    }
  }, []);

  return (
    <div className="App">
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://reactjs.org" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>文件上传</h1>
      <h3>Large-File-Uploader</h3>
      <div className="card">
        <p>· 多线程切片</p>
        <p>· 断点续传</p>
        <p>· 离线保存</p>
      </div>
      <p className="read-the-docs">Click on the Demo button and learn more</p>
      <button onClick={() => navigate("/demo")}>Demo</button>
    </div>
  );
};

export default Home;
