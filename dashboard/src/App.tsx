import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import DataViewer from "./pages/DataViewer";
import ExploreDatasets from "./pages/ExploreDatasets";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/explore" element={<ExploreDatasets />} />
      <Route path="/viewer/*" element={<DataViewer />} />
    </Routes>
  </BrowserRouter>
);

export default App;
