import { BrowserRouter, Route, Routes } from "react-router-dom";
import ExploreDatasets from "./pages/ExploreDatasets";
import Home from "./pages/Home";
import Product from "./pages/Product";
import DataViewer from "./pages/DataViewer";
import RoboEyeView from "./pages/RoboEyeView";
import AuthPage from "./pages/AuthPage";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/product" element={<Product />} />
      <Route path="/explore" element={<ExploreDatasets />} />
      <Route path="/roboeyeview" element={<RoboEyeView />} />
      <Route path="/viewer/*" element={<DataViewer />} />
    </Routes>
  </BrowserRouter>
);

export default App;
