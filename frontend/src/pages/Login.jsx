import React from "react";
import "../styles/Login.css";
import Register from "./Register";
function Login() {
    return (
        <div>
            <div className="logo">
                <h2>Welcome Back</h2>
                <p>Sign in to your Library account</p>
            </div>
            <div className="login-container">
                <form action="/login" method="POST">
                    <label htmlFor="username">Email/Register no:</label> <input type="text" id="username" name="username" placeholder="✉️Enter your email/register number" required />
                    <label htmlFor="password">Password:</label> <input type="password" id="password" name="password" placeholder="🔒Enter your password" required />
                    <button type="submit">Login</button>
                    <p className="error-message"></p>
                </form>
                <p style={{ textAlign: "center" }}>Don't have an account? <a href="/Register">Sign Up</a></p>
            </div>
        </div>
    );
}

export default Login;