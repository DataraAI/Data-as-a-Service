import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import ExploreDatasets from "./pages/ExploreDatasets";
import Home from "./pages/Home";
import Product from "./pages/Product";
import DataViewer from "./pages/DataViewer";
import RoboEyeView from "./pages/RoboEyeView";
import RoboHandMotion from "./pages/RoboHandMotion";
import RoboTaskManipulator from "./pages/RoboTaskManipulator";
import AuthPage from "./pages/AuthPage";
import AdminUsers from "./pages/AdminUsers";
import Company from "./pages/Company";
import { Toaster } from "./components/ui/sonner";

function RouteScrollManager() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.hash]);

  return null;
}

const App = () => (
  <BrowserRouter>
    <>
      <RouteScrollManager />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/company" element={<Company />} />
        <Route path="/product" element={<Product />} />
        <Route path="/robohandmotion" element={<RoboHandMotion />} />
        <Route path="/robotaskmanipulator" element={<RoboTaskManipulator />} />
        <Route path="/explore" element={<ExploreDatasets />} />
        <Route path="/roboannotator" element={<RoboEyeView />} />
        <Route path="/roboeyeview" element={<RoboEyeView />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/robodatahub/*" element={<DataViewer />} />
        <Route path="/viewer/*" element={<DataViewer />} />
      </Routes>
      <Toaster richColors />
    </>
  </BrowserRouter>
);

export default App;
