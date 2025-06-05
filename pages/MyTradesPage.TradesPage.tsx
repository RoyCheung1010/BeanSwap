import React, { useCallback } from 'react';

const handleCloseMessageModal = () => {
  setSelectedTradeForModal(null);
  setIsMessageModalOpen(false);
  setMessageUpdateTrigger(prev => prev + 1); // Increment to trigger message data refresh
};

// Fetch user's trade requests (incoming and outgoing)
const fetchMyTrades = useCallback(async () => {
  // Implementation of fetchMyTrades
}, []);

return (
  // Rest of the component code
); 