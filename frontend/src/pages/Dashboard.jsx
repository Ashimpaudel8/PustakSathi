import { useState, useEffect, useRef } from "react";
import SearchBar from "../components/SearchBar";
import RecommendedList from "../components/RecommendedList";
import SingleBookDetail from "../components/SingleBookDetail";
import { useLocation, useNavigate, useNavigationType } from "react-router-dom";
import api from "../api";
import { usePageState } from "../context/PageStateContext";
import RecommendationLoader from "../components/RecommendationLoader";
import BookNotFound from "../components/BookNotFound";
import "../styles/pages/Dashboard.css"

function buildViewKey(isDiscover, singleBook, recommendations, isError, search) {
  const bookIds = recommendations.map((b) => b.book_id).join(",");
  const errorPart = isError ? `err:${search}` : "";
  return `${isDiscover ? "discover" : "search"}::${singleBook?.book_id ?? ""}::${bookIds}::${errorPart}`;
}

function Dashboard() {
  const navigate = useNavigate();
  const navigationType = useNavigationType(); // "PUSH" | "POP" | "REPLACE"
  const { usePersistedState } = usePageState();
  const [recommendations, setRecommendations] = usePersistedState("dashboard.recommendations", []);
  const [isDiscover, setIsDiscover] = usePersistedState("dashboard.isDiscover", true);
  const [singleBook, setSingleBook] = usePersistedState("dashboard.singleBook", null);
  const [search, setSearch] = usePersistedState("dashboard.searchText", "");
  const [isRecommending, setIsRecommending] = useState(null);
  const [isLoading, setIsLoading] = useState(null);
  const location = useLocation();
  const openTitle = location.state?.openTitle;
  const focusSearch = location.state?.focusSearch;
  const initialOpenTitle = useRef(openTitle);
  const loadingRef = useRef(null);
  const [isError, setIsError] = useState(false);

  const prevBookIdsRef = useRef("");


  const currentViewKeyRef = useRef(null);

  const isRestoringRef = useRef(false);

  useEffect(() => {
    if (navigationType !== "POP") return;
    const snapshot = location.state?.dashboardView;
    if (!snapshot) return;

    isRestoringRef.current = true;
    currentViewKeyRef.current = buildViewKey(
      snapshot.isDiscover,
      snapshot.singleBook,
      snapshot.recommendations,
      snapshot.isError,
      snapshot.search
    );

    setIsDiscover(snapshot.isDiscover);
    setRecommendations(snapshot.recommendations);
    setSingleBook(snapshot.singleBook);
    setSearch(snapshot.search ?? "");
    setIsError(snapshot.isError ?? false);
    setIsRecommending(false);
    setIsLoading(false);
  }, [location.key, navigationType]);

  useEffect(() => {
    if (isRecommending || isLoading) return;

    if (isRestoringRef.current) {
      isRestoringRef.current = false;
      return;
    }

    const viewKey = buildViewKey(isDiscover, singleBook, recommendations, isError, search);
    const snapshot = { isDiscover, recommendations, singleBook, search, isError };

    const isFirstSettle = currentViewKeyRef.current === null;
    const sameView = viewKey === currentViewKeyRef.current;
    const arrivedViaExplicitNav = Boolean(location.state?.openTitle);

    currentViewKeyRef.current = viewKey;

    if (isFirstSettle || sameView || arrivedViaExplicitNav) {
      navigate(location.pathname, { replace: true, state: { dashboardView: snapshot } });
    } else {
      navigate(location.pathname, { state: { dashboardView: snapshot } });
    }
  }, [recommendations, isDiscover, singleBook, isError, isRecommending, isLoading]);

  useEffect(() => {
    if (isRecommending || isLoading) return;

    const currentBookIds = recommendations.map((b) => b.book_id).join(",");
    const isNewList = currentBookIds !== prevBookIdsRef.current;
    prevBookIdsRef.current = currentBookIds;

    if (isNewList && recommendations.length > 0) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [isRecommending, isLoading, recommendations]);

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
      setIsLoading(true);
      try {
        const res = await api.get("/api/discover/");
        setRecommendations(res.data.Discover_Something_New);
      }
      catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
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
          setIsDiscover={setIsDiscover}
          setIsRecommending={setIsRecommending}
          setIsError={setIsError}
          search={search}
          setSearch={setSearch}
        />
      </div>
      <div className="dashboard-content-div">
        {singleBook &&
          <SingleBookDetail book={singleBook} setSingleBook={setSingleBook} />
        }
        {
          isDiscover ? (
            <h1>Discover Something New :</h1>
          ) : (
            <h1>Recommendations :</h1>
          )
        }
        {
          isError ? (
            <BookNotFound search={search} />
          ) : isRecommending ? (
            <div ref={loadingRef}>
              <RecommendationLoader initialLoading={true} />
            </div>
          ) : isLoading ? (
            <div>
              <RecommendationLoader />
            </div>
          ) : (
            <RecommendedList
              recommendations={recommendations}
              setRecommendations={setRecommendations}
            />
          )
        }
      </div>
    </>
  );
}

export default Dashboard;