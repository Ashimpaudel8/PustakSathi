import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

function ScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const prevPathnameRef = useRef(location.pathname);

  useEffect(() => {
    const pathChanged = prevPathnameRef.current !== location.pathname;
    prevPathnameRef.current = location.pathname;

    if (!pathChanged) return;

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: navigationType === "POP" ? "auto" : "smooth",
    });
  }, [location.pathname, location.key, navigationType]);

  return null;
}

export default ScrollRestoration;