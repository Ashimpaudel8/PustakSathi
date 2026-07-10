import { useState } from "react";
import SearchBar from "../components/SearchBar";
import RecommendedList from "../components/RecommendedList";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";

function Dashboard({ setRecommendations, recommendations }) {
  const location = useLocation();
  const focusSearch = location.state?.focusSearch;

  return (
    <>
      <SearchBar
        setRecommendations={setRecommendations}
        focusSearch={focusSearch}
      />
      <h1>Recommendations : </h1>
      <RecommendedList
        recommendations={recommendations}
        setRecommendations={setRecommendations}
      />
    </>
  );
}

export default Dashboard;
