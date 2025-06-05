import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { User, BeanListing, Review, RoastProfile, FlavorProfile, AppAlert, Trade } from '../types';
import BeanCard from '../components/BeanCard';
import StarRating from '../components/StarRating';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { FLAVOR_PROFILES_OPTIONS, ROAST_OPTIONS } from '../constants';
import { LocationMarkerIcon, CalendarIcon, AnnotationIcon, TagIcon, PencilIcon } from '../components/Icons';
import { collection, query, where, getDocs, doc, getDoc, orderBy, updateDoc } from "firebase/firestore";
import { db } from '../src/firebase';

const ProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { currentUser, updateUserProfile, showAlert } = useAppContext();
  
  const [user, setUser] = useState<User | null>(null);
  const [userListings, setUserListings] = useState<BeanListing[]>([]);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  // Form state for editing profile
  const [editableProfile, setEditableProfile] = useState<Partial<User>>({});
  const [selectedRoasts, setSelectedRoasts] = useState<RoastProfile[]>([]);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);

  // State for review filtering
  const [reviewFilter, setReviewFilter] = useState<'all' | 'buyers' | 'sellers'>('all');

  // State for review sorting
  const [reviewSortOrder, setReviewSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  // State for listing removal confirmation
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [listingToRemoveId, setListingToRemoveId] = useState<string | null>(null);

  // Memoize filtered reviews
  const filteredReviews = useMemo(() => {
    if (!userReviews || !user) return [];

    return userReviews.filter(review => {
      if (reviewFilter === 'all') return true;
      // Ensure trade data is available for buyer/seller filtering
      if (!review.trade) return false;

      if (reviewFilter === 'buyers') {
        // Filter for reviews where the profile user (reviewee) was the buyer
        // This means the reviewer was the seller.
        // In a trade, the buyer is the requester, and the seller is the owner.
        return review.revieweeId === review.trade.requesterId && review.reviewerId === review.trade.ownerId;
      } else if (reviewFilter === 'sellers') {
        // Filter for reviews where the profile user (reviewee) was the seller
        // This means the reviewer was the buyer.
        // In a trade, the seller is the owner, and the buyer is the requester.
        return review.revieweeId === review.trade.ownerId && review.reviewerId === review.trade.requesterId;
      }
      return true; // Should not reach here
    });
  }, [userReviews, reviewFilter, user]);

  // Sorted reviews based on the selected sort order
  const sortedReviews = [...filteredReviews].sort((a, b) => {
    if (reviewSortOrder === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (reviewSortOrder === 'oldest') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (reviewSortOrder === 'highest') {
      return b.rating - a.rating;
    }
    if (reviewSortOrder === 'lowest') {
      return a.rating - b.rating;
    }
    return 0; // Default to no sorting
  });

  useEffect(() => {
    setIsLoadingProfile(true);
    setProfileError(null);
    // Fetch user profile data
    const fetchUserProfile = async () => {
      if (!userId) {
        setIsLoadingProfile(false);
        setProfileError('User ID is missing.');
        showAlert('User ID is missing.', 'error');
        return;
      }
      try {
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data() as User;
          const fetchedUser = { ...userData, id: userDocSnap.id };
          setUser(fetchedUser);
          setEditableProfile(fetchedUser);
          setSelectedRoasts(fetchedUser.preferredRoasts || []);
          setSelectedFlavors(fetchedUser.favoriteFlavors?.map(f => f.id) || []);
        } else {
          console.warn('User not found for ID:', userId);
          setUser(null);
          setEditableProfile({});
          setSelectedRoasts([]);
          setSelectedFlavors([]);
          setProfileError('User not found.');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setUser(null);
        setEditableProfile({});
        setSelectedRoasts([]);
        setSelectedFlavors([]);
        setProfileError('Failed to load user profile.');
        showAlert('Failed to load user profile.', 'error');
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchUserProfile();

    // Fetch user's listings
    const fetchUserListings = async () => {
        setIsLoadingListings(true);
        setListingsError(null);
        if (!userId) {
            setIsLoadingListings(false);
            setListingsError('User ID is missing for listings fetch.');
            return;
        }
        try {
            const listingsQuery = query(
                collection(db, 'listings'),
                where('userId', '==', userId),
                where('status', '==', 'available') // Only fetch available listings
            );
            const listingsSnapshot = await getDocs(listingsQuery);
            const userListingsData = listingsSnapshot.docs.map(doc => ({
                ...doc.data() as BeanListing,
                id: doc.id,
            }));
            setUserListings(userListingsData);
        } catch (error) {
            console.error('Error fetching user listings:', error);
            setUserListings([]);
            setListingsError('Failed to load user listings.');
            showAlert('Failed to load user listings.', 'error');
        } finally {
            setIsLoadingListings(false);
        }
    };

    fetchUserListings();

    // --- Fetch reviews for this user ---
    const fetchUserReviews = async () => {
      setIsLoadingReviews(true);
      setReviewsError(null);
      if (!userId) {
          setIsLoadingReviews(false);
          setReviewsError('User ID is missing for reviews fetch.');
          return;
      }
      try {
          const reviewsQuery = query(
              collection(db, 'reviews'),
              where('revieweeId', '==', userId),
              orderBy('createdAt', 'desc') // Order reviews by date, newest first
          );
          const reviewsSnapshot = await getDocs(reviewsQuery);
          const fetchedReviews = reviewsSnapshot.docs.map(doc => ({
              ...doc.data() as Review,
              id: doc.id,
          }));

          // --- Start: Fetch related data (Reviewer Users, Trades, and Listings) ---
          const reviewerIds = new Set<string>();
          const tradeIds = new Set<string>();
          fetchedReviews.forEach(review => {
              reviewerIds.add(review.reviewerId);
              if (review.tradeId) tradeIds.add(review.tradeId);
          });

          // Fetch Reviewer User Data
          const fetchedReviewersMap: Record<string, User> = {};
          if (reviewerIds.size > 0) {
              // Use a batched read or 'in' query if reviewerIds.size is large (up to 10 for 'in')
              // For simplicity and assuming smaller numbers, fetching individually:
              for (const reviewerId of Array.from(reviewerIds)) {
                  const userDocRef = doc(db, 'users', reviewerId);
                  const userDocSnap = await getDoc(userDocRef);
                  if (userDocSnap.exists()) {
                      fetchedReviewersMap[reviewerId] = { ...userDocSnap.data() as User, id: userDocSnap.id };
                  } else {
                      console.warn(`Reviewer user not found for ID: ${reviewerId}`);
                  }
              }
          }

          // Fetch Trade Data
          const fetchedTradesMap: Record<string, Trade> = {};
          const listingIds = new Set<string>();
          if (tradeIds.size > 0) {
               // Use a batched read or 'in' query if tradeIds.size is large
               for (const tradeId of Array.from(tradeIds)) {
                   const tradeDocRef = doc(db, 'trades', tradeId);
                   const tradeDocSnap = await getDoc(tradeDocRef);
                   if (tradeDocSnap.exists()) {
                       const tradeData = { ...tradeDocSnap.data() as Trade, id: tradeDocSnap.id };
                       fetchedTradesMap[tradeId] = tradeData;
                       // Collect listing IDs from the trade
                       if (tradeData.listingId) listingIds.add(tradeData.listingId);
                       if (tradeData.offeredListingId) listingIds.add(tradeData.offeredListingId);
                   } else {
                       console.warn(`Trade not found for ID: ${tradeId}`);
                   }
               }
           }

           // Fetch Listing Data
           const fetchedListingsMap: Record<string, BeanListing> = {};
           if (listingIds.size > 0) {
                // Use a batched read or 'in' query if listingIds.size is large
                for (const listingId of Array.from(listingIds)) {
                    const listingDocRef = doc(db, 'listings', listingId);
                    const listingDocSnap = await getDoc(listingDocRef);
                    if (listingDocSnap.exists()) {
                        fetchedListingsMap[listingId] = { ...listingDocSnap.data() as BeanListing, id: listingDocSnap.id };
                    } else {
                        console.warn(`Listing not found for ID: ${listingId}`);
                    }
                }
            }

          // --- End: Fetch related data ---

          // Combine review data with fetched reviewer user, trade, and listing data
          const userReviewsDataWithDetails = fetchedReviews.map(review => ({
              ...review,
              reviewer: fetchedReviewersMap[review.reviewerId], // Add reviewer user data
              trade: review.tradeId ? fetchedTradesMap[review.tradeId] : undefined, // Add trade data
              // Add listing data - determine which listing is relevant based on trade and reviewee
              // If the reviewee is the trade owner, the review is likely about the requested listing.
              // If the reviewee is the trade requester, the review is likely about the offered listing (if it exists).
              reviewedListing: review.tradeId ? (() => {
                const trade = fetchedTradesMap[review.tradeId];
                if (trade) {
                  const relevantListingId = review.revieweeId === trade.ownerId ? trade.listingId : trade.offeredListingId;
                  return relevantListingId ? fetchedListingsMap[relevantListingId] : undefined;
                } else {
                  return undefined; // Trade not found for this review
                }
              })() : undefined,
          }));

          setUserReviews(userReviewsDataWithDetails);
          console.log('Fetched Reviews with Details:', userReviewsDataWithDetails);

      } catch (error) {
          console.error('Error fetching user reviews:', error);
          setUserReviews([]);
          setReviewsError('Failed to load user reviews.');
          // showAlert('Failed to load user reviews.', 'error'); // Avoid too many alerts on profile page load
      } finally {
          setIsLoadingReviews(false);
      }
    };

    fetchUserReviews();

  }, [userId, showAlert]);

  const handleRoastChange = (roast: RoastProfile) => {
    setSelectedRoasts(prev => 
      prev.includes(roast) ? prev.filter(r => r !== roast) : [...prev, roast]
    );
  };

  const handleFlavorChange = (flavorId: string) => {
    setSelectedFlavors(prev =>
      prev.includes(flavorId) ? prev.filter(id => id !== flavorId) : [...prev, flavorId]
    );
  };
  
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return; // Should not happen if button is disabled

    // Combine selected roasts and flavors with other editable profile data
    const updatedProfileData: User = {
      ...currentUser,
      ...editableProfile,
      preferredRoasts: selectedRoasts,
      favoriteFlavors: selectedFlavors.map(id => FLAVOR_PROFILES_OPTIONS.find(f => f.id === id)!)
    };

    try {
      await updateUserProfile(updatedProfileData);
      setIsEditModalOpen(false); // Close modal on success
    showAlert('Profile updated successfully!', 'success');
    // Update the local user state with the new data
    setUser(updatedProfileData);
    } catch (error) {
      // Error alert is shown by AppContext
    }
  };

  // Function to open the edit profile modal, pre-filling with current user data
  const handleOpenEditModal = () => {
    if (user) {
      setEditableProfile(user);
      setSelectedRoasts(user.preferredRoasts || []);
      setSelectedFlavors(user.favoriteFlavors?.map(f => f.id) || []);
      setIsEditModalOpen(true);
    }
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    // Reset editable profile state if cancelling edit
    if (user) {
       setEditableProfile(user);
       setSelectedRoasts(user.preferredRoasts || []);
       setSelectedFlavors(user.favoriteFlavors?.map(f => f.id) || []);
    }
  };

  // Handler to initiate listing removal
  const handleRemoveListingClick = (listingId: string) => {
    setListingToRemoveId(listingId);
    setIsRemoveModalOpen(true);
  };

  // Handler to confirm and perform listing removal
  const handleConfirmRemoveListing = async () => {
    if (!listingToRemoveId) return;

    try {
      // Update the listing status in your database to 'removed'
      await updateDoc(doc(db, 'listings', listingToRemoveId), { status: 'removed' });
      
      showAlert('Listing removed successfully!', 'success');
      
      // Optimistically update the UI by filtering out the removed listing
      setUserListings(prevListings => prevListings.filter(listing => listing.id !== listingToRemoveId));

    } catch (error) {
      console.error('Error removing listing:', error);
      showAlert('Failed to remove listing.', 'error');
    } finally {
      setIsRemoveModalOpen(false);
      setListingToRemoveId(null);
    }
  };

  // Determine if the profile being viewed belongs to the current logged-in user
  const isCurrentUserProfile = currentUser?.id === userId;

  if (isLoadingProfile) return <LoadingSpinner text="Loading profile..." />;
  if (profileError) return <div className="text-center text-xl text-red-500">{profileError}</div>;
  if (isLoadingListings) return <LoadingSpinner text="Loading listings..." />;
  if (listingsError) return <div className="text-center text-xl text-red-500">{listingsError}</div>;
  if (!user) return <div className="text-center text-xl text-red-500">User data could not be loaded.</div>;

  const averageRating = userReviews.length > 0 
    ? userReviews.reduce((acc, r) => acc + r.rating, 0) / userReviews.length
    : 0;

  // Calculate review counts for each star rating
  const ratingCounts = userReviews.reduce((counts, review) => {
    counts[review.rating] = (counts[review.rating] || 0) + 1;
    return counts;
  }, {} as Record<number, number>);

  return (
    <div className="bg-white p-6 md:p-8 rounded-lg shadow-xl space-y-8">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
        <img src={user.avatarUrl} alt={user.name} className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover shadow-md border-4 border-coffee-light" />
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-bold text-coffee-primary font-['Playfair_Display']">{user.name}</h1>
          <p className="text-gray-600 flex items-center justify-center md:justify-start mt-1"><LocationMarkerIcon className="w-5 h-5 mr-1 text-coffee-secondary" />{user.location}</p>
          <div className="mt-2 flex items-center justify-center md:justify-start">
            <StarRating rating={averageRating} readOnly />
            <span className="ml-2 text-gray-600">({userReviews.length} reviews)</span>
          </div>
          {/* Detailed Rating Breakdown */}
          {userReviews.length > 0 && (
            <div className="mt-4 space-y-1">
              {[5, 4, 3, 2, 1].map(star => (
                <div key={star} className="flex items-center">
                  <span className="text-sm font-medium text-gray-700 mr-1">{star} Star</span>
                  <div className="w-40 bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mr-2">
                    <div
                      className="bg-coffee-secondary h-2.5 rounded-full"
                      style={{ width: `${((ratingCounts[star] || 0) / userReviews.length) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{ratingCounts[star] || 0}</span>
                </div>
              ))}
            </div>
          )}
          {isCurrentUserProfile && (
             <button 
                onClick={handleOpenEditModal}
                className="mt-4 inline-flex items-center bg-coffee-secondary hover:bg-coffee-primary text-white font-semibold py-2 px-4 rounded-md transition-colors duration-300"
              >
                <PencilIcon className="w-4 h-4 mr-2" /> Edit Profile
              </button>
          )}
        </div>
      </div>

      {/* Bio and Preferences */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-coffee-extralight p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-coffee-primary mb-3 flex items-center"><AnnotationIcon className="w-5 h-5 mr-2 text-coffee-secondary"/>Bio</h2>
          <p className="text-gray-700 whitespace-pre-line">{user.bio || "No bio provided."}</p>
        </div>
        <div className="bg-coffee-extralight p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-coffee-primary mb-3 flex items-center"><TagIcon className="w-5 h-5 mr-2 text-coffee-secondary"/>Coffee Preferences</h2>
          <div>
            <h3 className="font-medium text-coffee-primary mb-1">Preferred Roasts:</h3>
            {user.preferredRoasts && user.preferredRoasts.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {user.preferredRoasts.map(roast => (
                  <span key={roast} className="bg-coffee-light text-coffee-primary px-3 py-1 rounded-full text-sm">{roast}</span>
                ))}
              </div>
            ) : <p className="text-gray-600 text-sm">No roast preferences set.</p>}
          </div>
          <div className="mt-3">
            <h3 className="font-medium text-coffee-primary mb-1">Favorite Flavors:</h3>
            {user.favoriteFlavors && user.favoriteFlavors.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {user.favoriteFlavors.map(flavor => (
                  <span key={flavor.id} className="bg-coffee-light text-coffee-primary px-3 py-1 rounded-full text-sm">{flavor.name}</span>
                ))}
              </div>
            ) : <p className="text-gray-600 text-sm">No flavor preferences set.</p>}
          </div>
        </div>
      </div>

      {/* User's Listings */}
      <div>
        <h2 className="text-2xl font-semibold text-coffee-primary mb-4 font-['Playfair_Display']">Beans Listed by {user.name}</h2>
        {isLoadingListings ? (
            <LoadingSpinner text="Loading listings..." />
        ) : listingsError ? (
            <div className="text-center text-xl text-red-500">{listingsError}</div>
        ) : userListings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userListings.map(listing => (
              <BeanCard key={listing.id} listing={listing} lister={user} onRemoveClick={isCurrentUserProfile ? handleRemoveListingClick : undefined} />
            ))}
          </div>
        ) : (
          <p className="text-gray-600">{user.name} has no active listings.</p>
        )}
      </div>

      {/* Reviews Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold text-coffee-primary mb-4 font-['Playfair_Display']">Reviews {user?.name ? `for ${user.name}` : ''}</h2>

        {/* Review Filter Buttons */}
        <div className="flex space-x-4 mb-4">
            <button
                onClick={() => setReviewFilter('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${reviewFilter === 'all' ? 'bg-coffee-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
                All Reviews
            </button>
            <button
                onClick={() => setReviewFilter('sellers')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${reviewFilter === 'sellers' ? 'bg-coffee-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
                As Seller
            </button>
            <button
                onClick={() => setReviewFilter('buyers')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${reviewFilter === 'buyers' ? 'bg-coffee-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
                As Buyer
            </button>
        </div>

        {/* Review Sort Dropdown */}
        {filteredReviews.length > 0 && (
          <div className="flex items-center space-x-2 mb-4">
            <label htmlFor="reviewSort" className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              id="reviewSort"
              className="block appearance-none w-auto bg-gray-200 border border-gray-200 text-gray-700 py-2 px-3 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500 text-sm"
              value={reviewSortOrder}
              onChange={(e) => setReviewSortOrder(e.target.value as 'newest' | 'oldest' | 'highest' | 'lowest')}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Rating</option>
              <option value="lowest">Lowest Rating</option>
            </select>
            {/* Add a custom arrow icon if needed for styling */}
          </div>
        )}

        {isLoadingReviews ? (
          <LoadingSpinner text="Loading reviews..." />
        ) : reviewsError ? (
          <div className="text-center text-red-500">{reviewsError}</div>
        ) : userReviews.length === 0 ? (
          <p className="text-gray-600">No reviews yet.</p>
        ) : (
          <div className="space-y-6">
              {sortedReviews.map(review => (
                  <div key={review.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                      <div className="flex items-center mb-2">
                          <StarRating rating={review.rating} readOnly size="w-5 h-5" /> {/* Adjust size as needed */}
                      </div>
                      <p className="text-gray-700 italic">"{review.comment || 'No comment provided.'}"</p>
                      {/* Display Reviewed Listing */}
                      {review.reviewedListing && (
                          <p className="text-gray-600 text-sm mt-1">
                              Reviewed listing: <Link to={`/listings/${review.reviewedListing.id}`} className="text-coffee-primary hover:underline font-medium">{review.reviewedListing.name}</Link>
                          </p>
                      )}
                      <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
                        {/* Display reviewer name, linking to their profile if reviewer data exists */}
                        {review.reviewer ? (
                            <Link to={`/profile/${review.reviewer.id}`} className="text-coffee-primary hover:underline font-semibold">
                                - {review.reviewer.name}
                            </Link>
                        ) : (
                            <span className="font-semibold">- [Unknown Reviewer]</span>
                        )}
                        {/* Display review date */}
                        <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                      </div>
                      {/* Display Tags */}
                      {review.tags && review.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                              {review.tags.map(tag => (
                                  <span key={tag} className="bg-coffee-light text-coffee-primary px-2 py-0.5 rounded-full text-xs font-medium">
                                      {tag}
                                  </span>
                              ))}
                          </div>
                      )}
                  </div>
              ))}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      <Modal isOpen={isEditModalOpen} onClose={handleCloseEditModal} title="Edit Profile">
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
            <input type="text" name="name" id="name" defaultValue={editableProfile.name} onChange={(e) => setEditableProfile({...editableProfile, name: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-coffee-primary focus:border-coffee-primary sm:text-sm" />
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
            <input type="text" name="location" id="location" defaultValue={editableProfile.location} onChange={(e) => setEditableProfile({...editableProfile, location: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-coffee-primary focus:border-coffee-primary sm:text-sm" />
          </div>
          <div>
            <label htmlFor="avatarUrl" className="block text-sm font-medium text-gray-700">Avatar URL</label>
            <input type="url" name="avatarUrl" id="avatarUrl" defaultValue={editableProfile.avatarUrl} onChange={(e) => setEditableProfile({...editableProfile, avatarUrl: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-coffee-primary focus:border-coffee-primary sm:text-sm" />
          </div>
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700">Bio</label>
            <textarea name="bio" id="bio" rows={3} defaultValue={editableProfile.bio} onChange={(e) => setEditableProfile({...editableProfile, bio: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-coffee-primary focus:border-coffee-primary sm:text-sm"></textarea>
          </div>
          
          <div>
            <span className="block text-sm font-medium text-gray-700">Preferred Roasts</span>
            <div className="mt-2 space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-x-4 sm:gap-y-2">
              {ROAST_OPTIONS.map(roast => (
                <label key={roast} className="inline-flex items-center">
                  <input 
                    type="checkbox" 
                    className="form-checkbox h-4 w-4 text-coffee-primary rounded border-gray-300 focus:ring-coffee-secondary"
                    checked={selectedRoasts.includes(roast)}
                    onChange={() => handleRoastChange(roast)}
                  />
                  <span className="ml-2 text-gray-700">{roast}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700">Favorite Flavors</span>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FLAVOR_PROFILES_OPTIONS.map(flavor => (
                <label key={flavor.id} className="inline-flex items-center">
                  <input 
                    type="checkbox" 
                    className="form-checkbox h-4 w-4 text-coffee-primary rounded border-gray-300 focus:ring-coffee-secondary"
                    checked={selectedFlavors.includes(flavor.id)}
                    onChange={() => handleFlavorChange(flavor.id)}
                  />
                  <span className="ml-2 text-gray-700">{flavor.name}</span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="w-full bg-coffee-primary hover:bg-coffee-secondary text-white font-semibold py-2 px-4 rounded-md transition-colors duration-300">Save Changes</button>
        </form>
      </Modal>

      {/* Remove Listing Confirmation Modal */}
      <Modal isOpen={isRemoveModalOpen} onClose={() => setIsRemoveModalOpen(false)} title="Confirm Listing Removal">
          <p className="text-gray-700 mb-4">Are you sure you want to remove this listing? This action cannot be undone.</p>
          <div className="flex justify-end space-x-3">
              <button onClick={() => setIsRemoveModalOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors">Cancel</button>
              <button 
                  onClick={handleConfirmRemoveListing}
                  className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                  Remove
              </button>
          </div>
      </Modal>
    </div>
  );
};

export default ProfilePage;
