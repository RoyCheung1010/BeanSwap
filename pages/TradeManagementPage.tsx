import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { User, BeanListing, Trade, TradeRequestWithDetails, AppAlert } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { MailIcon, CheckIcon, XIcon, RefreshIcon } from '../components/Icons';
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from '../src/firebase';
import TradeMessageModal from '../components/TradeMessageModal';

const TradeManagementPage: React.FC = () => {
  // We will likely get the user ID from the currentUser in AppContext
  const { currentUser, showAlert, acceptTrade, declineTrade, cancelTrade, completeTrade } = useAppContext();
  const userId = currentUser?.id; // Get the current user's ID

  const [incomingTradeRequests, setIncomingTradeRequests] = useState<TradeRequestWithDetails[]>([]);
  const [outgoingTradeRequests, setOutgoingTradeRequests] = useState<TradeRequestWithDetails[]>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState(true);
  const [tradesError, setTradesError] = useState<string | null>(null);

  // State for messaging modal
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<TradeRequestWithDetails | null>(null);

  // Function to open the message modal
  const handleOpenMessageModal = useCallback((trade: TradeRequestWithDetails) => {
    setSelectedTrade(trade);
    setIsMessageModalOpen(true);
  }, []);

  // Function to close the message modal
  const handleCloseMessageModal = useCallback(() => {
    setSelectedTrade(null);
    setIsMessageModalOpen(false);
    // Refresh trades here after closing modal in case status changed (e.g., completed trade via message)
    fetchUserTrades(); // Call the memoized fetch function
  }, [userId, showAlert]); // Depend on userId and showAlert indirectly via fetchUserTrades' dependencies

  // Fetch user's trade requests (incoming and outgoing)
  const fetchUserTrades = useCallback(async () => {
      setTradesError(null);
      if (!userId) {
          setIsLoadingTrades(false);
          setTradesError('User is not logged in.'); // Update error message
          setIncomingTradeRequests([]);
          setOutgoingTradeRequests([]);
          return;
      }
      setIsLoadingTrades(true); // Set loading state when fetching starts
      try {
          // Fetch incoming requests (where current user is the owner)
          const incomingQuery = query(
              collection(db, 'trades'),
              where('ownerId', '==', userId),
              where('status', 'in', ['pending', 'accepted', 'completed', 'declined', 'cancelled'])
          );
          const incomingSnapshot = await getDocs(incomingQuery);
          const incomingTradesData = incomingSnapshot.docs.map(doc => ({
              ...doc.data() as Trade,
              id: doc.id,
          }));

          console.log('Fetched incoming trades:', incomingTradesData); // Add this line

          // Fetch outgoing requests (where current user is the requester)
          const outgoingQuery = query(
              collection(db, 'trades'),
              where('requesterId', '==', userId),
              where('status', 'in', ['pending', 'accepted', 'completed', 'declined', 'cancelled'])
          );
          const outgoingSnapshot = await getDocs(outgoingQuery);
          const outgoingTradesData = outgoingSnapshot.docs.map(doc => ({
              ...doc.data() as Trade,
              id: doc.id,
          }));

          console.log('Fetched outgoing trades:', outgoingTradesData); // Add this line

          // Fetch related listing and user data for trades
          const allListingIds = new Set<string>();
          const allUserIds = new Set<string>();

          const filteredIncomingTrades = incomingTradesData.filter(trade => trade.status !== 'inquiry');
          filteredIncomingTrades.forEach(trade => {
              allListingIds.add(trade.listingId);
              if (trade.offeredListingId) allListingIds.add(trade.offeredListingId);
              allUserIds.add(trade.requesterId); // Other user is the requester for incoming
          });

          const filteredOutgoingTrades = outgoingTradesData.filter(trade => trade.status !== 'inquiry');
          filteredOutgoingTrades.forEach(trade => {
              allListingIds.add(trade.listingId);
              if (trade.offeredListingId) allListingIds.add(trade.offeredListingId);
              allUserIds.add(trade.ownerId); // Other user is the owner for outgoing
          });

          // Fetch all unique listings involved
          const fetchedListingsMap: Record<string, BeanListing> = {};
          if (allListingIds.size > 0) {
              for (const listingId of Array.from(allListingIds)) {
                  const listingDocRef = doc(db, 'listings', listingId);
                  const listingDocSnap = await getDoc(listingDocRef);
                  if (listingDocSnap.exists()) {
                      fetchedListingsMap[listingId] = { ...listingDocSnap.data() as BeanListing, id: listingDocSnap.id };
                  } else {
                      console.warn(`Listing not found for ID: ${listingId}`);
                  }
              }
          }

          // Fetch all unique users involved (the other parties)
          const fetchedUsersMap: Record<string, User> = {};
          if (allUserIds.size > 0) {
               for (const otherUserId of Array.from(allUserIds)) { // Renamed to otherUserId to avoid conflict
                  const userDocRef = doc(db, 'users', otherUserId);
                  const userDocSnap = await getDoc(userDocRef);
                  if (userDocSnap.exists()) {
                      fetchedUsersMap[otherUserId] = { ...userDocSnap.data() as User, id: userDocSnap.id };
                  } else {
                      console.warn(`User not found for ID: ${otherUserId}`);
                  }
              }
          }

          // Combine trade data with fetched listing and user data for easier rendering
          const combinedIncomingTrades = incomingTradesData.map(trade => ({
              ...trade,
              requestedListing: fetchedListingsMap[trade.listingId],
              offeredListing: trade.offeredListingId ? fetchedListingsMap[trade.offeredListingId] : undefined,
              otherUser: fetchedUsersMap[trade.requesterId], // The requester is the other user
          }) as TradeRequestWithDetails);
          setIncomingTradeRequests(combinedIncomingTrades.filter(trade => trade.status !== 'inquiry'));

          const combinedOutgoingTrades = outgoingTradesData.map(trade => ({
              ...trade,
              requestedListing: fetchedListingsMap[trade.listingId],
              offeredListing: trade.offeredListingId ? fetchedListingsMap[trade.offeredListingId] : undefined,
              otherUser: fetchedUsersMap[trade.ownerId], // The owner is the other user
          }) as TradeRequestWithDetails);
          setOutgoingTradeRequests(combinedOutgoingTrades.filter(trade => trade.status !== 'inquiry'));

      } catch (error) {
          console.error('Error fetching user trades:', error);
          setIncomingTradeRequests([]);
          setOutgoingTradeRequests([]);
          setTradesError('Failed to load trade requests.');
          showAlert('Failed to load trade requests.', 'error');
      } finally {
          setIsLoadingTrades(false);
      }
  }, [userId, showAlert]); // Depend on userId and showAlert

  // Fetch trades when the component mounts or userId changes
  useEffect(() => {
      fetchUserTrades();
  }, [fetchUserTrades]); // Depend on the memoized fetchUserTrades function

  // Handlers for trade actions (using AppContext functions)
  const handleAcceptTrade = useCallback(async (tradeId: string) => {
    await acceptTrade(tradeId);
    fetchUserTrades(); // Refresh trades after action
  }, [acceptTrade, fetchUserTrades]);

  const handleDeclineTrade = useCallback(async (tradeId: string) => {
    await declineTrade(tradeId);
    fetchUserTrades(); // Refresh trades after action
  }, [declineTrade, fetchUserTrades]);

  const handleCancelTrade = useCallback(async (tradeId: string) => {
    await cancelTrade(tradeId);
    fetchUserTrades(); // Refresh trades after action
  }, [cancelTrade, fetchUserTrades]);

   const handleCompleteTrade = useCallback(async (tradeId: string) => {
    await completeTrade(tradeId);
    fetchUserTrades(); // Refresh trades after action
  }, [completeTrade, fetchUserTrades]);

  if (!currentUser) {
    return <div className="container mx-auto p-4 text-center">Please log in to view your trades.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-coffee-dark font-['Playfair_Display'] mb-6">My Trades</h1>

       {/* Incoming Trade Requests */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-coffee-primary mb-4">Incoming Trade Requests</h2>
        {isLoadingTrades ? (
            <LoadingSpinner />
        ) : tradesError ? (
            <p className="text-red-500">Error loading incoming trades: {tradesError}</p>
        ) : incomingTradeRequests.length === 0 ? (
            <p className="text-gray-600">No incoming trade requests.</p>
        ) : (
            <div className="space-y-4">
                {incomingTradeRequests.map(trade => (
                    trade.status !== 'inquiry' ? (
                    <div key={trade.id} className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row justify-between items-start md:items-center">
                        <div>
                            <p className="font-semibold text-coffee-dark">Request for "{trade.requestedListing?.name || '[Deleted Listing]'}" from {trade.otherUser?.name || '[Unknown User]'}</p>
                            {trade.offeredListing && (
                                <p className="text-sm text-gray-600">Offering: "{trade.offeredListing.name}"</p>
                            )}
                            <p className="text-sm text-gray-500">Status: {trade.status} | Sent On: {new Date(trade.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex space-x-2 mt-3 md:mt-0">
                            {trade.status === 'pending' && (
                                <>
                                    <button onClick={() => handleAcceptTrade(trade.id)} className="bg-green-500 hover:bg-green-600 text-white text-sm px-3 py-1 rounded flex items-center"><CheckIcon className="w-4 h-4 mr-1"/> Accept</button>
                                    <button onClick={() => handleDeclineTrade(trade.id)} className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1 rounded flex items-center"><XIcon className="w-4 h-4 mr-1"/> Decline</button>
                                </>
                            )}
                             {trade.status === 'accepted' && (
                                <>
                                    {/* Message button */}
                                    <button
                                        onClick={() => handleOpenMessageModal(trade)}
                                        className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded flex items-center"
                                    >
                                        <MailIcon className="w-4 h-4 mr-1"/> Message {(trade.unreadMessageCountForTrade ?? 0) > 0 && (
                                             <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                                                {trade.unreadMessageCountForTrade}
                                            </span>
                                        )}
                                    </button>
                                     {/* Complete Trade button */}
                                    <button onClick={() => handleCompleteTrade(trade.id)} className="bg-coffee-secondary hover:bg-coffee-dark text-white text-sm px-3 py-1 rounded flex items-center"><CheckIcon className="w-4 h-4 mr-1"/> Complete Trade</button>
                                     {/* Cancel Accepted Trade button (Owner side)*/}
                                    <button onClick={() => handleCancelTrade(trade.id)} className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1 rounded flex items-center"><XIcon className="w-4 h-4 mr-1"/> Cancel Trade</button>
                                </>
                            )}
                             {/* Display status for completed/declined/cancelled */}
                            {['completed', 'declined', 'cancelled'].includes(trade.status) && (
                                <span className={`text-sm font-semibold ${trade.status === 'completed' ? 'text-green-600' : 'text-red-600'}`}>
                                    Status: {trade.status}
                                </span>
                            )}
                        </div>
                    </div>
                ): null
            ))}
            </div>
        )}
      </div>

      {/* Outgoing Trade Requests */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-coffee-primary mb-4">Outgoing Trade Requests</h2>
         {isLoadingTrades ? (
            <LoadingSpinner />
        ) : tradesError ? (
            <p className="text-red-500">Error loading outgoing trades: {tradesError}</p>
        ) : outgoingTradeRequests.length === 0 ? (
            <p className="text-gray-600">No outgoing trade requests.</p>
        ) : (
            <div className="space-y-4">
                {outgoingTradeRequests.map(trade => (
                    trade.status !== 'inquiry' ? (
                    <div key={trade.id} className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row justify-between items-start md:items-center">
                        <div>
                            <p className="font-semibold text-coffee-dark">Request for "{trade.requestedListing?.name || '[Deleted Listing]'}" with {trade.otherUser?.name || '[Unknown User]'}</p>
                             {trade.offeredListing && (
                                <p className="text-sm text-gray-600">Offering: "{trade.offeredListing.name}"</p>
                            )}
                            <p className="text-sm text-gray-500">Status: {trade.status} | Sent : {new Date(trade.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex space-x-2 mt-3 md:mt-0">
                             {trade.status === 'pending' && (
                                <button onClick={() => handleCancelTrade(trade.id)} className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1 rounded flex items-center"><XIcon className="w-4 h-4 mr-1"/> Cancel Request</button>
                            )}
                             {trade.status === 'accepted' && (
                                 <>
                                     {/* Message button */}
                                    <button
                                        onClick={() => handleOpenMessageModal(trade)}
                                        className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded flex items-center"
                                    >
                                        <MailIcon className="w-4 h-4 mr-1"/> Message {(trade.unreadMessageCountForTrade ?? 0) > 0 && (
                                             <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                                                {trade.unreadMessageCountForTrade}
                                            </span>
                                        )}
                                    </button>
                                      {/* Cancel Accepted Trade button (Requester side)*/}
                                    <button onClick={() => handleCancelTrade(trade.id)} className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1 rounded flex items-center"><XIcon className="w-4 h-4 mr-1"/> Cancel Trade</button>
                                 </>
                            )}
                            {['completed', 'declined', 'cancelled'].includes(trade.status) && (
                                <span className={`text-sm font-semibold ${trade.status === 'completed' ? 'text-green-600' : 'text-red-600'}`}>
                                    Status: {trade.status}
                                </span>
                            )}
                        </div>
                    </div>
                ): null
                ))}
            </div>
        )}
      </div>

       {/* Message Modal */}
      {isMessageModalOpen && selectedTrade && currentUser && selectedTrade.otherUser && (
        <TradeMessageModal
          isOpen={isMessageModalOpen}
          onClose={handleCloseMessageModal}
          messageThreadId={selectedTrade.id}
          otherUser={selectedTrade.otherUser}
        />
      )}


    </div>
  );
};

export default TradeManagementPage; 