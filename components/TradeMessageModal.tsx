import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { useAppContext } from '../context/AppContext';
import { Message, User, MessageThread } from '../types';
import { PaperAirplaneIcon } from './Icons';
import LoadingSpinner from './LoadingSpinner';

interface TradeMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageThread: MessageThread; // The message thread object containing all necessary info
  onMessagesRead?: () => void; // Optional callback to run after messages are marked as read
}

const TradeMessageModal: React.FC<TradeMessageModalProps> = ({
  isOpen,
  onClose,
  messageThread,
  onMessagesRead
}) => {
  const { currentUser, sendMessage, subscribeToTradeMessages, showAlert, markMessagesAsRead } = useAppContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(true); // Add loading state
  const messagesEndRef = useRef<HTMLDivElement>(null); // For auto-scrolling

  useEffect(() => {
    if (!isOpen || !messageThread) {
      setMessages([]); // Clear messages when modal is closed or trade is null
      return;
    }

    setIsLoadingMessages(true); // Set loading to true before fetching
    // Subscribe to messages for the current trade
    const unsubscribe = subscribeToTradeMessages(messageThread.id, (fetchedMessages) => {
      console.log(`TradeMessageModal: Received messages for thread ${messageThread.id}`, fetchedMessages);
      setMessages(fetchedMessages);
      setIsLoadingMessages(false); // Set loading to false after messages are fetched
    });

    // Mark messages as read when the modal opens for a trade
    markMessagesAsRead(messageThread.id);

    // Unsubscribe when the modal is closed or the component unmounts
    return () => {
      unsubscribe();
      setIsLoadingMessages(false); // Also set loading to false on unsubscribe/cleanup
    };
  }, [isOpen, messageThread?.id, subscribeToTradeMessages]); // Re-run effect if modal opens/closes or thread changes

  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]); // Scroll when messages change

  // Mark messages as read when the modal is opened
  useEffect(() => {
    if (isOpen && messageThread?.id && currentUser) {
      markMessagesAsRead(messageThread.id);
      // Call the optional callback after marking messages as read
      if (onMessagesRead) {
        onMessagesRead();
      }
    } else if (!isOpen) {
      // When the modal closes, clear the messageThreadId and otherUserForMessaging in the parent component
      // This is handled by the onClose prop in the parent, but good to consider if state was held locally.
      // No action needed here as state is managed by the parent (ListingDetailPage/TradeManagementPage)
    }
  }, [isOpen, messageThread?.id, currentUser, markMessagesAsRead, onMessagesRead]); // Add onMessagesRead to dependencies

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !messageThread?.id) return;

    try {
      await sendMessage(messageThread.id, newMessageText);
      setNewMessageText(''); // Clear input after sending
    } catch (error) {
      console.error('Failed to send message:', error);
      showAlert('Failed to send message.', 'error');
    }
  };

  // Render the modal only if a messageThread is provided
  if (!messageThread) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Messages with ${messageThread.otherUser?.name || '[Unknown User]'}`}>
      <div className="flex flex-col h-96">
        {/* Message Display Area */}
        <div className="flex-1 overflow-y-auto p-4 border-b border-gray-200 space-y-4">
          {isLoadingMessages ? (
            <div className="flex justify-center items-center h-full">
              <LoadingSpinner />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500">No messages yet. Start the conversation!</div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderId === currentUser?.id ? 'justify-end' : 'justify-start'}`}
              >
                {message.senderId !== currentUser?.id && messageThread.otherUser && (
                   <img src={messageThread.otherUser.avatarUrl} alt={messageThread.otherUser.name || 'User Avatar'} className="w-8 h-8 rounded-full object-cover mr-3" />
                )}
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg shadow-md flex flex-col ${message.senderId === currentUser?.id ? 'bg-coffee-primary text-white items-end' : 'bg-gray-200 text-gray-800 items-start'}`}
                >
                  <p className="text-sm mb-1">{message.text}</p>
                   <p className="text-xs opacity-75">{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                {message.senderId === currentUser?.id && currentUser && (
                   <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover ml-3" />
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} /> {/* Element to scroll to */}
        </div>

        {/* Message Input Area */}
        <form onSubmit={handleSendMessage} className="flex p-4">
          <input
            type="text"
            value={newMessageText}
            onChange={(e) => setNewMessageText(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-coffee-primary focus:border-coffee-primary"
          />
          <button
            type="submit"
            disabled={!newMessageText.trim()}
            className="bg-coffee-primary hover:bg-coffee-secondary text-white font-semibold py-2 px-4 rounded-r-md transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
          >
             <PaperAirplaneIcon className="w-5 h-5"/>
          </button>
        </form>
      </div>
    </Modal>
  );
};

export default TradeMessageModal; 