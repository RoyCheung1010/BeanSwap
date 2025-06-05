import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { User, BeanListing, RoastProfile, FlavorProfile, Review, Trade, AppAlert, Message, TradeRequestWithDetails } from '../types';
import { FLAVOR_PROFILES_OPTIONS } from '../constants';
import { doc, updateDoc, collection, addDoc, query, where, getDocs, onSnapshot, orderBy, getDoc, writeBatch, limit, QuerySnapshot, DocumentData } from "firebase/firestore"; // Import Firestore functions and writeBatch
import { db } from '../src/firebase'; // Import the Firestore instance and fix path
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // Import Firebase Storage functions
import { storage } from '../src/firebase'; // Import the Firebase Storage instance and fix path

// Mock Data
const MOCK_USERS: User[] = [
  {
    id: 'user1', uid: 'firebase-uid-1', email: 'alice@example.com', name: 'Alice Wonderland', avatarUrl: 'https://picsum.photos/seed/alice/200', location: 'Nairobi, Kenya',
    bio: 'Passionate home barista exploring single-origin Kenyan beans. Love fruity and floral notes!',
    preferredRoasts: [RoastProfile.LIGHT, RoastProfile.MEDIUM],
    favoriteFlavors: [FLAVOR_PROFILES_OPTIONS[0], FLAVOR_PROFILES_OPTIONS[4]], // Fruity, Floral
  },
  {
    id: 'user2', uid: 'firebase-uid-2', email: 'bob@example.com', name: 'Bob The Roaster', avatarUrl: 'https://picsum.photos/seed/bob/200', location: 'Medellín, Colombia',
    bio: 'Small-batch roaster specializing in Colombian microlots. Always up for a good trade.',
    preferredRoasts: [RoastProfile.MEDIUM, RoastProfile.DARK],
    favoriteFlavors: [FLAVOR_PROFILES_OPTIONS[1], FLAVOR_PROFILES_OPTIONS[6]], // Chocolatey, Caramel
  },
  {
    id: 'user3', uid: 'firebase-uid-3', email: 'charlie@example.com', name: 'Charlie Brewmaster', avatarUrl: 'https://picsum.photos/seed/charlie/200', location: 'Portland, USA',
    bio: 'Espresso enthusiast and latte art lover. Looking for unique beans to experiment with.',
    preferredRoasts: [RoastProfile.MEDIUM],
    favoriteFlavors: [FLAVOR_PROFILES_OPTIONS[2], FLAVOR_PROFILES_OPTIONS[5]], // Nutty, Earthy
  },
];

const MOCK_LISTINGS: BeanListing[] = [
  {
    id: 'listing1', userId: 'user1', name: 'Kenya AA Washed', origin: 'Nyeri, Kenya', roast: RoastProfile.LIGHT,
    flavorNotes: 'Blackcurrant, Grapefruit, Floral', quantity: '250g', tradeOrGiveaway: 'trade',
    description: 'Exquisite light roast from the highlands of Nyeri. Bright acidity and complex fruit notes. Perfect for pour-over.',
    imageUrl: 'https://picsum.photos/seed/kenyaaa/400/300',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), status: 'available',
  },
  {
    id: 'listing2', userId: 'user2', name: 'Colombia Supremo Dark Roast', origin: 'Antioquia, Colombia', roast: RoastProfile.DARK,
    flavorNotes: 'Dark Chocolate, Toasted Almond, Molasses', quantity: '500g', tradeOrGiveaway: 'trade',
    description: 'A bold and rich dark roast, perfect for espresso or a strong French press. Full-bodied with a lingering sweet finish.',
    imageUrl: 'https://picsum.photos/seed/colombia/400/300',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(), status: 'available',
  },
  {
    id: 'listing3', userId: 'user1', name: 'Ethiopian Yirgacheffe (Giveaway)', origin: 'Yirgacheffe, Ethiopia', roast: RoastProfile.MEDIUM,
    flavorNotes: 'Blueberry, Jasmine, Lemon Zest', quantity: '100g (Sample)', tradeOrGiveaway: 'giveaway',
    description: 'A small sample of delightful Yirgacheffe. Offering as a giveaway to someone who wants to try something new!',
    imageUrl: 'https://picsum.photos/seed/yirgacheffe/400/300',
    createdAt: new Date().toISOString(), status: 'available',
  },
   {
    id: 'listing4', userId: 'user3', name: 'Brazil Santos Medium', origin: 'Minas Gerais, Brazil', roast: RoastProfile.MEDIUM,
    flavorNotes: 'Peanut, Milk Chocolate, Smooth', quantity: '1lb', tradeOrGiveaway: 'trade',
    description: 'Classic Brazilian coffee, nutty and sweet with a smooth body. Great all-rounder.',
    imageUrl: 'https://picsum.photos/seed/brazil/400/300',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), status: 'traded',
  },
];

const MOCK_REVIEWS: Review[] = [
  { 
    id: 'review1', reviewerId: 'user2', revieweeId: 'user1', listingId: 'listing1', rating: 5, 
    comment: 'Fantastic beans from Alice! Smooth trade process. Highly recommend.', 
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString() 
  },
  { 
    id: 'review2', reviewerId: 'user1', revieweeId: 'user2', rating: 4, 
    comment: 'Bob was great to trade with. Beans were as described. Shipping was a bit slow but overall good experience.', 
    createdAt: new Date().toISOString() 
  },
];

