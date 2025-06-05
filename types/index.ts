export enum RoastProfile {
  LIGHT = 'Light',
  MEDIUM = 'Medium',
  DARK = 'Dark',
}

export interface FlavorProfile {
  id: string;
  name: string;
}

export interface User {
  id: string;
  uid: string; // Add Firebase Auth UID
  email: string;
  name: string;
  avatarUrl: string;
  location: string;
  bio: string;
  preferredRoasts: RoastProfile[];
  favoriteFlavors: FlavorProfile[];
  averageRating?: number; // Add average rating to the User interface
  // ratings: Review[]; // Added to User later in AppContext
}

export interface BeanListing {
  id: string;
  userId: string; // ID of the user who listed the beans
  name: string;
  origin: string;
  roast: RoastProfile;
  flavorNotes: string; // Could be comma-separated or a longer description
  description?: string; // Make description optional as requested earlier
  quantity: string; // e.g., "250g", "1lb"
  imageUrl?: string | null; // Allow for a string, null, or undefined
  tradeOrGiveaway: 'trade' | 'giveaway';
  createdAt: string; // ISO Date string
  status: 'available' | 'traded' | 'given_away';
  roaster?: string;
  boughtFrom?: string;
  roastedDate?: string; // ISO date string
  processingMethod?: string; // e.g., "Washed", "Natural"
  elevation?: string; // e.g., "1800 masl"
  varietal?: string; // e.g., "Gesha", "Bourbon"
  acidity?: string; // e.g., "High", "Citric"
  body?: string; // e.g., "Full", "Creamy"
  tastingNotes?: string; // A more detailed description of flavors
  isDecaf?: boolean; // Whether the coffee is decaffeinated
}

export interface Review {
  id: string;
  reviewerId: string;
  revieweeId: string;
  listingId?: string; // Optional, if review is about a specific listing (maybe less common now)
  tradeId?: string; // Optional: Link to the trade this review is associated with
  rating: number; // 1-5
  comment: string;
  createdAt: string; // ISO Date string
  reviewer?: User; // Add optional reviewer user data
  tags?: string[]; // Add optional array of strings for review tags
  reviewedListing?: BeanListing; // Add optional reviewedListing data
  trade?: Trade; // Add optional trade data
}

export interface Trade {
  id: string;
  listingId: string;
  requesterId: string; // User who wants the beans
  ownerId: string; // User who listed the beans
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled' | 'inquiry';
  createdAt: string; // ISO Date string
  offeredListingId?: string; // Optional: The ID of the bean listing the requester is offering in trade
  // Flags to indicate if users can leave a review after completion
  canReviewRequester?: boolean;
  canReviewOwner?: boolean;
  // Potential items offered in trade, etc. For simplicity, not detailed here.
  buyerId?: string; // Add buyerId
  sellerId?: string; // Add sellerId
}

export interface AppAlert {
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface Message {
  id: string;
  tradeId: string; // Link to the trade conversation
  senderId: string; // User who sent the message
  receiverId: string; // User who receives the message (can be inferred from trade, but explicit might be useful)
  text: string;
  createdAt: string; // ISO Date string;
  isRead: boolean; // Indicates if the recipient has read the message
}

// Interface for trades with populated details for display
export interface TradeRequestWithDetails extends Trade {
  requestedListing?: BeanListing;
  offeredListing?: BeanListing;
  otherUser?: User;
  unreadMessageCountForTrade?: number; // Add unread message count for this specific trade
  lastMessage?: Message; // Add last message for display in dropdown
}

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