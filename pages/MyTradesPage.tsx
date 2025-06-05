        // This is a test comment
        import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
        import { Trade, TradeRequestWithDetails, BeanListing, User, Message, MessageThread } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from '../src/firebase';
        import { doc, getDoc } from 'firebase/firestore';
import Modal from '../components/Modal';
import StarRating from '../components/StarRating';
        import { updateDoc } from 'firebase/firestore';
        import { CheckIcon, XIcon, MailIcon } from '../components/Icons';
        import TradeMessageModal from '../components/TradeMessageModal';

const MyTradesPage: React.FC = () => {
  console.log('MyTradesPage is rendering');
          const { currentUser, showAlert, addReview, acceptTrade, declineTrade, cancelTrade, completeTrade } = useAppContext();
  const [trades, setTrades] = useState<TradeRequestWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

          // State for trade filtering
          const [tradeFilter, setTradeFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // State for Review Modal
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [tradeToReview, setTradeToReview] = useState<TradeRequestWithDetails | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
          const [selectedTags, setSelectedTags] = useState<string[]>([]); // State for selected tags

          // State for messaging modal
          const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
          const [selectedTradeForModal, setSelectedTradeForModal] = useState<MessageThread | null>(null);
          const [messageUpdateTrigger, setMessageUpdateTrigger] = useState(0); // State to trigger message updates

          // Function to open the message modal
          const handleOpenMessageModal = (trade: TradeRequestWithDetails) => {
            // Construct a MessageThread object from the TradeRequestWithDetails
            const messageThreadForModal: MessageThread = {
                id: trade.id, // Use trade ID as message thread ID for trade messages
                type: 'trade', // Explicitly set type as 'trade'
                user1Id: trade.requesterId, // Assuming requester is user1
                user2Id: trade.ownerId, // Assuming owner is user2
                createdAt: trade.createdAt, // Use trade creation date for thread creation date
                listingId: trade.listingId, // Include the requested listing ID
                offeredListingId: trade.offeredListingId, // Include the offered listing ID (optional)
                requesterId: trade.requesterId, // Include requester ID
                ownerId: trade.ownerId, // Include owner ID
                status: trade.status, // Include trade status
                canReviewRequester: trade.canReviewRequester, // Include review flags
                canReviewOwner: trade.canReviewOwner,
                // Populate nested objects if they exist on the trade object
                requestedListing: trade.requestedListing,
                offeredListing: trade.offeredListing,
                otherUser: trade.otherUser,
                lastMessage: trade.lastMessage, // Use the last message from the trade object
                unreadMessageCountForThread: trade.unreadMessageCountForTrade ?? 0, // Use the unread count from the trade object
            };
            setSelectedTradeForModal(messageThreadForModal);
            setIsMessageModalOpen(true);
          };

          // Function to close the message modal
          const handleCloseMessageModal = () => {
            setSelectedTradeForModal(null);
            setIsMessageModalOpen(false);
            
            // Find the trade that was in the modal and update its unread count in the local state
            if (selectedTradeForModal) {
              setTrades(prevTrades =>
                prevTrades.map(trade =>
                  trade.id === selectedTradeForModal.id
                    ? { ...trade, unreadMessageCountForTrade: 0 } // Update the unread count to 0
                    : trade
                )
              );
            }
          };

          // Fetch user's trade requests (incoming and outgoing)
          const fetchMyTrades = useCallback(async () => {
      if (!currentUser?.id) {
        setIsLoading(false);
        setTrades([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const tradesRef = collection(db, 'trades');
        
        // Fetch trades where the current user is the requester
        const requesterQuery = query(
          tradesRef,
          where('requesterId', '==', currentUser.id)
        );
        const requesterSnapshot = await getDocs(requesterQuery);

        // Fetch trades where the current user is the owner
        const ownerQuery = query(
          tradesRef,
          where('ownerId', '==', currentUser.id)
        );
        const ownerSnapshot = await getDocs(ownerQuery);

        // Combine and deduplicate trades
        const allTradesData = [
          ...requesterSnapshot.docs.map(doc => ({ ...doc.data() as Trade, id: doc.id })),
          ...ownerSnapshot.docs.map(doc => ({ ...doc.data() as Trade, id: doc.id })),
        ];

        // Using a Map to deduplicate by trade ID
        const uniqueTradesMap = new Map<string, Trade>(allTradesData.map(trade => [trade.id, trade]));
        const uniqueTrades = Array.from(uniqueTradesMap.values());

        // Sort trades by creation date, newest first
        uniqueTrades.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

              // --- Start: Fetch related data (Listings and Users) ---
              const allListingIds = new Set<string>();
              const allUserIds = new Set<string>();

              uniqueTrades.forEach(trade => {
                  allListingIds.add(trade.listingId);
                  if (trade.offeredListingId) allListingIds.add(trade.offeredListingId);
                  // Add both requesterId and ownerId to allUserIds as we need details for both
                  allUserIds.add(trade.requesterId);
                  allUserIds.add(trade.ownerId);
              });

              // Fetch all unique listings involved
              const fetchedListingsMap: Record<string, any> = {}; // Use any for now, cast later
              if (allListingIds.size > 0) {
                  for (const listingId of Array.from(allListingIds)) {
                      const listingDocRef = doc(db, 'listings', listingId);
                      const listingDocSnap = await getDoc(listingDocRef);
                      if (listingDocSnap.exists()) {
                          fetchedListingsMap[listingId] = { ...listingDocSnap.data(), id: listingDocSnap.id };
                      } else {
                          console.warn(`Listing not found for ID: ${listingId}`);
                      }
                  }
              }

              // Fetch all unique users involved
              const fetchedUsersMap: Record<string, any> = {}; // Use any for now, cast later
              if (allUserIds.size > 0) {
                  for (const userId of Array.from(allUserIds)) {
                      const userDocRef = doc(db, 'users', userId);
                      const userDocSnap = await getDoc(userDocRef);
                      if (userDocSnap.exists()) {
                          fetchedUsersMap[userId] = { ...userDocSnap.data(), id: userDocSnap.id };
                      } else {
                          console.warn(`User not found for ID: ${userId}`);
                      }
                  }
              }
              // --- End: Fetch related data ---

              // --- Start: Fetch Message Data ---
              const messagesRef = collection(db, 'messages');
              const tradeMessagesQueries = Array.from(uniqueTradesMap.keys()).map(tradeId =>
                  query(messagesRef, where('tradeId', '==', tradeId))
              );

              const messagesSnapshots = await Promise.all(tradeMessagesQueries.map(q => getDocs(q))); // Assuming tradeMessagesQueries is the correct array of queries

              const fetchedMessagesMap: Record<string, Message[]> = {};
              messagesSnapshots.forEach(snapshot => {
                  snapshot.docs.forEach(doc => {
                      const message = { ...doc.data() as Message, id: doc.id };
                      if (!fetchedMessagesMap[message.tradeId]) {
                          fetchedMessagesMap[message.tradeId] = [];
                      }
                      fetchedMessagesMap[message.tradeId].push(message);
                  });
              });
              // --- End: Fetch Message Data ---

              // Combine trade data with fetched listing, user, and message data
              const tradesWithDetails = uniqueTrades.map(trade => {
                  const messagesForTrade = fetchedMessagesMap[trade.id] || [];

                  // Calculate unread message count for the current user
                  const unreadMessageCountForTrade = messagesForTrade.filter(msg =>
                      msg.receiverId === currentUser?.id && !msg.isRead
                  ).length;

                  // Find the last message
                  messagesForTrade.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                  const lastMessage = messagesForTrade.length > 0 ? messagesForTrade[messagesForTrade.length - 1] : undefined;

                  return ({
          ...trade,
                      requestedListing: fetchedListingsMap[trade.listingId] as BeanListing | undefined,
                      offeredListing: trade.offeredListingId ? fetchedListingsMap[trade.offeredListingId] as BeanListing | undefined : undefined,
                      otherUser: currentUser?.id === trade.requesterId ? fetchedUsersMap[trade.ownerId] as User | undefined : fetchedUsersMap[trade.requesterId] as User | undefined,
                      unreadMessageCountForTrade,
                      lastMessage,
                  }) as TradeRequestWithDetails;
              });

        setTrades(tradesWithDetails);

              console.log('Trades state after setting:', tradesWithDetails);

      } catch (err) {
        console.error('Error fetching user trades:', err);
        setError('Failed to load your trades.');
        showAlert('Failed to load your trades.', 'error');
      } finally {
        setIsLoading(false);
      }
          }, [currentUser?.id, showAlert]); // Depend on currentUser and showAlert

          // Fetch trades when the component mounts or currentUser changes
          useEffect(() => {
    fetchMyTrades();
          }, [fetchMyTrades]); // Depend on the memoized fetchMyTrades function

  const handleOpenReviewModal = (trade: TradeRequestWithDetails) => {
    if (!currentUser) {
      showAlert('You must be logged in to leave a review.', 'error');
      return;
    }
     // Determine who is being reviewed (the other party)
    const revieweeId = trade.requesterId === currentUser.id ? trade.ownerId : trade.requesterId;
     // You might want to fetch the reviewee's name here for the modal title
    
    setTradeToReview(trade);
    setReviewRating(0); // Reset rating
    setReviewComment(''); // Reset comment
            setSelectedTags([]); // Reset selected tags on open
    setIsReviewModalOpen(true);
  };

  const handleCloseReviewModal = () => {
    setIsReviewModalOpen(false);
    setTradeToReview(null);
    setReviewRating(0);
    setReviewComment('');
            setSelectedTags([]); // Reset selected tags on close
  };

  const handleSubmitReview = async () => {
            if (!currentUser || !tradeToReview) {
              showAlert('Cannot submit review: User or trade not found.', 'error');
              return;
            }
            // Check if a rating is provided (comment is optional)
            if (reviewRating === 0) {
              showAlert('Please provide a rating.', 'info');
      return;
    }

    const revieweeId = tradeToReview.requesterId === currentUser.id ? tradeToReview.ownerId : tradeToReview.requesterId;
    const reviewerId = currentUser.id;

    try {
              // --- Start: Debugging Logs ---
              console.log('Submitting Review Data:', {
                reviewerId: reviewerId,
                revieweeId: revieweeId,
                tradeId: tradeToReview.id,
                rating: reviewRating,
                comment: reviewComment.trim(),
                tags: selectedTags,
                tradeStatus: tradeToReview.status,
                tradeRequesterId: tradeToReview.requesterId,
                tradeOwnerId: tradeToReview.ownerId,
              });
              // --- End: Debugging Logs ---

      // Add the review to Firestore
      await addReview({
        reviewerId,
        revieweeId,
        tradeId: tradeToReview.id, // Link review to the trade
        rating: reviewRating,
        comment: reviewComment.trim(),
                tags: selectedTags, // Include selected tags
        // createdAt will be added by the addReview function
      });

      // Update the trade document to mark that the current user has left a review
      const tradeDocRef = doc(db, 'trades', tradeToReview.id);
      const updateData = currentUser.id === tradeToReview.requesterId 
        ? { canReviewRequester: false } // Requester reviewed
        : { canReviewOwner: false }; // Owner reviewed
      
      await updateDoc(tradeDocRef, updateData);

      // Update local state to reflect the review submission
      setTrades(prevTrades =>
        prevTrades.map(trade =>
          trade.id === tradeToReview.id
            ? { ...trade, ...updateData } // Apply the updateData (canReview flags) to the trade
            : trade
        )
      );

      showAlert('Review submitted successfully!', 'success');
      handleCloseReviewModal(); // Close the modal on success

    } catch (error) {
      console.error('Error submitting review:', error);
      showAlert('Failed to submit review.', 'error');
    }
  };

  // Define possible review tags
  const reviewTags = [
    'Friendly',
    'Fast Responder',
    'Accurate Description',
    'Good Communication',
    'Would Trade Again',
    'Good Quality Beans',
  ];

  // Filter trades based on the selected filter
  const filteredTrades = trades.filter(trade => {
    if (tradeFilter === 'all') {
      return true;
    }
    const isActive = trade.status === 'pending' || trade.status === 'accepted' || trade.status === 'inquiry';
    if (tradeFilter === 'active') {
      return isActive;
    }
    if (tradeFilter === 'inactive') {
      return !isActive;
    }
    return true; // Should not happen
  });

  if (!currentUser) {
    return <div className="text-center text-xl text-red-500">Please log in to view your trades.</div>;
  }

  if (isLoading) {
    return <LoadingSpinner text="Loading your trades..." />;
  }

  if (error) {
    return <div className="text-center text-xl text-red-500">{error}</div>;
  }

  console.log('Trades state before rendering list:', trades);
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-coffee-primary mb-6 text-center font-['Playfair_Display']">My Trades & Gifts</h1>

      {/* Trade Filter Tabs */}
      <div className="pb-3">
        <div className="flex border-b border-[#684831] px-4 gap-8">
          <button
            className={`flex flex-col items-center justify-center border-b-[3px] ${tradeFilter === 'all' ? 'border-b-[#652d05]' : 'border-b-transparent text-[#cba990]'} pb-[13px] pt-4 transition-colors duration-200`}
            onClick={() => setTradeFilter('all')}
          >
            <p className={`text-sm font-bold leading-normal tracking-[0.015em] ${tradeFilter === 'all' ? 'text-coffee-dark' : ''}`}>All</p>
          </button>
          <button
            className={`flex flex-col items-center justify-center border-b-[3px] ${tradeFilter === 'active' ? 'border-b-[#652d05]' : 'border-b-transparent text-[#cba990]'} pb-[13px] pt-4 transition-colors duration-200`}
            onClick={() => setTradeFilter('active')}
          >
            <p className={`text-sm font-bold leading-normal tracking-[0.015em] ${tradeFilter === 'active' ? 'text-coffee-dark' : ''}`}>Active</p>
          </button>
          <button
            className={`flex flex-col items-center justify-center border-b-[3px] ${tradeFilter === 'inactive' ? 'border-b-[#652d05]' : 'border-b-transparent text-[#cba990]'} pb-[13px] pt-4 transition-colors duration-200`}
            onClick={() => setTradeFilter('inactive')}
          >
            <p className={`text-sm font-bold leading-normal tracking-[0.015em] ${tradeFilter === 'inactive' ? 'text-coffee-dark' : ''}`}>Completed</p>
          </button>
        </div>
      </div>

      {/* Incoming Trade Requests */}
      <div className="mb-8">
        {filteredTrades.length === 0 ? (
        <div className="text-center text-gray-600">
          You have no trades or gift requests yet.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Display trades grouped by status for better organization (Optional enhancement) */}
          {/* For now, just list all trades with details */}
            {filteredTrades.map(trade => (
              <div key={trade.id} className="bg-[#342418] p-4 rounded-xl shadow-[0_0_4px_rgba(0,0,0,0.1)] mb-4 flex flex-col md:flex-row items-start md:items-stretch gap-4">
                {/* Listing Image */}
                {trade.requestedListing?.imageUrl ? (
                  <div className="w-full md:w-40 h-40 md:h-auto flex-shrink-0 rounded-md overflow-hidden aspect-video md:aspect-auto">
                    <img
                      src={trade.requestedListing.imageUrl}
                      alt={trade.requestedListing.name || 'Listing Image'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full md:w-40 h-40 md:h-auto flex-shrink-0 rounded-md bg-gray-700 flex items-center justify-center text-gray-400 text-sm text-center p-2 aspect-video md:aspect-auto">
                    No Image
                  </div>
                )}

                {/* Trade Details and Actions */}
                <div className="flex-grow flex flex-col gap-4">
                  <div>
                    <p className="text-gray-300 text-sm font-normal leading-normal">{trade.requesterId === currentUser?.id ? 'Sent' : 'Received'}: {trade.requestedListing?.name || '[Deleted Listing]'}</p>
                    <p className="text-white text-base font-bold leading-tight">Trade with {trade.otherUser?.name || '[Unknown User]'}</p>
                    <p className="text-gray-300 text-sm font-normal leading-normal">Status: <span className="capitalize font-medium text-gray-100">{trade.status}</span></p>
                  </div>
                  {/* Action Buttons and Review Button */}
                  <div className="flex flex-wrap gap-2 mt-auto">
                    {/* Pending state: Accept/Decline for Owner, Cancel for Requester */}
                    {trade.status === 'pending' && (
                      trade.ownerId === currentUser?.id ? (
                        <>
                          <button onClick={async () => { await acceptTrade(trade.id); fetchMyTrades(); }} className="bg-coffee-primary hover:bg-coffee-dark text-white text-sm px-4 py-2 rounded-md transition-colors duration-300 flex items-center"><CheckIcon className="w-4 h-4 mr-1"/> Accept</button>
                          <button onClick={async () => { await declineTrade(trade.id); fetchMyTrades(); }} className="bg-coffee-primary hover:bg-coffee-dark text-white text-sm px-4 py-2 rounded-md transition-colors duration-300 flex items-center"><XIcon className="w-4 h-4 mr-1"/> Decline</button>
                        </>
                      ) : trade.requesterId === currentUser?.id ? (
                        <button onClick={async () => { await cancelTrade(trade.id); fetchMyTrades(); }} className="bg-coffee-primary hover:bg-coffee-dark text-white text-sm px-4 py-2 rounded-md transition-colors duration-300 flex items-center"><XIcon className="w-4 h-4 mr-1"/> Cancel Request</button>
                      ) : null
                    )}

                    {/* Accepted state: Message/Complete for both */}
                    {trade.status === 'accepted' && (trade.requesterId === currentUser?.id || trade.ownerId === currentUser?.id) && (
                      <>
                        {/* Message button - will need to fetch message count */}
                        <button
                          onClick={() => handleOpenMessageModal(trade)}
                          className="bg-coffee-primary hover:bg-coffee-dark text-white text-sm px-4 py-2 rounded-md transition-colors duration-300 flex items-center"
                        >
                          <MailIcon className="w-4 h-4 mr-1"/> Message
                          {/* Add unread message count badge here if needed */}
                          {(trade.unreadMessageCountForTrade ?? 0) > 0 && (
                            <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                              {trade.unreadMessageCountForTrade}
                            </span>
                          )}
                        </button>
                        {/* Complete Trade button - only if current user is the owner */}
                        {trade.ownerId === currentUser?.id && (
                          <button onClick={async () => { await completeTrade(trade.id); fetchMyTrades(); }} className="bg-coffee-primary hover:bg-coffee-dark text-white text-sm px-4 py-2 rounded-md transition-colors duration-300 flex items-center"><CheckIcon className="w-4 h-4 mr-1"/> Complete Trade</button>
                        )}
                      </>
                    )}

                    {/* Completed state: Leave Review */}
                    {trade.status === 'completed' && currentUser?.id && (
              (trade.requesterId === currentUser.id && trade.canReviewRequester) ||
              (trade.ownerId === currentUser.id && trade.canReviewOwner)
                    ) && (
                  <button 
                        className="px-4 py-2 bg-coffee-primary hover:bg-coffee-dark text-white font-semibold rounded-md transition-colors duration-300 text-sm"
                    onClick={() => handleOpenReviewModal(trade)}
                  >
                    Leave Review
                  </button>
                )}
                
                    {/* Display status for declined/cancelled */}
                    {(trade.status === 'declined' || trade.status === 'cancelled') && (
                        <span className="text-sm font-semibold text-red-600">
                            Status: {trade.status}
                        </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
      </div>

      {/* Review Modal */}
      <Modal isOpen={isReviewModalOpen} onClose={handleCloseReviewModal} title={`Leave Review for ${tradeToReview?.requesterId === currentUser?.id ? 'the owner' : 'the requester' /* Use fetched name later */}`}>
           <div className="space-y-4">
               <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Rating*</label>
                   <StarRating rating={reviewRating} onRatingChange={setReviewRating} size="w-6 h-6" />
               </div>
               <div>
                   <label htmlFor="reviewComment" className="block text-sm font-medium text-gray-700">Comment (Optional)</label>
                   <textarea
                       id="reviewComment"
                       rows={3}
                       className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-coffee-primary focus:border-coffee-primary sm:text-sm"
                       value={reviewComment}                           
                       onChange={(e) => setReviewComment(e.target.value)}
                   ></textarea>
               </div>
               {/* Tag Selection */}
               <div>
                   <span className="block text-sm font-medium text-gray-700">Select relevant tags:</span>
                   <div className="mt-2 flex flex-wrap gap-2">
                       {reviewTags.map(tag => (
                           <label key={tag} className="inline-flex items-center">
                               <input
                                   type="checkbox"
                                   className="form-checkbox h-4 w-4 text-coffee-primary rounded border-gray-300 focus:ring-coffee-secondary"
                                   checked={selectedTags.includes(tag)}
                                   onChange={(e) => {
                                       if (e.target.checked) {
                                           setSelectedTags([...selectedTags, tag]);
                                       } else {
                                           setSelectedTags(selectedTags.filter(t => t !== tag));
                                       }
                                   }}
                               />
                               <span className="ml-2 text-gray-700 text-sm">{tag}</span>
                           </label>
                       ))}
                   </div>
               </div>
               <div className="flex justify-end space-x-3">
                   <button onClick={handleCloseReviewModal} className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors">Cancel</button>
                   <button 
                       onClick={handleSubmitReview}
                       className={`px-4 py-2 text-white bg-coffee-primary hover:bg-coffee-secondary rounded-md transition-colors ${reviewRating === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                       disabled={reviewRating === 0} // Disable if rating is 0
                       >
                       Submit Review
                   </button>
               </div>
           </div>
       </Modal>

       {/* Message Modal */}
       {isMessageModalOpen && selectedTradeForModal && currentUser && (
         <TradeMessageModal
           isOpen={isMessageModalOpen}
           onClose={handleCloseMessageModal}
           messageThread={selectedTradeForModal}
         />
       )}

    </div>
  );
};

console.log('MyTradesPage component loaded'); // Add a log outside the component to see if the file is executed

export default MyTradesPage; 