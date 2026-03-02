import React from "react";
import "../styles/Register.css";
import Login from "./Login";
function Register() {
    return (
        <div>
            <div className="logo">
                <h2>Welcome To <br />Library Automation System</h2>
                <p>Sign Up to your Library account</p>
            </div>
            <div className="login-container">
                <form action="/register" method="POST">
                    <label htmlFor="name">Name:</label> <input type="text" id="name" name="name" placeholder="Enter your name" required />
                    <label htmlFor="register_no">Register Number:</label> <input type="text" id="register_no" name="register_no" placeholder="Enter your register number" required />
                    <label htmlFor="email">Email :</label> <input type="email" id="email" name="email" placeholder="Enter your email" required />
                    <label htmlFor="role">Role:</label><select name="role" id="role" title="Select your role" required >
                        <option value="">Select Role</option>
                        <option value="student">Student</option>
                        <option value="faculty">Faculty</option></select>
                    <label htmlFor="password">Password:</label> <input type="password" id="password" name="password" placeholder="Enter your password" required />
                    <label htmlFor="confirm_password">Confirm Password:</label> <input type="password" id="confirm_password" name="confirm_password" placeholder="Confirm your password" required />
                    <button type="submit">Register</button>
                    <p className="error-message"></p>
                </form>
                <p style={{ textAlign: "center" }}>Already have an account? <a href="/Login">Sign In</a></p>
            </div>
        </div>
    );
}

export default Register;