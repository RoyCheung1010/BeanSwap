import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { UserIcon, MenuIcon, XIcon, PlusCircleIcon, SearchIcon, UserCircleIcon, MailIcon } from './Icons'; // Import MailIcon
import { getAuth, signOut } from 'firebase/auth'; // Import Firebase auth and signOut
import { auth } from '../src/firebase'; // Import Firebase auth instance and fix the path
import TradeMessageModal from './TradeMessageModal'; // Import the message modal component
import { TradeRequestWithDetails } from '../types'; // Import the interface

const Navbar: React.FC = () => {
  const { currentUser, setCurrentUser, showAlert, newTradeRequestCount, unreadMessageCount, messageThreads, markMessagesAsRead } = useAppContext(); // Include messageThreads and markMessagesAsRead
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [isMessageDropdownOpen, setIsMessageDropdownOpen] = useState(false); // State for message dropdown
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false); // State for message modal
  const [selectedTradeForModal, setSelectedTradeForModal] = useState<TradeRequestWithDetails | null>(null); // State to hold trade data for modal
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false); // State for user dropdown
  const [navbarSearchTerm, setNavbarSearchTerm] = useState(''); // State for search input in navbar

  // Ref for the user dropdown to handle clicks outside
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null); // Clear user in AppContext
      showAlert('Logged out successfully.', 'success');
      navigate('/login'); // Redirect to login page after logout
    } catch (error: any) {
      showAlert(`Logout failed: ${error.message}`, 'error');
      console.error('Logout Error:', error);
    }
  };
  
  const navLinkClasses = "text-coffee-extralight hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors relative";
  const mobileNavLinkClasses = "block text-coffee-primary hover:bg-coffee-light px-3 py-2 rounded-md text-base font-medium transition-colors relative";

  // Function to open the message modal
  const handleOpenMessageModal = (trade: TradeRequestWithDetails) => {
    setSelectedTradeForModal(trade);
    setIsMessageModalOpen(true);
    setIsMessageDropdownOpen(false); // Close dropdown when modal opens
  };

  // Function to close the message modal
  const handleCloseMessageModal = () => {
    setSelectedTradeForModal(null);
    setIsMessageModalOpen(false);
    // We might want to refresh message data here later if needed, but listener handles most updates
  };

  return (
    <nav className="bg-coffee-primary shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-white font-['Playfair_Display']">
              BeanSwap
            </Link>
          </div>
          {/* Centered Navigation Links */}
          <div className="hidden md:flex items-center justify-center flex-grow space-x-4">
            <Link to="/listings" className={navLinkClasses}><SearchIcon className="inline-block w-5 h-5 mr-1"/>Browse Beans</Link>
            {currentUser && (
              <>
                <Link to="/add-listing" className={navLinkClasses}><PlusCircleIcon className="inline-block w-5 h-5 mr-1"/>Add Beans</Link>
                <Link to="/my-trades" className={navLinkClasses}>
                  <UserIcon className="inline-block w-5 h-5 mr-1"/>My Trades
                  {newTradeRequestCount > 0 && (
                    <span className="absolute top-[-4px] right-[-4px] inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-coffee-secondary rounded-full">
                      {newTradeRequestCount}
                    </span>
                  )}
                </Link>
              </>
            )}
          </div>
          {/* Right-aligned Icons/Dropdowns */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Navbar Search Bar */}
          <div className="flex items-center">
              <input
                type="text"
                placeholder="Search..."
                className="px-2 py-1 w-40 rounded-md border-gray-300 shadow-sm focus:border-coffee-secondary focus:ring focus:ring-coffee-secondary focus:ring-opacity-50 text-gray-800 text-sm"
                value={navbarSearchTerm}
                onChange={(e) => setNavbarSearchTerm(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    navigate(`/listings?search=${encodeURIComponent(navbarSearchTerm)}`);
                    // Optional: Clear search term after navigating
                    // setNavbarSearchTerm('');
                  }
                }}
              />
              <button
                onClick={() => navigate(`/listings?search=${encodeURIComponent(navbarSearchTerm)}`)}
                className="ml-1 p-1 rounded-md text-coffee-extralight hover:text-white focus:outline-none"
              >
                <SearchIcon className="w-5 h-5"/>
              </button>
            </div> {/* End Navbar Search Bar */}

            {/* Message Icon and Dropdown */}
            {currentUser && (
              <div className="relative">
                <button
                  onClick={() => setIsMessageDropdownOpen(!isMessageDropdownOpen)}
                  className={`${navLinkClasses} focus:outline-none`}
                >
                  <MailIcon className="inline-block w-5 h-5"/>
                  {unreadMessageCount > 0 && (
                    <span className="absolute top-[-4px] right-[-4px] inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-coffee-secondary rounded-full">
                      {unreadMessageCount}
                    </span>
                  )}
                </button>
                {/* Message dropdown content */}
                {isMessageDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1 max-h-60 overflow-y-auto" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                      {messageThreads.length > 0 ? (
                        messageThreads.map(thread => (
                          <button
                            key={thread.id}
                            onClick={() => {
                              console.log('Navbar: Opening message modal for thread:', thread);
                              handleOpenMessageModal(thread as any);
                              markMessagesAsRead(thread.id);
                            }}
                            className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150 focus:outline-none"
                            role="menuitem"
              >
                            <div className="flex items-center">
                              {thread.otherUser?.avatarUrl && (
                                <img src={thread.otherUser.avatarUrl} alt={thread.otherUser.name || 'User Avatar'} className="w-8 h-8 rounded-full mr-2 object-cover" />
                              )}
                              <div>
                                <p className="font-semibold">{thread.otherUser?.name || '[Unknown User]'}</p>
                                <p className={`text-xs ${(thread.unreadMessageCountForThread ?? 0) > 0 ? 'text-coffee-dark font-medium' : 'text-gray-500'}`}>
                                   {thread.lastMessage?.text || thread.requestedListing?.name || '[Deleted Listing]'}
                                </p>
                              </div>
                              {/* Unread message count badge per trade */}
                              {(thread.unreadMessageCountForThread ?? 0) > 0 && (
                                <span className="ml-auto inline-flex items-center justify-center px-2 py-[1px] text-xs font-bold leading-none text-white bg-coffee-secondary rounded-full mt-[-1px]">
                                  {thread.unreadMessageCountForThread}
                                </span>
                              )}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="block px-4 py-2 text-sm text-gray-500">No active message threads.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Dropdown Trigger */}
            <div className="relative" ref={userDropdownRef}> {/* Add ref here */}
              {currentUser ? (
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className={`${navLinkClasses} flex items-center focus:outline-none`}
                >
                  <UserCircleIcon className="w-5 h-5 mr-1" /> Hello, {currentUser.name?.split(' ')[0]} {/* Add optional chaining */}
                </button>
              ) : (
                <div className="flex space-x-4">
                  <Link to="/login" className={navLinkClasses}>Login</Link>
                  <Link to="/signup" className={navLinkClasses}>Sign Up</Link>
                </div>
              )}
              {/* User dropdown content */}
              {isUserDropdownOpen && currentUser && (
                 <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                   <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="user-menu">
                     <Link
                       to={`/profile/${currentUser.id}`}
                       className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                       role="menuitem"
                       onClick={() => setIsUserDropdownOpen(false)}
                     >
                       <UserIcon className="inline-block w-4 h-4 mr-2" /> Profile
                     </Link>
                     <div className="border-t border-gray-100"></div>
                     <button
                       onClick={() => { handleLogout(); setIsUserDropdownOpen(false); }}
                       className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                       role="menuitem"
                     >
                       <UserIcon className="inline-block w-4 h-4 mr-2" /> Log Out
                     </button>
                   </div>
                 </div>
               )}
            </div>
            </div>
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-coffee-extralight hover:text-white focus:outline-none"
              >
                {mobileMenuOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
              </button>
          </div>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden bg-coffee-extralight shadow-md">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link to="/listings" className={mobileNavLinkClasses} onClick={() => setMobileMenuOpen(false)}>Browse Beans</Link>
            {currentUser ? (
              <>
                <Link to="/add-listing" className={mobileNavLinkClasses} onClick={() => setMobileMenuOpen(false)}>Add Beans</Link>
                <Link to="/my-trades" className={mobileNavLinkClasses} onClick={() => setMobileMenuOpen(false)}>
                  My Trades
                  {newTradeRequestCount > 0 && (
                     <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-coffee-secondary rounded-full">
                       {newTradeRequestCount}
                     </span>
                   )}
                </Link>
                <Link to={`/profile/${currentUser.id}`} className={`${mobileNavLinkClasses}`} onClick={() => setMobileMenuOpen(false)}>
                  My Profile
                </Link>
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className={mobileNavLinkClasses + ' w-full text-left'}
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={mobileNavLinkClasses} onClick={() => setMobileMenuOpen(false)}>Login</Link>
                <Link to="/signup" className={mobileNavLinkClasses} onClick={() => setMobileMenuOpen(false)}>Sign Up</Link>
              </>
            )}
          </div>
        </div>
      )}
      {/* Render the Message Modal */}
      {isMessageModalOpen && selectedTradeForModal && (
        <TradeMessageModal
          isOpen={isMessageModalOpen}
          onClose={handleCloseMessageModal}
          messageThread={selectedTradeForModal as any}
        />
      )}
    </nav>
  );
};

export default Navbar;
