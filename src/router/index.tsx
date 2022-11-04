import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Loading } from "../components";

const LazyHome = lazy(() => import("../pages/Home"));
const LazyDemo = lazy(() => import("../pages/Demo"));
const LazyApiDoc = lazy(() => import("../pages/ApiDoc"));

const Router = () => {
  return (
    <Suspense fallback={<Loading />}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<LazyHome />} />
          <Route path="/demo" element={<LazyDemo />} />
          <Route path="/api" element={<LazyApiDoc />} />
        </Routes>
      </BrowserRouter>
    </Suspense>
  );
};

export default Router;
