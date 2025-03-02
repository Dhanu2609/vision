import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./login.css";

const allowedEmails = ["dhanushreeramessh@gmail.com", "gokulravi2609@gmail.com"];

const Login = () => {
  const { googleLogin, loginWithEmail, registerWithEmail, resetPassword, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!allowedEmails.includes(email)) {
      setError("Login failed");
      return;
    }

    try {
      if (isRegister) {
        await registerWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
        if (rememberMe) {
          localStorage.setItem("rememberedEmail", email);
        } else {
          localStorage.removeItem("rememberedEmail");
        }
      }
      navigate("/"); // Navigate to chat only if email is allowed
    } catch (err) {
      setError(err.message || "Authentication failed.");
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    try {
      const userCredential = await googleLogin();
      const googleUserEmail = userCredential.user.email;

      if (!allowedEmails.includes(googleUserEmail)) {
        setError("Login Failed.");
        return;
      }

      navigate("/");
    } catch (err) {
      setError("Google login failed. Please try again.");
    }
  };

  const handleResetPassword = async () => {
    setError("");
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err) {
      setError("Failed to send password reset email.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-200">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-4">
          {isRegister ? "Create an Account" : "Welcome Back"}
        </h2>

        {user && (
          <div className="flex flex-col items-center mb-4">
            <img src={user.photoURL} alt="User" className="w-20 h-20 rounded-full shadow-md" />
            <p className="text-lg font-semibold">{user.displayName}</p>
          </div>
        )}

        {error && <p className="text-red-500 text-sm text-center mb-3">{error}</p>}
        {resetSent && <p className="text-green-500 text-sm text-center mb-3">Password reset email sent.</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder="Email" className="w-full p-3 border rounded" value={email} onChange={(e) => setEmail(e.target.value)} required /><br/>
          <input type="password" placeholder="Password" className="w-full p-3 border rounded" value={password} onChange={(e) => setPassword(e.target.value)} required />

          {!isRegister && (
            <div className="flex items-center">
              <input type="checkbox" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} className="mr-2" />
              <label className="text-gray-600 text-sm">Remember Me</label>
            </div>
          )}

          <button type="submit" className="w-full bg-blue-500 text-white py-3 rounded hover:bg-blue-600 transition">
            {isRegister ? "Sign Up" : "Login"}
          </button>
        </form>

        {!isRegister && (
          <button onClick={handleResetPassword} className="text-sm text-blue-500 hover:underline block text-center mt-3">
            Forgot Password?
          </button>
        )}

        <p className="text-center mt-4">
          {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <button onClick={() => setIsRegister(!isRegister)} className="text-blue-500 hover:underline">
            {isRegister ? "Login" : "Sign Up"}
          </button>
        </p>

        

       
      </div>
    </div>
  );
};

export default Login;
