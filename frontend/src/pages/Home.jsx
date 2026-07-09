import { Link } from "react-router-dom";

function Home() {
    return (
        <>
            <Link to="/login">Login</Link><br/><br/>
            <Link to="/register">Register</Link><br/><br/>
            <Link to="/dashboard">Dashboard</Link><br/><br/>
            <Link to="/readbooks">Read Books</Link><br/><br/>
            <Link to="/wishlist">Wishlists</Link><br/><br/>
        </>
    );
}

export default Home;