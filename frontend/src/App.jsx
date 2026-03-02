import React from "react";
import {BrowserRouter,Routes,Route} from "react-router-dom";
import ReactDOM from "react-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
function App() {
    return(
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/Login" element={<Login />} />
                <Route path="/Register" element={<Register />} />
            </Routes>
        </BrowserRouter>
    );
}
export default App;