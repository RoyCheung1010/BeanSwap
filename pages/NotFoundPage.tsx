
import React from 'react';
import { Link } from 'react-router-dom';
import { ExclamationIcon } from '../components/Icons'; // Assuming Icons.tsx

const NotFoundPage: React.FC = () => {
  return (
    <div className="text-center py-20">
      <ExclamationIcon className="w-24 h-24 mx-auto text-red-500 mb-6" />
      <h1 className="text-6xl font-bold text-coffee-primary mb-4">404</h1>
      <p className="text-2xl text-gray-700 mb-8">Oops! Page Not Found.</p>
      <p className="text-gray-600 mb-8">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <Link
        to="/"
        className="bg-coffee-primary hover:bg-coffee-secondary text-white font-semibold py-3 px-6 rounded-md text-lg transition-colors duration-300"
      >
        Go to Homepage
      </Link>
    </div>
  );
};

export default NotFoundPage;
