import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase'; // Import auth instance
import { useAppContext } from '../../context/AppContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { showAlert } = useAppContext();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // The only thing this function needs to do is sign in.
      // AppContext will handle the rest.
      await signInWithEmailAndPassword(auth, email, password);
      
      showAlert('Login successful!', 'success');
      navigate('/'); // Redirect to home page after successful login

    } catch (error: any) {
      setError(error.message);
      showAlert(`Login failed: Please check your credentials.`, 'error');
      console.error('Login Error:', error);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-6 text-center text-coffee-primary">Login Page</h2>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-coffee-primary text-sm font-bold mb-2">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-coffee-primary text-sm font-bold mb-2">Password:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-coffee-primary hover:bg-coffee-dark text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors"
            >
              Login
            </button>
          </div>
        </form>
        <p className="text-center text-gray-500 text-xs mt-4">
          Don't have an account? <Link to="/signup" className="text-coffee-primary hover:text-coffee-dark">Sign Up</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;