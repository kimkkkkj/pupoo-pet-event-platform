import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function MypageQr() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    navigate(`/registration/qrcheckin${location.search || ""}`, {
      replace: true,
    });
  }, [location.search, navigate]);

  return null;
}