const MOCK_TRADES: Trade[] = [
    {
        id: 'trade1', listingId: 'listing1', requesterId: 'user2', ownerId: 'user1',
        status: 'completed', createdAt: new Date(Date.now() - 86400000 * 1.5).toISOString()
    }
];

// Interface for trades with populated details for display
// export interface TradeRequestWithDetails extends Trade {
//   requestedListing?: BeanListing;
//   offeredListing?: BeanListing;
//   otherUser?: User;
//   unreadMessageCountForTrade?: number; // Add unread message count for this specific trade
//   lastMessage?: Message; // Add last message for display in dropdown
// }

// Define a new interface that can represent both trade-based and listing-inquiry-based message threads
export interface MessageThread extends Trade {
  // Inherit properties from Trade, but some might be optional for listing inquiries
  // For listing inquiries:
  user1Id?: string; // The user who initiated the inquiry
  user2Id?: string; // The user receiving the inquiry (listing owner)
  // Use a 'type' field to distinguish
  type: 'trade' | 'listing_inquiry';
  
  // Populated details for display
  requestedListing?: BeanListing; // The listing the inquiry or trade is about
  offeredListing?: BeanListing; // The listing offered in a trade
  otherUser?: User; // The other participant in the thread
  
  // Messaging specific fields
  unreadMessageCountForThread?: number; // Use 'Thread' instead of 'Trade'
  lastMessage?: Message;
}

interface AppContextType {
  currentUser: User | null;
  users: User[];
  listings: BeanListing[];
  trades: Trade[];
  newTradeRequestCount: number;
  unreadMessageCount: number;
  messageThreads: MessageThread[]; // Use the new interface
  alert: AppAlert | null;
  setCurrentUser: (user: User | null) => void;
  updateUserProfile: (updatedProfile: User) => Promise<void>;
  addListing: (newListingData: Omit<BeanListing, 'id' | 'createdAt' | 'status' | 'userId'>) => Promise<void>;
  addReview: (newReviewData: Omit<Review, 'id' | 'createdAt'>) => Promise<void>;
  addTrade: (newTradeData: Omit<Trade, 'id'>) => Promise<void>;
  acceptTrade: (tradeId: string) => Promise<void>;
  declineTrade: (tradeId: string) => Promise<void>;
  cancelTrade: (tradeId: string) => Promise<void>;
  completeTrade: (tradeId: string) => Promise<void>;
  sendMessage: (messageThreadId: string, text: string) => Promise<void>;
  subscribeToTradeMessages: (messageThreadId: string, onMessages: (messages: Message[]) => void) => () => void;
  markMessagesAsRead: (messageThreadId: string) => Promise<void>;
  showAlert: (message: string, type: AppAlert['type']) => void;
  hideAlert: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [listings, setListings] = useState<BeanListing[]>(MOCK_LISTINGS);
  const [trades, setTrades] = useState<Trade[]>(MOCK_TRADES);
  const [alert, setAlert] = useState<AppAlert | null>(null);
  const [newTradeRequestCount, setNewTradeRequestCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [messageThreads, setMessageThreads] = useState<MessageThread[]>([]); // Use the new state variable

  const latestReviewsSnapshot = useRef<QuerySnapshot<DocumentData> | null>(null);

  // Load initial user from local storage or default to null
  useEffect(() => {
    const storedUserId = localStorage.getItem('beanSwapCurrentUser');
    if (storedUserId) {
      // Note: This still loads from mock users. Need to update to load from Firestore.
      const user = MOCK_USERS.find(u => u.id === storedUserId);
      if (user) setCurrentUser(user);
    }
  }, []);

  const handleSetCurrentUser = useCallback((user: User | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('beanSwapCurrentUser', user.id);
    } else {
      localStorage.removeItem('beanSwapCurrentUser');
    }
  }, []);

  const showAlert = useCallback((message: string, type: AppAlert['type']) => {
    setAlert({ message, type });
  }, []);

  const hideAlert = useCallback(() => {
    setAlert(null);
  }, []);

  // Modify updateUserProfile to update Firestore
  const updateUserProfile = useCallback(async (updatedProfile: User) => {
    if (!currentUser || currentUser.id !== updatedProfile.id) {
      console.error("Attempted to update profile for a user who is not currently logged in.");
      return;
    }

    try {
      const userDocRef = doc(db, 'users', updatedProfile.id);
      await updateDoc(userDocRef, {
        ...updatedProfile
        // Note: Firestore updateDoc can merge data, but explicitly listing fields is safer
        // e.g., name: updatedProfile.name, location: updatedProfile.location, ...
        // For simplicity, we'll update with the whole object assuming it matches Firestore structure
      });
      // Update the currentUser state in AppContext after successful Firestore update
      setCurrentUser(updatedProfile);
      console.log('Profile updated successfully in Firestore.');
    } catch (error) {
      console.error('Error updating profile in Firestore:', error);
      // Optionally show an error alert
      showAlert('Failed to update profile.', 'error');
      throw error; // Re-throw the error to be caught by the calling component (ProfilePage)
    }
    
    // Remove updating local mock users array
    // setUsers(prevUsers => prevUsers.map(u => u.id === updatedProfile.id ? updatedProfile : u));
  }, [currentUser, showAlert]);

