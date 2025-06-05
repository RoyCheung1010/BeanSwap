import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import BeanCard from '../components/BeanCard';
import { CoffeeIcon, LocationMarkerIcon, TagIcon, UserCircleIcon, SparklesIcon } from '../components/Icons';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from "firebase/firestore";
import { db } from '../src/firebase';
import { BeanListing, User } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNavigate } from 'react-router-dom';

// Import a suitable background image - replace with your actual image path
import heroBackground from '../src/assests/HomePage_bg.jpg'; // Importing the new background image - corrected path

const HomePage: React.FC = () => {
  const { currentUser, showAlert } = useAppContext();
  const [recentListings, setRecentListings] = useState<BeanListing[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for filters
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>([]);
  const [selectedRoasts, setSelectedRoasts] = useState<string[]>([]);
  // We'll add more filter states later

  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecentListingsAndUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // 1. Fetch a limited number of the most recent available listings
        const listingsQuery = query(
          collection(db, 'listings'),
          where('status', '==', 'available'),
          orderBy('createdAt', 'desc'),
          limit(3) // Limit to the top 3 recent listings
        );
        const listingsSnapshot = await getDocs(listingsQuery);
        const fetchedListings = listingsSnapshot.docs.map(doc => ({
          ...doc.data() as BeanListing,
          id: doc.id,
        }));
        setRecentListings(fetchedListings);

        // 2. Extract unique user IDs
        const uniqueUserIds = Array.from(new Set(fetchedListings.map(listing => listing.userId)));

        // 3. Fetch user documents for these IDs
        const fetchedUsersMap: Record<string, User> = {};
        if (uniqueUserIds.length > 0) {
            for (const userId of uniqueUserIds) {
                const userDocRef = doc(db, 'users', userId);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    fetchedUsersMap[userId] = { ...userDocSnap.data() as User, id: userDocSnap.id };
                } else {
                    console.warn(`User not found for ID: ${userId}`);
                }
            }
        }
        setUsersMap(fetchedUsersMap);

      } catch (err: any) {
        console.error('Error fetching recent listings or users:', err);
        setError('Failed to load recent listings.');
        showAlert('Failed to load recent listings.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentListingsAndUsers();
  }, [showAlert]); // Depend on showAlert

  if (isLoading) return <LoadingSpinner text="Loading recent beans..." />;
  if (error) return <div className="text-center text-xl text-red-500">{error}</div>;

  return (
    <div className="space-y-12">
      <section 
        className="text-center py-24 bg-cover bg-center rounded-lg shadow-md relative overflow-hidden"
        style={{ backgroundImage: `url(${heroBackground})` }}
      >
        {/* Optional: Add an overlay for better text readability */}
        <div className="absolute inset-0 bg-black opacity-40"></div>
        
        {/* Content Wrapper to ensure text is above overlay */}
        <div className="relative z-10">
          {/* <CoffeeIcon className="w-24 h-24 mx-auto text-white mb-6 drop-shadow-lg" /> */}
          {/* Decided to remove the icon for a cleaner look, similar to the example */}
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 font-['Playfair_Display'] drop-shadow-lg">Swap your beans, share your passion</h1>
          <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-3xl mx-auto drop-shadow-lg">
            Join a global community of coffee enthusiasts. Trade or gift your unique coffee beans and discover new flavors from around the world.
        </p>
        <div className="space-x-4">
          <Link
            to="/listings"
              className="bg-coffee-primary hover:bg-coffee-secondary text-white font-semibold py-3 px-8 rounded-md text-lg transition-colors duration-300 shadow-lg"
          >
            Browse Beans
          </Link>
          {currentUser ? (
            <Link
              to="/add-listing"
                className="bg-coffee-accent hover:bg-green-600 text-white font-semibold py-3 px-8 rounded-md text-lg transition-colors duration-300 shadow-lg"
            >
              Share Your Beans
            </Link>
          ) : (
             <Link
                to="/signup" // Link to signup/login for non-users
                className="bg-coffee-accent hover:bg-green-600 text-white font-semibold py-3 px-8 rounded-md text-lg transition-colors duration-300 shadow-lg"
            >
                Join the community
            </Link>
          )}
        </div>
        </div> {/* End Content Wrapper */}
      </section> {/* End Hero Section */}

      {recentListings.length > 0 && (
        <section>
          <h2 className="text-3xl font-semibold text-coffee-primary mb-6 text-center font-['Playfair_Display']">Freshly Listed Beans</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {recentListings.map(listing => {
              const lister = usersMap[listing.userId];
              return <BeanCard key={listing.id} listing={listing} lister={lister} />;
            })}
          </div>
        </section>
      )}

      <section className="py-12 bg-white rounded-lg shadow-md">
        <h2 className="text-3xl font-semibold text-coffee-primary mb-8 text-center font-['Playfair_Display']">How BeanSwap Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="p-6">
            <div className="bg-coffee-light text-coffee-primary rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">1</div>
            <h3 className="text-xl font-semibold text-coffee-primary mb-2">Create Your Profile</h3>
            <p className="text-gray-600">Share your coffee preferences and what you're looking for.</p>
          </div>
          <div className="p-6">
             <div className="bg-coffee-light text-coffee-primary rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">2</div>
            <h3 className="text-xl font-semibold text-coffee-primary mb-2">List Your Beans</h3>
            <p className="text-gray-600">Offer your extra beans for trade or as a gift to the community.</p>
          </div>
          <div className="p-6">
             <div className="bg-coffee-light text-coffee-primary rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">3</div>
            <h3 className="text-xl font-semibold text-coffee-primary mb-2">Swap & Discover</h3>
            <p className="text-gray-600">Connect with fellow coffee lovers and try new flavors.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
