import { useState } from "react";
import SearchBar from "../components/SearchBar";
import RecommendedList from "../components/RecommendedList";
import { Link } from "react-router-dom";

function Dashboard( {setRecommendations, recommendations} ) {

  return (
    <>
      <Link to="/readbooks">Read Books</Link>
      <br />
      <br />
      <Link to="/wishlist">Wishlist</Link>
      <br />
      <br />

      <SearchBar setRecommendations={setRecommendations} />
      <h1>Recommendations : </h1>
      <RecommendedList
        recommendations={recommendations}
        setRecommendations={setRecommendations}
      />
    </>
  );
}

export default Dashboard;