  // Revert addListing function implementation to accept only listing data
  const addListing = async (newListing: Omit<BeanListing, 'id' | 'createdAt' | 'status' | 'userId'>) => {
    if (!currentUser) return;

    try {
      const listingsCollectionRef = collection(db, 'listings');
      // Define the shape of the data we will add to Firestore
      const listingDataForFirestore = {
        ...newListing, // Spread properties from the newListing argument
        userId: currentUser.id,
        createdAt: new Date().toISOString(),
        status: 'available', // Set default status
        imageUrl: newListing.imageUrl || null, // Use imageUrl from newListing or null
        roaster: newListing.roaster || '', // Ensure these fields are included even if optional in type
        boughtFrom: newListing.boughtFrom || '',
        roastedDate: newListing.roastedDate || '',
        isDecaf: newListing.isDecaf || false, // Include isDecaf
        // Add other optional fields from the type definition with default values if needed
        description: newListing.description || '',
        flavorNotes: newListing.flavorNotes || '',
        name: newListing.name,
        origin: newListing.origin,
        roast: newListing.roast,
        quantity: newListing.quantity,
        tradeOrGiveaway: newListing.tradeOrGiveaway,

      };

      // Use the refined data object
      await addDoc(listingsCollectionRef, listingDataForFirestore);
      console.log('Bean listing added successfully to Firestore.');
      // Note: The listings state in AppContext is NOT updated here.
      // The ListingsPage will need to fetch data from Firestore.
    } catch (error) {
      console.error('Error adding bean listing to Firestore:', error);
      showAlert('Failed to add bean listing.', 'error');
      throw error; // Re-throw the error
    }
  };

  // Modify addReview to save to Firestore
  const addReview = async (newReviewData: Omit<Review, 'id' | 'createdAt'>) => {
    if (!currentUser) {
      showAlert('You must be logged in to leave a review.', 'error');
      return;
    }
    // We'll assume the review data passed in already includes reviewerId and revieweeId
    // and potentially listingId or tradeId.

    try {
      const reviewsCollectionRef = collection(db, 'reviews');
      const reviewDataForFirestore = {
        ...newReviewData,
        createdAt: new Date().toISOString(),
      };

      await addDoc(reviewsCollectionRef, reviewDataForFirestore);
      console.log('Review added successfully to Firestore.');
      // No need to update local reviews state here, ProfilePage will fetch from Firestore

    } catch (error) {
      console.error('Error adding review to Firestore:', error);
      showAlert('Failed to submit review.', 'error');
      throw error; // Re-throw the error
    }
  };
  
  const addTrade = useCallback(async (newTradeData: Omit<Trade, 'id'>) => {
    if (!currentUser) {
      showAlert('You must be logged in to request a trade/gift.', 'error');
      return; // Should not happen if UI prevents but good to have
    }

    try {
      const tradesCollectionRef = collection(db, 'trades');
      const newTrade: Omit<Trade, 'id'> = {
        ...newTradeData,
        createdAt: new Date().toISOString(),
        status: 'pending', // Set initial status to pending
        // Initialize review flags to false
        canReviewRequester: false,
        canReviewOwner: false,
        // Ensure requesterId and ownerId are correctly set from newTradeData
        requesterId: newTradeData.requesterId,
        ownerId: newTradeData.ownerId,
        listingId: newTradeData.listingId,
      };
      
      await addDoc(tradesCollectionRef, newTrade);
      console.log('Trade/Gift request added successfully to Firestore.');
      // We might want to add logic here later to notify the listing owner
    } catch (error) {
      console.error('Error adding Trade/Gift request to Firestore:', error);
      showAlert('Failed to send Trade/Gift request.', 'error');
      throw error; // Re-throw the error
    }
  }, [currentUser, showAlert]);

  // Helper function to update trade status in Firestore and associated listing status
  const updateTradeStatus = useCallback(async (tradeId: string, status: 'accepted' | 'declined' | 'completed' | 'cancelled') => {
    if (!currentUser) {
      showAlert('You must be logged in to manage trade requests.', 'error');
      return; // Should not happen if UI prevents but good to have
    }

    const batch = writeBatch(db);
    const tradeDocRef = doc(db, 'trades', tradeId);

    try {
      // 1. Get the trade document to find the listingId
      const tradeDocSnap = await getDoc(tradeDocRef);
      if (!tradeDocSnap.exists()) {
        showAlert('Trade not found.', 'error');
        console.error(`Trade document ${tradeId} not found.`);
        return;
      }
      const trade = tradeDocSnap.data() as Trade;
      const listingId = trade.listingId; // Get the associated listing ID
      const listingDocRef = doc(db, 'listings', listingId);

      // 2. Determine the new status for the listing based on the trade status
      let newListingStatus: 'available' | 'pending' | 'traded' = 'available'; // Default to available
      if (status === 'accepted') {
        newListingStatus = 'pending'; // Or 'pendingTrade', indicating it's no longer freely available
      } else if (status === 'completed') {
        newListingStatus = 'traded';
      } else if (status === 'declined' || status === 'cancelled') {
        newListingStatus = 'available'; // Make the listing available again
      }

      // 3. Add updates to the batch
      batch.update(tradeDocRef, {
        status: status,
        // Add timestamp for status update here if desired
        // When a trade is completed, enable reviews for both parties
        ...(status === 'completed' && { 
          canReviewRequester: true,
          canReviewOwner: true,
        }),
      });
      batch.update(listingDocRef, {
        status: newListingStatus
      });

      // 4. Commit the batch
      await batch.commit();

      console.log(`Trade request ${tradeId} status updated to ${status} and listing ${listingId} status updated to ${newListingStatus}.`);
      showAlert(`Trade request status updated to ${status}!`, 'success');

    } catch (error) {
      console.error(`Error updating trade status for ${tradeId} to ${status} or listing status:`, error);
      showAlert(`Failed to update trade status to ${status}.`, 'error');
      throw error; // Re-throw the error to be caught by accept/decline/cancelTrade
    }
  }, [currentUser, showAlert]);

