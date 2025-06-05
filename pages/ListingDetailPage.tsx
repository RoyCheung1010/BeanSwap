import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { BeanListing, User, Review as ReviewType, Trade, MessageThread } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import StarRating from '../components/StarRating';
import Modal from '../components/Modal';
import { DEFAULT_BEAN_IMAGE } from '../constants';
import { CalendarIcon, LocationMarkerIcon, MailIcon, TagIcon, UserCircleIcon, ChatAltIcon, CubeIcon, GiftIcon, CheckCircleIcon, PencilIcon } from '../components/Icons';
import { doc, getDoc, collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from '../src/firebase';
import TradeMessageModal from '../components/TradeMessageModal';

const ListingDetailPage: React.FC = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const { currentUser, addReview, addTrade, showAlert } = useAppContext();
  const navigate = useNavigate();

  const [listing, setListing] = useState<BeanListing | null>(null);
  const [lister, setLister] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userListings, setUserListings] = useState<BeanListing[]>([]);
  const [isLoadingUserListings, setIsLoadingUserListings] = useState(false);
  
  // State for image gallery
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [selectedOfferedListingId, setSelectedOfferedListingId] = useState<
    string | undefined
  >(undefined);

  // State for messaging modal
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [selectedMessageThread, setSelectedMessageThread] = useState<MessageThread | null>(null);

  useEffect(() => {
    setIsLoading(true);
    if (listingId) {
      const fetchListing = async () => {
        try {
          const listingDocRef = doc(db, 'listings', listingId);
          const listingDocSnap = await getDoc(listingDocRef);

          if (listingDocSnap.exists()) {
            const listingData = listingDocSnap.data() as BeanListing;
            setListing({ ...listingData, id: listingDocSnap.id }); // Include Firestore document ID

            // Fetch lister data
            const listerDocRef = doc(db, 'users', listingData.userId);
            const listerDocSnap = await getDoc(listerDocRef);

            if (listerDocSnap.exists()) {
              const listerData = listerDocSnap.data() as User;
              setLister({ ...listerData, id: listerDocSnap.id }); // Include Firestore document ID
            } else {
              console.warn('Lister not found for listing:', listingId);
              setLister(null); // Or set a default placeholder user
            }
          } else {
            console.warn('Listing not found with ID:', listingId);
            setListing(null);
          }
        } catch (error) {
          console.error('Error fetching listing or lister:', error);
          showAlert('Failed to load listing details.', 'error');
          setListing(null);
          setLister(null);
        } finally {
          setIsLoading(false);
        }
      };

      fetchListing();
    }
  }, [listingId, showAlert]); // Depend only on listingId and showAlert

  // Fetch current user's listings when currentUser changes or modal opens
  useEffect(() => {
    const fetchUserListings = async () => {
      if (!currentUser || !isTradeModalOpen) {
        setUserListings([]);
        return;
      }
      setIsLoadingUserListings(true);
      try {
        const listingsQuery = query(
          collection(db, 'listings'),
          where('userId', '==', currentUser.id),
          where('status', '==', 'available')
        );
        const querySnapshot = await getDocs(listingsQuery);
        const userListingsData = querySnapshot.docs.map((doc) => ({
          ...(doc.data() as BeanListing),
          id: doc.id,
        }));
        setUserListings(userListingsData);
        // Set default selected listing if available
        if (userListingsData.length > 0) {
            setSelectedOfferedListingId(userListingsData[0].id);
        } else {
            setSelectedOfferedListingId(undefined);
        }
      } catch (error) {
        console.error('Error fetching user listings for trade modal:', error);
        setUserListings([]);
        showAlert('Failed to load your listings.', 'error');
      } finally {
        setIsLoadingUserListings(false);
      }
    };

    fetchUserListings();
  }, [currentUser, isTradeModalOpen, showAlert]); // Depend on currentUser and modal state

  // Reset selected offered listing when modal closes
  useEffect(() => {
    if (!isTradeModalOpen) {
      setSelectedOfferedListingId(undefined);
    }
  }, [isTradeModalOpen]);

  const handleRequestTrade = () => {
    if (!currentUser || !listing) {
      showAlert('Please log in to make a request.', 'error');
      return;
    }
    if (currentUser.id === listing.userId) {
      showAlert("You can't trade your own listing.", 'info');
      return;
    }
    // For trade requests, ensure a listing is selected
    if (listing.tradeOrGiveaway === 'trade' && !selectedOfferedListingId) {
        showAlert('Please select a bean to offer in trade.', 'info');
        return;
    }

    addTrade({
      listingId: listing.id,
      requesterId: currentUser.id,
      ownerId: listing.userId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      offeredListingId: selectedOfferedListingId, // Include the selected offered listing ID
    });
    showAlert(`Request for "${listing.name}" sent to ${lister?.name || 'the listing owner'}!`, 'success');
    setIsTradeModalOpen(false);
  };
  
  const handleLeaveReview = () => {
    if(!currentUser || !lister || !listing) {
        showAlert('Cannot leave review.', 'error');
        return;
    }
    if(reviewRating === 0) { // Allow submitting review without a comment
        showAlert('Please provide a rating.', 'info');
        return;
    }
    addReview({
        reviewerId: currentUser.id,
        revieweeId: lister.id,
        listingId: listing.id,
        rating: reviewRating,
        comment: reviewComment,
    });
    showAlert('Review submitted! (Mock)', 'success');
    setIsReviewModalOpen(false);
    setReviewRating(0);
    setReviewComment('');
  };
  
  const handleOpenMessageModal = async () => {
    if (!currentUser || !lister || !listing) {
      showAlert('You must be logged in to message the lister.', 'error');
      return;
    }

    // Check if an existing trade exists between currentUser and lister for this listing
    try {
      const messageThreadsRef = collection(db, 'listing_message_threads'); // New collection
      
      // Query for a message thread involving these two users and this listing
      const query1 = query(
        messageThreadsRef,
        where('listingId', '==', listing.id),
        where('user1Id', '==', currentUser.id),
        where('user2Id', '==', lister.id)
      );
      
      const query2 = query(
        messageThreadsRef,
        where('listingId', '==', listing.id),
        where('user1Id', '==', lister.id),
        where('user2Id', '==', currentUser.id)
      );

      // Execute both queries to find the thread regardless of which user is user1/user2
      const [snapshot1, snapshot2] = await Promise.all([
        getDocs(query1),
        getDocs(query2)
      ]);

      console.log('Query 1 snapshot empty:', snapshot1.empty);
      console.log('Query 2 snapshot empty:', snapshot2.empty);
      
      let threadDocSnap = null;

      if (!snapshot1.empty) {
        threadDocSnap = snapshot1.docs[0];
         console.log('Found existing message thread:', threadDocSnap.id);
       } else if (!snapshot2.empty) {
         threadDocSnap = snapshot2.docs[0];
          console.log('Found existing message thread:', threadDocSnap.id);
       }

       let messageThreadDataFromFirestore;

       if (threadDocSnap) {
           // If an existing thread was found, use its data
            messageThreadDataFromFirestore = { ...threadDocSnap.data() as MessageThread, id: threadDocSnap.id };
       } else {
         // No existing thread, create a new one
         console.log('No existing message thread found. Creating a new one.');
         const newMessageThreadData = {
           listingId: listing.id,
           user1Id: currentUser.id, // Store user IDs
           user2Id: lister.id,
           createdAt: new Date().toISOString(),
           // Add any other relevant fields, e.g., latestMessageTimestamp
         };
         const docRef = await addDoc(messageThreadsRef, newMessageThreadData);
         messageThreadDataFromFirestore = { ...newMessageThreadData, id: docRef.id };
         console.log('Created new message thread:', messageThreadDataFromFirestore.id);
         // Optionally show an alert that a message thread has been started
         // showAlert('Messaging thread started.', 'info');
       }

      // Now open the message modal with the thread ID and the other user's info
      if (messageThreadDataFromFirestore) {
        // Construct the MessageThread object to pass to the modal
        const messageThread: MessageThread = {
            id: messageThreadDataFromFirestore.id,
            type: 'listing_inquiry', // This will always be a listing inquiry from this button
            listingId: messageThreadDataFromFirestore.listingId as string, // Cast as string, assuming it's always present
            user1Id: messageThreadDataFromFirestore.user1Id as string, // Cast as string, assuming always present
            user2Id: messageThreadDataFromFirestore.user2Id as string, // Cast as string, assuming always present
            createdAt: messageThreadDataFromFirestore.createdAt as string, // Cast as string, assuming always present
            // Add other properties needed by MessageThread, potentially with default/undefined values
            // These might be needed by the modal or future expansions
            requesterId: messageThreadDataFromFirestore.user1Id as string, // The user who initiated the inquiry
            ownerId: messageThreadDataFromFirestore.user2Id as string, // The listing owner
            status: 'inquiry', // Explicitly set status for listing inquiries
            // Trade-specific optional fields are undefined for listing inquiries
            offeredListingId: undefined,
            canReviewRequester: undefined,
            canReviewOwner: undefined,
            // Populated fields (otherUser will be populated by the modal using its own context/logic)
            requestedListing: listing, // Pass the current listing details
            otherUser: lister, // Pass the lister as the other user
            lastMessage: undefined, // Will be fetched by the modal's listener
            unreadMessageCountForThread: 0, // Will be tracked by the modal's listener
        };
        setSelectedMessageThread(messageThread);
        setIsMessageModalOpen(true);
      }

    } catch (error) {
      console.error('Error handling message button click:', error);
      showAlert('Failed to initiate messaging.', 'error');
    }
  };

  if (isLoading) return <LoadingSpinner text="Loading bean details..." />;
  if (!listing || !lister) return <div className="text-center text-xl text-red-500">Listing not found.</div>;

  // Determine the array of images for the gallery
  let images: string[];
  if (listing.imageUrl) {
    if (Array.isArray(listing.imageUrl) && listing.imageUrl.length > 0) {
      images = listing.imageUrl;
    } else if (typeof listing.imageUrl === 'string' && listing.imageUrl.length > 0) {
      images = [listing.imageUrl];
    } else {
      images = [DEFAULT_BEAN_IMAGE]; // Fallback for empty array or empty string
    }
  } else {
    images = [DEFAULT_BEAN_IMAGE]; // Fallback for undefined/null
  }

  const alreadyRequested = false; // Placeholder for checking if user already requested this trade

  const handlePrevImage = () => {
    setCurrentImageIndex(prevIndex => (prevIndex === 0 ? images.length - 1 : prevIndex - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex(prevIndex => (prevIndex === images.length - 1 ? 0 : prevIndex + 1));
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-lg shadow-xl space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left Column: Image Gallery and Basic Info */}
        <div>
          {/* Image Gallery */}
          <div className="relative">
            <img 
              src={images[currentImageIndex]} 
              alt={`${listing.name} image ${currentImageIndex + 1}`}
              className="w-full h-96 object-cover rounded-lg shadow-md border-4 border-coffee-light"
            />
            {images.length > 1 && (
              <div className="absolute inset-0 flex items-center justify-between px-4">
                <button 
                  onClick={handlePrevImage} 
                  className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
                  aria-label="Previous image"
                >
                  &lt;
                </button>
                <button 
                  onClick={handleNextImage} 
                  className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
                   aria-label="Next image"
                >
                  &gt;
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 space-y-2">
            <h1 className="text-4xl font-bold text-coffee-primary font-['Playfair_Display']">{listing.name}</h1>
            <p className="text-lg text-coffee-secondary flex items-center"><TagIcon className="w-5 h-5 mr-2"/>Roast: {listing.roast}</p>
            <p className="text-lg text-coffee-secondary flex items-center"><CubeIcon className="w-5 h-5 mr-2"/>Quantity: {listing.quantity}</p>
            <p className="text-lg capitalize flex items-center">
              {listing.tradeOrGiveaway === 'trade' ? <ChatAltIcon className="w-5 h-5 mr-2 text-coffee-accent"/> : <GiftIcon className="w-5 h-5 mr-2 text-red-500"/>}
              Status: <span className={`ml-2 font-semibold ${listing.tradeOrGiveaway === 'trade' ? 'text-coffee-accent' : 'text-red-500'}`}>{listing.tradeOrGiveaway}</span>
            </p>
             {listing.status === 'traded' && <p className="text-lg text-red-600 font-semibold flex items-center"><CheckCircleIcon className="w-5 h-5 mr-2"/>Traded</p>}
          </div>
        </div>

        {/* Right Column: Details, Lister, Actions */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-coffee-primary mb-2 font-['Playfair_Display']">Bean Details</h2>
            <p className="text-gray-700 whitespace-pre-line"><strong className="text-coffee-primary">Origin:</strong> {listing.origin}</p>
            <p className="text-gray-700 whitespace-pre-line mt-2"><strong className="text-coffee-primary">Description:</strong> {listing.description}</p>
            {listing.flavorNotes && <p className="text-gray-700 mt-2"><strong className="text-coffee-primary">Flavor Notes:</strong> {listing.flavorNotes}</p>}
            {listing.processingMethod && <p className="text-gray-700 mt-2"><strong className="text-coffee-primary">Processing Method:</strong> {listing.processingMethod}</p>}
            {listing.elevation && <p className="text-gray-700 mt-2"><strong className="text-coffee-primary">Elevation:</strong> {listing.elevation}</p>}
            {listing.varietal && <p className="text-gray-700 mt-2"><strong className="text-coffee-primary">Varietal:</strong> {listing.varietal}</p>}
            {listing.acidity && <p className="text-gray-700 mt-2"><strong className="text-coffee-primary">Acidity:</strong> {listing.acidity}</p>}
            {listing.body && <p className="text-gray-700 mt-2"><strong className="text-coffee-primary">Body:</strong> {listing.body}</p>}
            {listing.tastingNotes && <p className="text-gray-700 mt-2 whitespace-pre-line"><strong className="text-coffee-primary">Tasting Notes:</strong> {listing.tastingNotes}</p>}
            {listing.isDecaf && <p className="text-gray-700 mt-2"><strong className="text-coffee-primary">Decaffeinated:</strong> Yes</p>}
             <p className="text-sm text-gray-500 mt-2 flex items-center"><CalendarIcon className="w-4 h-4 mr-1"/>Listed on: {new Date(listing.createdAt).toLocaleDateString()}</p>
          </div>
          
          <div className="bg-coffee-extralight p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-coffee-primary mb-3 font-['Playfair_Display']">Listed By</h2>
            <div className="flex items-center space-x-4">
              <img src={lister.avatarUrl} alt={lister.name} className="w-16 h-16 rounded-full object-cover border-2 border-coffee-light" />
              <div>
                <Link to={`/profile/${lister.id}`} className="text-lg font-semibold text-coffee-primary hover:underline">{lister.name}</Link>
                <p className="text-sm text-gray-600 flex items-center"><LocationMarkerIcon className="w-4 h-4 mr-1 text-coffee-secondary"/>{lister.location}</p>
              </div>
            </div>
            {/* Message button (only if not viewing your own listing) */}
            {currentUser && lister && listing && currentUser.id !== lister.id && (
              <button
                onClick={handleOpenMessageModal}
                className="bg-coffee-primary hover:bg-coffee-secondary text-white font-semibold py-2 px-4 rounded transition-colors flex items-center justify-center"
              >
                <MailIcon className="w-5 h-5 mr-2" /> Message {lister.name?.split(' ')[0]}
              </button>
            )}
          </div>

          {/* Actions */}
          {currentUser && currentUser.id !== lister.id && listing.status === 'available' && (
            <div className="pt-4 border-t border-gray-200">
              <button 
                onClick={() => setIsTradeModalOpen(true)}
                disabled={alreadyRequested}
                className="w-full bg-coffee-primary hover:bg-coffee-secondary text-white font-bold py-3 px-4 rounded-md transition-colors duration-300 text-lg disabled:bg-gray-400"
              >
                {listing.tradeOrGiveaway === 'trade' ? 'Request Trade' : 'Request Gift'}
              </button>
              {/* Mock button, assuming trade is completed for review */}
              <button 
                onClick={() => setIsReviewModalOpen(true)}
                className="mt-2 w-full bg-coffee-accent hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md transition-colors duration-300"
              >
                <PencilIcon className="w-4 h-4 mr-2 inline"/> Leave Review for {lister.name} (Mock Scenario)
              </button>
            </div>
          )}
          {currentUser && currentUser.id === lister.id && (
            <p className="text-sm text-gray-500 italic">This is your listing.</p>
          )}
          {!currentUser && listing.status === 'available' && (
            <p className="text-sm text-center text-gray-600">
                <Link to="/" className="text-coffee-primary hover:underline font-semibold">Log in</Link> or select a user to interact with this listing.
            </p>
          )}
        </div>
      </div>
      
      {/* Trade/Gift Request Modal */}
      <Modal isOpen={isTradeModalOpen} onClose={() => setIsTradeModalOpen(false)} title={`Confirm ${listing?.tradeOrGiveaway === 'trade' ? 'Trade' : 'Gift'} Request`}>
        <p className="text-gray-700 mb-4">You are about to request "{listing?.name}" from {lister?.name}.</p>
        {/* Conditionally show bean selection for trade requests */}
        {listing?.tradeOrGiveaway === 'trade' && currentUser && (
          <div className="mb-4">
            <label htmlFor="offeredBean" className="block text-sm font-medium text-gray-700 mb-1">
              Your Bean to Offer:
            </label>
            {isLoadingUserListings ? (
                <LoadingSpinner size="sm" text="Loading your listings..."/>
            ) : userListings.length > 0 ? (
                <select
                  id="offeredBean"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-coffee-primary focus:border-coffee-primary sm:text-sm"
                  value={selectedOfferedListingId || ''}
                  onChange={e => setSelectedOfferedListingId(e.target.value)}
                >
                  {userListings.map(userListing => (
                    <option key={userListing.id} value={userListing.id}>
                      {userListing.name} - {userListing.quantity}
                    </option>
                  ))}
                </select>
            ) : (
                <p className="text-sm text-gray-500">You have no available beans to offer for trade. Add a listing first!</p>
            )}
          </div>
        )}

        {listing?.tradeOrGiveaway === 'trade' && (
          <textarea 
            placeholder="Optional: Message to the owner or what you're offering in trade..."
            className="w-full p-2 border border-gray-300 rounded-md mb-4"
            rows={3}
          ></textarea>
        )}
        <div className="flex justify-end space-x-3">
          <button onClick={() => setIsTradeModalOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors">Cancel</button>
          <button 
            onClick={handleRequestTrade}
            className="px-4 py-2 text-white bg-coffee-primary hover:bg-coffee-secondary rounded-md transition-colors"
            disabled={listing?.tradeOrGiveaway === 'trade' && (!selectedOfferedListingId || userListings.length === 0)}
            >
            Confirm Request
          </button>
        </div>
      </Modal>

      {/* Review Modal */}
      <Modal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} title={`Review ${lister?.name}`}>
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                <StarRating rating={reviewRating} onRatingChange={setReviewRating} />
            </div>
            <div>
                <label htmlFor="reviewComment" className="block text-sm font-medium text-gray-700">Comment</label>
                <textarea
                    id="reviewComment"
                    rows={4}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-coffee-primary focus:border-coffee-primary sm:text-sm"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                ></textarea>
            </div>
            <div className="flex justify-end space-x-3">
                <button onClick={() => setIsReviewModalOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors">Cancel</button>
                <button 
                    onClick={handleLeaveReview}
                    className={`px-4 py-2 text-white bg-coffee-primary hover:bg-coffee-secondary rounded-md transition-colors ${reviewRating === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={reviewRating === 0}
                >
                    Submit Review
                </button>
            </div>
        </div>
      </Modal>

      {/* Render Message Modal */}
      {isMessageModalOpen && selectedMessageThread && (
        <TradeMessageModal
          isOpen={isMessageModalOpen}
          onClose={() => setIsMessageModalOpen(false)}
          messageThread={selectedMessageThread}
        />
      )}

    </div>
  );
};

export default ListingDetailPage;
