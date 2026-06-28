import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function Product() {
  usePageTitle("Product");
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.hash === "#robohandmotion") {
      navigate("/robohandmotion", { replace: true });
      return;
    }

    if (location.hash === "#robotaskmanipulator") {
      navigate("/robotaskmanipulator", { replace: true });
      return;
    }

    navigate({ pathname: "/", hash: "#products" }, { replace: true });
  }, [location.hash, navigate]);

  return null;
}