  // Functions to manage trade requests
  const acceptTrade = useCallback(async (tradeId: string) => {
    // No additional logic needed here for status update, handled by updateTradeStatus
    await updateTradeStatus(tradeId, 'accepted');
    // Consider adding notifications or next steps here
  }, [updateTradeStatus]);

  const declineTrade = useCallback(async (tradeId: string) => {
    await updateTradeStatus(tradeId, 'declined');
  }, [updateTradeStatus]);

  const cancelTrade = useCallback(async (tradeId: string) => {
    await updateTradeStatus(tradeId, 'cancelled');
  }, [updateTradeStatus]);

  // Function to mark a trade as completed
  const completeTrade = useCallback(async (tradeId: string) => {
    await updateTradeStatus(tradeId, 'completed');
    // Consider adding logic here for reviews or final steps
  }, [updateTradeStatus]);

  const sendMessage = useCallback(async (messageThreadId: string, text: string) => {
    if (!currentUser || !currentUser.id) {
      showAlert('You must be logged in to send messages.', 'error');
      return;
    }
    if (!text.trim()) {
      showAlert('Message cannot be empty.', 'error');
      return;
    }

    try {
      let recipientId: string | null = null;

      // Try to fetch from trades collection first
      const tradeDocRef = doc(db, 'trades', messageThreadId);
      const tradeDocSnap = await getDoc(tradeDocRef);

      if (tradeDocSnap.exists()) {
      const trade = tradeDocSnap.data() as Trade;
        // Determine the other user's ID from the trade
        recipientId = trade.requesterId === currentUser.id ? trade.ownerId : trade.requesterId;
        console.log('Message thread found in trades collection.', trade);
      } else {
        // If not in trades, try to fetch from listing_message_threads
        const listingThreadDocRef = doc(db, 'listing_message_threads', messageThreadId);
        const listingThreadDocSnap = await getDoc(listingThreadDocRef);

        if (listingThreadDocSnap.exists()) {
          const listingThread = listingThreadDocSnap.data(); // Use data() as no specific type yet
           // Determine the other user's ID from the listing message thread
          recipientId = listingThread?.user1Id === currentUser.id ? listingThread?.user2Id : listingThread?.user1Id;
          console.log('Message thread found in listing_message_threads collection.', listingThread);
        } else {
          showAlert('Message thread not found.', 'error');
          console.error(`Message thread document ${messageThreadId} not found in either collection.`);
          return; // Exit if thread not found
        }
      }

      if (!recipientId) {
         console.error('Recipient ID could not be determined for message thread:', messageThreadId);
         showAlert('Could not determine message recipient.', 'error');
         return; // Exit if recipient cannot be determined
      }

      const messagesCollectionRef = collection(db, 'messages');
      const newMessage: Omit<Message, 'id'> = {
        tradeId: messageThreadId, // Use the generic messageThreadId
        senderId: currentUser.id,
        receiverId: recipientId, // The other user is the recipient
        text: text,
        createdAt: new Date().toISOString(),
        isRead: false, // New messages are unread by default for the recipient
      };

      await addDoc(messagesCollectionRef, newMessage);
      console.log('Message sent successfully to Firestore.');
      // The real-time listener in the modal will pick this up

    } catch (error) {
      console.error('Error sending message:', error);
      showAlert('Failed to send message.', 'error');
      throw error;
    }
  }, [currentUser, showAlert]);

  const subscribeToTradeMessages = useCallback((messageThreadId: string, onMessages: (messages: Message[]) => void) => {
    if (!messageThreadId) {
      console.error('Message Thread ID is required to subscribe to messages.');
      return () => {}; // Return empty unsubscribe
    }

    const messagesCollectionRef = collection(db, 'messages');
    const q = query(
      messagesCollectionRef,
      where('tradeId', '==', messageThreadId), // Messages are linked by the thread ID
      orderBy('createdAt', 'asc') // Order messages chronologically
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => {
        const message = doc.data() as Message;
        console.log(`subscribeToTradeMessages: Listener received message for thread ${messageThreadId}: ID=${doc.id}, Sender=${message.senderId}, Receiver=${message.receiverId}, IsRead=${message.isRead}`);
        return {
          ...message,
          id: doc.id,
        };
      });
      onMessages(messagesData);
    }, (error) => {
      console.error(`Error subscribing to messages for thread ${messageThreadId}:`, error);
      showAlert('Failed to load messages.', 'error');
    });

