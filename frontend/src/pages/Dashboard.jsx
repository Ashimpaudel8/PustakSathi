import { useState } from "react";
import SearchBar from "../components/SearchBar";
import RecommendedList from "../components/RecommendedList";
import { Link } from "react-router-dom";

function Dashboard() {
  const [recommendations, setRecommendations] = useState([]);

  return (
    <>
      <Link to="/readbooks">Read Books</Link><br/><br/>

      <SearchBar setRecommendations={setRecommendations} />
      <h1>Recommendations : </h1>
      <RecommendedList recommendations={recommendations} />
    </>
  );
}

export default Dashboard;
