import { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { Access_Token, Refresh_Token } from "../constants";
import "../styles/components/AuthForm.css"
import { Link } from "react-router-dom";

function Form({ route, method }) {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await api.post(route, { username, password })
            if (method === "login") {
                localStorage.setItem(Access_Token, res.data.access);
                localStorage.setItem(Refresh_Token, res.data.refresh);
                navigate("/dashboard");

            }
            else {
                navigate("/login")
            }
        }
        catch (error) {
            console.error(error.response.data);
            setError(error.response.data)
        }
        finally {
            setLoading(false)
        }
    }

    return (
        <div id="root" className="flex centre min-h-screen root-div">
            <div className="div-container">
                {method === "login" ?
                    <h2 className="text-centre">Welcome Back</h2> :
                    <h2 className="text-centre">Create Account</h2>
                }
                {method === "login" ?
                    <p className="text-centre p-top">Login to manage your tasks</p> :
                    <p className="text-centre p-top">Sign up to get started</p>
                }
                <form className="flex-column" onSubmit={handleSubmit}>
                    {error &&<div className="error-div">
                        <div>
                            {error.detail && <p>{`Error: ${error.detail}`}</p>}
                        </div>
                        <div>
                            {error.username && <p>{`Username Error: ${error.username}`}</p>}
                        </div>
                        <div>
                            {error.password && <p>{`Password Error: ${error.password}`}</p>}
                        </div>
                    </div>}
                    <div>
                        <label className="flex-column">Username</label>
                        <input
                            type="text"
                            placeholder={method === "login" ? "Enter your username" : "Create a new username"}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="flex-column">Password</label>
                        <input
                            type="Enter your password"
                            placeholder={method === "login" ? "Enter your password" : "Create a new password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    {method === "login" ?
                        <button type="submit" className="submit-button">Login</button> :
                        <button type="submit" className="submit-button">Register</button>
                    }
                    {method === "login" ?
                        <p className="text-centre p-bottom">
                            Don't have an accout? <Link className="link" to="/register">Register</Link>
                        </p> :
                        <p className="text-centre p-bottom">
                            Already have an account? <Link className="link" to="/login">Login</Link>
                        </p>
                    }
                </form>
            </div>
        </div>

    )
}

export default Form;