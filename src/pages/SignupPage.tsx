import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore'; // Import Firestore functions
import { auth, db } from '../firebase'; // Import auth and db instances
import { useAppContext } from '../../context/AppContext';

const SignupPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { showAlert } = useAppContext();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Clear previous errors

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      showAlert('Passwords do not match.', 'error');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Create a user profile document in Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        id: firebaseUser.uid,
        name: email.split('@')[0], // Use part of email as initial name
        email: email,
        avatarUrl: '', // Default empty avatar
        location: '', // Default empty location
        bio: '', // Default empty bio
        preferredRoasts: [], // Default empty preferred roasts
        favoriteFlavors: [], // Default empty favorite flavors
        // Add other default profile fields as needed
      });

      showAlert('Signup successful! Your profile has been created. You can now log in.', 'success');
      navigate('/login'); // Redirect to login page after successful signup
    } catch (error: any) {
      setError(error.message);
      showAlert(`Signup failed: ${error.message}`, 'error');
      console.error('Signup Error:', error);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-6 text-center text-coffee-primary">Sign Up Page</h2>
        <form onSubmit={handleSignup}>
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
          <div className="mb-4">
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
          <div className="mb-6">
            <label htmlFor="confirm-password" className="block text-coffee-primary text-sm font-bold mb-2">Confirm Password:</label>
            <input
              type="password"
              id="confirm-password"
              name="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
              Sign Up
            </button>
          </div>
        </form>
        <p className="text-center text-gray-500 text-xs mt-4">
          Already have an account? <Link to="/login" className="text-coffee-primary hover:text-coffee-dark">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage; 