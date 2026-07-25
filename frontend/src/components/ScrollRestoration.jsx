import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// Scrolls to the top of the page on every navigation. Browser Back/Forward
// (POP) snaps instantly to the top; normal in-app navigation
function ScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: navigationType === "POP" ? "auto" : "smooth",
    });
  }, [location.key, navigationType]);

  return null;
}

export default ScrollRestoration;