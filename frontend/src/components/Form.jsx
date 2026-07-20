import { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { Access_Token, Refresh_Token } from "../constants";
import "../styles/components/Form.css"
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

function Form({ route, method }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate()
  const { login } = useAuth()
  const { theme } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("");
    setLoading(true);

    try {
      const res = await api.post(route, { username, password })
      if (method === "login") {
        await login(res.data);
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
    <div id="root" className={`flex centre min-h-screen root-div ${theme === "dark" ? "dark-theme" : ""}`}>
      <div className="div-container">
        <div className={loading ? "form-content loading" : "form-content"}>
          {method === "login" ?
            <h2 className="text-centre h2-auth">Welcome Back</h2> :
            <h2 className="text-centre h2-auth">Create Account</h2>
          }
          {method === "login" ?
            <p className="text-centre p-top">Login to manage your tasks</p> :
            <p className="text-centre p-top">Sign up to get started</p>
          }
          <form className="flex-column" onSubmit={handleSubmit}>
            {error && <div className="error-div">
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
              <label className="flex-column label-auth">Username</label>
              <input
                className="input-auth"
                type="text"
                disabled={loading}
                placeholder={method === "login" ?
                  "Enter your username" :
                  "Create a new username"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="password-container">
              <label className="flex-column label-auth">Password</label>
              <input
                className="input-auth"
                type={showPassword ? "text" : "password"}
                disabled={loading}
                placeholder={method === "login" ?
                  "Enter your password" :
                  "Create a new password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {password.length > 0 && (
                <button
                  type="button"
                  disabled={loading}
                  className="toggle-password"
                  onClick={() => { setShowPassword(!showPassword) }}
                >
                  {showPassword ?
                    <i className="fa-solid fa-eye"></i> :
                    <i className="fa-solid fa-eye-slash"></i>}
                </button>
              )
              }
            </div>
            {method === "login" ?
              <button type="submit" disabled={loading} className="submit-button">Login</button> :
              <button type="submit" disabled={loading} className="submit-button">Register</button>
            }
            {method === "login" ?
              <p className="text-centre p-bottom">
                Don't have an accout? <Link className="link" to={loading ? "#" : "/register"}>Register</Link>
              </p> :
              <p className="text-centre p-bottom">
                Already have an account? <Link className="link" to={loading ? "#" : "/login"}>Login</Link>
              </p>
            }
          </form>
        </div>
        {loading && (
          <div className="loading-overlay">
            <p>{method === "login" ? "Signing in..." : "Creating account..."}</p>
          </div>
        )}
      </div>
    </div>

  )
}

export default Form;