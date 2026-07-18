import { useEffect, useState } from "react";
import "../styles/components/RecommendationLoader.css";

function RecommendationLoader() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  let message = "sth1";

  if (seconds < 5) {
    message = "Getting your taste...";
  } else if (seconds < 10) {
    message = "Tasting your taste...";
  } else if (seconds < 20) {
    message = "Analyzing book preferences...";
  } else if (seconds < 30) {
    message = "Comparing similar books...(I like your taste)";
  } else {
    message = "Almost done, preparing recommendations...";
  }

  return (
    <div className="recommendation-loader">
      <div className="spinner"></div>
      <h3>Recommending books ...</h3>
      <p>{message}</p>
      <p>{seconds}</p>
    </div>
  );
}

export default RecommendationLoader;