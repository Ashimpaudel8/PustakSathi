import { Link } from "react-router-dom";

function Home() {
    return (
        <>
            <Link to="/login">Login</Link><br/>
            <Link to="/register">Register</Link><br/>
            <Link to="/dashboard">Dashboard</Link>
        </>
    );
}

export default Home;