    // Return the unsubscribe function for cleanup
    return unsubscribe;
  }, [showAlert]); // Depend on showAlert

  // Real-time listener for new incoming trade requests
  useEffect(() => {
    if (!currentUser?.id) {
      setNewTradeRequestCount(0); // Reset count if no user is logged in
      return;
    }

    const q = query(
      collection(db, 'trades'),
      where('ownerId', '==', currentUser.id),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Filter out trades that were created by the current user (they shouldn't notify themselves)
      const incomingRequests = snapshot.docs.filter(doc => doc.data().requesterId !== currentUser.id);
      setNewTradeRequestCount(incomingRequests.length);
    });

    // Clean up the listener when the component unmounts or currentUser changes
    return () => unsubscribe();
  }, [currentUser?.id]); // Re-run effect when currentUser.id changes

  // Real-time listener for unread messages
  useEffect(() => {
    if (!currentUser?.id) {
      setUnreadMessageCount(0); // Reset count if no user is logged in
      return;
    }

    console.log(`Setting up unread message listener for user: ${currentUser.id}`);
    // Listen for messages where the current user is the receiver and message is not read
    const q = query(
      collection(db, 'messages'),
      where('receiverId', '==', currentUser.id),
      where('isRead', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log(`Unread message listener fired. Snapshot size: ${snapshot.size}`);
      setUnreadMessageCount(snapshot.size);
    });

    // Clean up the listener
    return () => unsubscribe();
  }, [currentUser?.id]); // Re-run effect when currentUser.id changes

  // Memoized function to fetch and combine message threads (trades and listing inquiries)
  const fetchAndCombineAcceptedTrades = useCallback(async () => {
    if (!currentUser?.id) {
      setMessageThreads([]); // Clear threads if no user is logged in
      return;
    }

    const tradesRef = collection(db, 'trades');
    // Query for accepted trades where the current user is either the owner or the requester
      try {
        const ownerQuery = query(
          tradesRef,
        where('status', 'in', ['accepted', 'completed']),
          where('ownerId', '==', currentUser.id)
        );
        const requesterQuery = query(
          tradesRef,
        where('status', 'in', ['accepted', 'completed']),
          where('requesterId', '==', currentUser.id)
        );

        const [ownerSnapshot, requesterSnapshot] = await Promise.all([
          getDocs(ownerQuery),
          getDocs(requesterQuery)
        ]);

        const acceptedTradesData = [
          ...ownerSnapshot.docs.map(doc => ({ ...doc.data() as Trade, id: doc.id })),
          ...requesterSnapshot.docs.map(doc => ({ ...doc.data() as Trade, id: doc.id })),
        ];

        // Deduplicate trades if any trade satisfies both conditions (shouldn't happen with ownerId/requesterId)
        const uniqueTrades = Array.from(new Map(acceptedTradesData.map(trade => [trade.id, trade])).values());

      // --- Fetch Listing Message Threads ---
      const listingMessageThreadsRef = collection(db, 'listing_message_threads');

      // Query for threads where current user is user1
      const user1Query = query(
        listingMessageThreadsRef,
        where('user1Id', '==', currentUser.id)
      );
      // Query for threads where current user is user2
      const user2Query = query(
        listingMessageThreadsRef,
        where('user2Id', '==', currentUser.id)
      );

      const [user1Snapshot, user2Snapshot] = await Promise.all([
        getDocs(user1Query),
        getDocs(user2Query)
      ]);

      const listingMessageThreadsData = [
        ...user1Snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })),
        ...user2Snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })),
      ];

       // Deduplicate threads if necessary (though user1/user2 structure should prevent this)
      const uniqueListingThreads = Array.from(new Map(listingMessageThreadsData.map(thread => [thread.id, thread])).values());
      
      // --- Combine Trades and Listing Message Threads ---
      // Use a Map to group threads by the pair of user IDs involved, keeping the most recent one
      const consolidatedThreadsMap = new Map<string, MessageThread>();

      uniqueTrades.forEach(trade => {
          const otherUserId = trade.ownerId === currentUser.id ? trade.requesterId : trade.ownerId;
          // Create a unique key for the user pair (sorted IDs to ensure consistency)
          const userPairKey = [currentUser.id, otherUserId].sort().join('_');

          const thread: MessageThread = {
              ...trade,
              id: trade.id,
              type: 'trade',
              listingId: trade.listingId,
              user1Id: trade.requesterId, // In a trade, requester is user1
              user2Id: trade.ownerId,     // In a trade, owner is user2
              createdAt: trade.createdAt,
              // lastMessage and unreadMessageCountForThread will be added later
          };

          const existingThread = consolidatedThreadsMap.get(userPairKey);
          // Add the current trade thread if no thread exists for this pair, or if the current trade is newer
           if (!existingThread || new Date(thread.createdAt).getTime() > new Date(existingThread.createdAt).getTime()) {
               consolidatedThreadsMap.set(userPairKey, thread);
           }
      });

      uniqueListingThreads.forEach(threadDocSnap => {
           // threadDocSnap is already the data object, including the id property
           const threadData = threadDocSnap as { listingId: string, user1Id: string, user2Id: string, createdAt: string, id: string }; // Cast data for better type safety, including id
           const otherUserId = threadData.user1Id === currentUser.id ? threadData.user2Id : threadData.user1Id;
           // Create a unique key for the user pair
           const userPairKey = [currentUser.id, otherUserId].sort().join('_');

           const existingThread = consolidatedThreadsMap.get(userPairKey);
           // Add the current listing inquiry thread only if no thread exists for this pair, or if the current listing inquiry is newer
            if (!existingThread || new Date(threadData.createdAt).getTime() > new Date(existingThread.createdAt).getTime()) {
                const thread: MessageThread = {
                   id: threadDocSnap.id,
                   type: 'listing_inquiry',
                   listingId: threadData.listingId,
                   user1Id: threadData.user1Id,
                   user2Id: threadData.user2Id,
                   // Assign values for inherited Trade properties (required by MessageThread interface)
                   requesterId: threadData.user1Id, // User who initiated inquiry
                   ownerId: threadData.user2Id, // User who owns the listing
                   status: 'inquiry', // Use 'inquiry' status for listing threads
                   createdAt: threadData.createdAt,
                     // lastMessage and unreadMessageCountForThread will be added later
                };
                consolidatedThreadsMap.set(userPairKey, thread);
            }
      });

      // Fetch related listing and user data for ALL threads
        const allListingIds = new Set<string>();
        const allUserIds = new Set<string>();

      // Convert map values to array and iterate
      const allThreadInfos = Array.from(consolidatedThreadsMap.values());
      allThreadInfos.forEach(thread => {
          allListingIds.add(thread.listingId);
          // Add the other user's ID to the set for fetching
          if (thread.type === 'trade') {
               allUserIds.add(thread.ownerId === currentUser.id ? thread.requesterId : thread.ownerId);
           } else if (thread.type === 'listing_inquiry') {
               const otherUserId = thread.user1Id === currentUser.id ? thread.user2Id : thread.user1Id;
               if (otherUserId) { // Ensure otherUserId is defined
                   allUserIds.add(otherUserId);
               }
           }
          // For trades, also add the offered listing ID if it exists
          // Need to find the original trade from the uniqueTrades list to get offeredListingId reliably
          if (thread.type === 'trade') {
               const originalTrade = uniqueTrades.find(t => t.id === thread.id);
               if (originalTrade?.offeredListingId) {
                   allListingIds.add(originalTrade.offeredListingId);
               }
           }
        });

        const fetchedListingsMap: Record<string, BeanListing> = {};
        if (allListingIds.size > 0) {
             for (const listingId of Array.from(allListingIds)) {
                 const listingDocRef = doc(db, 'listings', listingId);
                 const listingDocSnap = await getDoc(listingDocRef);
                 if (listingDocSnap.exists()) {
                     fetchedListingsMap[listingId] = { ...listingDocSnap.data() as BeanListing, id: listingDocSnap.id };
                 }
             }
         }

        const fetchedUsersMap: Record<string, User> = {};
         if (allUserIds.size > 0) {
              for (const userId of Array.from(allUserIds)) {
                 const userDocRef = doc(db, 'users', userId);
                 const userDocSnap = await getDoc(userDocRef);
                 if (userDocSnap.exists()) {
                     fetchedUsersMap[userId] = { ...userDocSnap.data() as User, id: userDocSnap.id };
                 }
             }
         }

        // Combine thread info with fetched listing and user data
        const combinedMessageThreads = allThreadInfos.map(threadInfo => {
             // threadInfo is already a MessageThread object from the consolidation step
             // Now populate with fetched data
             // Determine the other user's ID based on the thread type
             const otherUserId = threadInfo.type === 'trade'
                 ? (threadInfo.ownerId === currentUser.id ? threadInfo.requesterId : threadInfo.ownerId)
                 : (threadInfo.user1Id === currentUser.id ? threadInfo.user2Id : threadInfo.user1Id);
             
             return {
                 ...threadInfo,
                 requestedListing: fetchedListingsMap[threadInfo.listingId],
                 // Populate offeredListing only if it's a trade and the ID exists
                 // Use threadInfo.offeredListingId which should be present if it was a trade originally
                 offeredListing: threadInfo.type === 'trade' && threadInfo.offeredListingId
                     ? fetchedListingsMap[threadInfo.offeredListingId] : undefined,
                 // Populate otherUser using the determined otherUserId from the map
                 otherUser: (otherUserId && fetchedUsersMap[otherUserId]) ? fetchedUsersMap[otherUserId] : undefined, // Ensure otherUser is fetched and exists
                 // lastMessage and unreadMessageCountForThread will be fetched next
             } as MessageThread; // Cast to the new interface
        });

        // Now, fetch the last message and unread status for each thread
        const enrichedThreadsPromises = combinedMessageThreads.map(async (thread) => {
           const messagesRef = collection(db, 'messages');

           // Query for the latest message in this thread (using thread.id as tradeId in messages collection)
           const lastMessageQuery = query(
              messagesRef,
              where('tradeId', '==', thread.id), // Messages still link via tradeId/threadId
              orderBy('createdAt', 'desc'),
              limit(1)
           );
           const lastMessageSnapshot = await getDocs(lastMessageQuery);
           const lastMessage = lastMessageSnapshot.docs.length > 0 ? { ...lastMessageSnapshot.docs[0].data() as Message, id: lastMessageSnapshot.docs[0].id } : undefined;

           // Query for unread messages for the current user in this thread
           const unreadMessagesQuery = query(
              messagesRef,
              where('tradeId', '==', thread.id), // Messages still link via tradeId/threadId
              where('receiverId', '==', currentUser.id),
              where('isRead', '==', false)
           );
           const unreadMessagesSnapshot = await getDocs(unreadMessagesQuery);
           // *** NEW: Calculate unread count for THIS specific thread ***
           const unreadMessageCountForTrade = unreadMessagesSnapshot.size;

           return {
              ...thread,
              lastMessage,
              unreadMessageCountForThread: unreadMessageCountForTrade,
           };
        });

        // Filter out any threads where otherUser could not be determined before enriching
        const validCombinedMessageThreads = combinedMessageThreads.filter(thread => thread.otherUser !== undefined);
        const enrichedThreadsPromisesValid = validCombinedMessageThreads.map(async (thread) => {
            const messagesRef = collection(db, 'messages');

            // Query for the latest message in this thread (using thread.id as tradeId in messages collection)
            const lastMessageQuery = query(
                messagesRef,
                where('tradeId', '==', thread.id), // Messages still link via tradeId/threadId
                orderBy('createdAt', 'desc'),
                limit(1)
            );
            const lastMessageSnapshot = await getDocs(lastMessageQuery);
            const lastMessage = lastMessageSnapshot.docs.length > 0 ? { ...lastMessageSnapshot.docs[0].data() as Message, id: lastMessageSnapshot.docs[0].id } : undefined;

            // Query for unread messages for the current user in this thread
            const unreadMessagesQuery = query(
                messagesRef,
                where('tradeId', '==', thread.id), // Messages still link via tradeId/threadId
                where('receiverId', '==', currentUser.id),
                where('isRead', '==', false)
            );
            const unreadMessagesSnapshot = await getDocs(unreadMessagesQuery);
            // *** NEW: Calculate unread count for THIS specific thread ***
           const unreadMessageCountForTrade = unreadMessagesSnapshot.size;

           return {
                ...thread,
              lastMessage,
                unreadMessageCountForThread: unreadMessageCountForTrade,
           };
        });

        const enrichedThreads = await Promise.all(enrichedThreadsPromisesValid);

        console.log('AppContext: Final enriched message threads:', enrichedThreads);
        // Sort threads by the createdAt of the last message (most recent first)
        // If a thread has no messages, sort it by the thread's createdAt date.
        enrichedThreads.sort((a, b) => {
           // Sort by the creation date of the last message, or the thread creation date if no messages
           const dateA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
           const dateB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
           return dateB - dateA; // Sort descending
        });

        setMessageThreads(enrichedThreads); // Update the new state variable

      } catch (error) {
        console.error('Error fetching accepted trades for messaging:', error);
        setMessageThreads([]);
        // Optionally show an alert, but might be annoying in a real-time listener
        // showAlert('Failed to load message threads.', 'error');
      }
  }, [currentUser?.id, showAlert]);

  // Real-time listener for accepted trades and listing message threads to trigger re-fetch
  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    const tradesRef = collection(db, 'trades');
    const listingMessageThreadsRef = collection(db, 'listing_message_threads');

    // Listener for trades (owner or requester, accepted or completed status)
    const ownerTradesQuery = query(
        tradesRef,
        where('status', 'in', ['accepted', 'completed']),
        where('ownerId', '==', currentUser.id)
      );
    const requesterTradesQuery = query(
        tradesRef,
        where('status', 'in', ['accepted', 'completed']),
        where('requesterId', '==', currentUser.id)
      );

    // Listener for listing message threads (user1 or user2)
    const user1ListingThreadsQuery = query(
        listingMessageThreadsRef,
        where('user1Id', '==', currentUser.id)
    );
    const user2ListingThreadsQuery = query(
        listingMessageThreadsRef,
        where('user2Id', '==', currentUser.id)
    );

    const unsubscribeOwnerTrades = onSnapshot(ownerTradesQuery, (snapshot) => {
        console.log('Owner trades listener triggered.');
         // Trigger the combined fetch when owner trades change
         fetchAndCombineAcceptedTrades();
    }, (error) => {
         console.error('Error in owner trades listener:', error);
      });

     const unsubscribeRequesterTrades = onSnapshot(requesterTradesQuery, (snapshot) => {
        console.log('Requester trades listener triggered.');
         // Trigger the combined fetch when requester trades change
         fetchAndCombineAcceptedTrades();
    }, (error) => {
         console.error('Error in requester trades listener:', error);
    });

     const unsubscribeUser1ListingThreads = onSnapshot(user1ListingThreadsQuery, (snapshot) => {
        console.log('User1 listing threads listener triggered.');
         // Trigger the combined fetch when user1 listing threads change
         fetchAndCombineAcceptedTrades();
    }, (error) => {
        console.error('Error in user1 listing threads listener:', error);
    });

    const unsubscribeUser2ListingThreads = onSnapshot(user2ListingThreadsQuery, (snapshot) => {
        console.log('User2 listing threads listener triggered.');
        // Trigger the combined fetch when user2 listing threads change
        fetchAndCombineAcceptedTrades();
    }, (error) => {
        console.error('Error in user2 listing threads listener:', error);
    });

    // Clean up all listeners
    return () => {
        unsubscribeOwnerTrades();
        unsubscribeRequesterTrades();
        unsubscribeUser1ListingThreads();
        unsubscribeUser2ListingThreads();
    };

  }, [currentUser?.id, fetchAndCombineAcceptedTrades]); // Depend on currentUser.id and the memoized fetch function

  // Real-time listener for new reviews received by the current user
  useEffect(() => {
    if (!currentUser?.id) {
      latestReviewsSnapshot.current = null; // Reset snapshot when user logs out
      return;
    }

    console.log(`Setting up new review listener for user: ${currentUser.id}`);
    const reviewsCollectionRef = collection(db, 'reviews');
    const q = query(
      reviewsCollectionRef,
      where('revieweeId', '==', currentUser.id),
      orderBy('createdAt', 'desc') // Order to help identify new ones at the top/end (though snapshot changes are key)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('New review listener fired.');
      if (latestReviewsSnapshot.current) {
        // Compare current snapshot to the previous one to find new documents
        const newReviews = snapshot.docs.filter(doc =>
          !latestReviewsSnapshot.current?.docs.some((prevDoc: DocumentData) => prevDoc.id === doc.id)
        );

        newReviews.forEach(newReviewDoc => {
          const newReview = newReviewDoc.data() as Review;
          // Fetch the reviewer's name for the notification
          const reviewerId = newReview.reviewerId;
          // We might already have the reviewer in fetchedUsersMap in other listeners
          // but for a dedicated notification, a separate fetch or checking a global users state might be needed.
          // For simplicity now, let's just use the reviewerId or a generic message.
          const notificationMessage = `You received a new review!`; // Or fetch reviewer name
          showAlert(notificationMessage, 'info'); // Use info type for notification
        });
      }
      // Update the latest snapshot to the current one
      latestReviewsSnapshot.current = snapshot;

    }, (error) => {
      console.error('Error subscribing to new reviews:', error);
      // showAlert('Failed to subscribe to new reviews.', 'error'); // Avoid too many alerts
    });

    // Clean up the listener
    return () => unsubscribe();

  }, [currentUser?.id, showAlert]); // Depend on currentUser and showAlert

  // Function to mark all unread messages for a given trade as read
  const markMessagesAsRead = useCallback(async (messageThreadId: string) => {
    if (!currentUser?.id) {
      console.error('User not logged in. Cannot mark messages as read.');
      return;
    }

    if (!messageThreadId) {
      console.error('Message Thread ID is required to mark messages as read.');
      return;
    }

    console.log(`Attempting to mark messages for message thread ${messageThreadId} as read for user ${currentUser.id}`);

    const messagesRef = collection(db, 'messages');
    // Query for unread messages in this message thread where the current user is the receiver
    const q = query(
      messagesRef,
      where('tradeId', '==', messageThreadId), // Messages are linked by the thread ID
      where('receiverId', '==', currentUser.id),
      where('isRead', '==', false) // Only get unread messages
    );

    try {
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);

      querySnapshot.forEach((docSnap) => {
        // For each unread message found, add an update operation to the batch
        batch.update(docSnap.ref, { isRead: true });
        console.log(`Adding message ${docSnap.id} to batch for marking as read.`);
      });

      if (querySnapshot.size > 0) {
        await batch.commit();
        console.log(`Successfully marked ${querySnapshot.size} messages for message thread ${messageThreadId} as read.`);
        // The unread message count listener should automatically update
        // Additionally, trigger a refresh of message threads to update per-thread unread counts in the UI
        fetchAndCombineAcceptedTrades(); // Call the function to refresh the messageThreads state
        // Manually update the total unread count state as the listener might have a delay
        setUnreadMessageCount(prevCount => Math.max(0, prevCount - querySnapshot.size));
      } else {
        console.log(`No unread messages found for message thread ${messageThreadId} for user ${currentUser.id}.`);
      }

    } catch (error) {
      console.error(`Error marking messages for message thread ${messageThreadId} as read:`, error);
      showAlert('Failed to update message read status.', 'error');
    }
  }, [currentUser?.id, showAlert, fetchAndCombineAcceptedTrades]);

  return (
    <AppContext.Provider value={{ 
        currentUser, users, listings, trades, newTradeRequestCount, unreadMessageCount, alert,
        messageThreads,
        setCurrentUser: handleSetCurrentUser, 
        updateUserProfile,
        addListing, 
        addReview,
        addTrade,
        acceptTrade,
        declineTrade,
        cancelTrade,
        completeTrade,
        sendMessage,
        subscribeToTradeMessages,
        markMessagesAsRead,
        showAlert,
        hideAlert
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
