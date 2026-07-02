import { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { Access_Token, Refresh_Token } from "../constants";

function Form({ route, method}) {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const name = method === "login" ? "Login" : "Register"

    const handleSubmit = async (e) => {
        setLoading(true)
        e.preventDefault()

        try {
            const res = await api.post(route, { username , password })
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
            console.log(error)
        }
        finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <h1>{name}</h1>
            <input 
                type="text" 
                placeholder="Username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)} 
            />
            <input 
                type="text" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)} 
            />
            <button type="submit">{name}</button>
        </form>
    )
}

export default Form;