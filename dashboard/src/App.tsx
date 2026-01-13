import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import DataViewer from "./pages/DataViewer";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/viewer" element={<DataViewer />} />
    </Routes>
  </BrowserRouter>
);

export default App;
