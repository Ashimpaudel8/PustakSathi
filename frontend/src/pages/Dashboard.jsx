import { useState, useEffect, useRef } from "react";
import SearchBar from "../components/SearchBar";
import RecommendedList from "../components/RecommendedList";
import SingleBookDetail from "../components/SingleBookDetail";
import { Link } from "react-router-dom";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api";
import { usePageState } from "../context/PageStateContext";
import RecommendationLoader from "../components/RecommendationLoader";
import "../styles/pages/Dashboard.css"

function Dashboard() {
  const navigate = useNavigate();
  const { usePersistedState } = usePageState();
  const [recommendations, setRecommendations] = usePersistedState("dashboard.recommendations", []);
  const [isDiscover, setIsDiscover] = usePersistedState("dashboard.isDiscover", true);
  const [singleBook, setSingleBook] = usePersistedState("dashboard.singleBook", null);
  const [isRecommending, setIsRecommending] = useState(null);
  const location = useLocation();
  const openTitle = location.state?.openTitle;
  const focusSearch = location.state?.focusSearch;
  const initialOpenTitle = useRef(openTitle);
  const loadingRef = useRef(null);

  useEffect(() => {
    if (isRecommending && loadingRef.current) {
      loadingRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [isRecommending]);

  useEffect(() => {
    if (initialOpenTitle.current) return;
    if (recommendations.length > 0) return;

    const fetchBook = async () => {
      const res = await api.get("/api/discover/");
      setRecommendations(res.data.Discover_Something_New);
    };

    fetchBook();
  }, [])

  useEffect(() => {
    if (!openTitle) return;

    const fetchBook = async () => {
      setIsRecommending(true);

      try {
        const res = await api.get("/api/books/recommend/", {
          params: {
            q: openTitle,
          },
        });

        setIsDiscover(false);
        setRecommendations(res.data.Recommendations);
        setSingleBook(res.data.single_book_detail);
        navigate(location.pathname, { replace: true, state: {} });
      } catch (err) {
        console.error(err);
      } finally {
        setIsRecommending(false);
      }
    };

    fetchBook();
  }, [openTitle]);

  return (
    <>
      <div className="search-container">
        <SearchBar
          setRecommendations={setRecommendations}
          setSingleBook={setSingleBook}
          focusSearch={focusSearch}
          setIsDiscover={setIsDiscover}
          setIsRecommending={setIsRecommending}
        />
      </div>
      <div className="dashboard-content-div">
        {singleBook &&
          <SingleBookDetail book={singleBook} />
        }
        {
          isDiscover ? (
            <h1>Discover Something New :</h1>
          ) : (
            <h1>Recommendations :</h1>
          )
        }
        {isRecommending ?
          <div ref={loadingRef}>
            <RecommendationLoader />
          </div>
          : <RecommendedList
            recommendations={recommendations}
            setRecommendations={setRecommendations}
          />}
      </div>
    </>
  );
}

export default Dashboard;