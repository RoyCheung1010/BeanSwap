import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import BeanCard from '../components/BeanCard';
import { BeanListing, RoastProfile, User } from '../types';
import { ROAST_OPTIONS, GEMINI_API_KEY_INFO, FLAVOR_PROFILES_OPTIONS } from '../constants';
import { FilterIcon, SearchIcon } from '../components/Icons';
import LoadingSpinner from '../components/LoadingSpinner';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from '../src/firebase';
import { useLocation } from 'react-router-dom';

// Define some common coffee processing methods for filtering
const PROCESSING_METHOD_OPTIONS = [
  'Washed',
  'Natural',
  'Honey',
  'Anaerobic',
  'Semi-Washed',
  'Wet-Hulled',
  'Dry Process',
  'Pulp Natural',
  'Wet-Milled',
];

// Define some common coffee varietals for filtering
const VARIETAL_OPTIONS = [
  'Arabica',
  'Robusta',
  'Gesha / Geisha',
  'Typica',
  'Bourbon',
  'Caturra',
  'Pacamara',
  'SL-28',
  'SL-34',
  'Catuai',
  'Castillo',
  'Mundo Novo',
  'Other',
];

// Define some common quantity ranges for filtering
const QUANTITY_OPTIONS = [
  'Under 250g',
  '250g - 500g',
  '500g - 1kg',
  '1kg+',
];

// Define options for Decaf Status filter
const DECAF_STATUS_OPTIONS = [
  'Any',
  'Yes',
  'No',
];

// Define some common acidity options for filtering
const ACIDITY_OPTIONS = [
  'Low',
  'Medium',
  'High',
];

// Define some common body options for filtering
const BODY_OPTIONS = [
  'Light',
  'Medium',
  'Full',
];

// Define some basic coffee origin options for filtering
const ORIGIN_OPTIONS = [
  'Africa', // Broader regions
  'Central America',
  'South America',
  'Asia',
  'Ethiopia', // Specific countries
  'Colombia',
  'Brazil',
  'Kenya',
  'Guatemala',
  'Costa Rica',
  'Indonesia',
];

// Define options for Seller Rating filter
const SELLER_RATING_OPTIONS = [
  { value: 5, label: '5 Stars' },
  { value: 4, label: '4+ Stars' },
  { value: 3, label: '3+ Stars' },
  { value: 2, label: '2+ Stars' },
  { value: 1, label: '1+ Stars' },
  // Consider adding 'No Reviews' option later
];

// Define common roast date range options for filtering
const ROAST_DATE_OPTIONS = [
  'Any',
  'Within 1 Week',
  'Within 1 Month',
  'More than 1 Month Ago',
];

const ListingsPage: React.FC = () => {
  const { showAlert } = useAppContext();
  const [selectedRoasts, setSelectedRoasts] = useState<RoastProfile[]>([]);
  const [tradeType, setTradeType] = useState<'all' | 'trade' | 'gift'>('all');

  // State for remaining advanced filters
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>([]);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [selectedProcessingMethods, setSelectedProcessingMethods] = useState<string[]>([]);

  // State for additional advanced filters
  const [selectedVarietals, setSelectedVarietals] = useState<string[]>([]);
  const [selectedAcidity, setSelectedAcidity] = useState<string[]>([]);
  const [selectedBody, setSelectedBody] = useState<string[]>([]);
  const [selectedDecafStatus, setSelectedDecafStatus] = useState<'Any' | 'Yes' | 'No'>('Any');

  // Add states for Quantity, Seller Rating, Roast Date later
  const [selectedQuantities, setSelectedQuantities] = useState<string[]>([]);
  const [selectedSellerRatings, setSelectedSellerRatings] = useState<number[]>([]);
  const [selectedRoastDates, setSelectedRoastDates] = useState<string[]>([]); // Using array for consistency, but will treat as single-select with radio buttons

  const [allListings, setAllListings] = useState<BeanListing[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const urlSearchTerm = queryParams.get('search') || '';

  const [searchTerm, setSearchTerm] = useState(urlSearchTerm);

  // State for responsive sidebar visibility
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);

  // Effect to control sidebar visibility based on screen size
  useEffect(() => {
      const handleResize = () => {
          if (window.innerWidth >= 768) {
              setIsSidebarOpen(true);
          } else {
              setIsSidebarOpen(false);
          }
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchListingsAndUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let listingsRef: any = collection(db, 'listings');

        // Start building the query
        let listingsQuery = query(
            listingsRef,
            where('status', '==', 'available'), // Always filter for available listings
            orderBy('createdAt', 'desc') // Default sort order
        );

        // Apply Trade Type Filter (Server-side)
        if (tradeType !== 'all') {
            listingsQuery = query(listingsQuery, where('tradeOrGiveaway', '==', tradeType));
        }

        // Apply Roast Profile Filter (only single select for now due to Firestore query limitations)
        if (selectedRoasts.length === 1) {
             listingsQuery = query(listingsQuery, where('roast', '==', selectedRoasts[0]));
        } else if (selectedRoasts.length > 1) {
            // TODO: Handle multi-select roast filtering (requires different query approach or client-side filtering)
            console.warn("Multi-select roast filtering not yet fully supported server-side.");
            // For now, the query will only include the single-select filter or no roast filter if multi-selected
        }

        // Apply Decaf Status Filter (Server-side)
         if (selectedDecafStatus !== 'Any') {
             const isDecaf = selectedDecafStatus === 'Yes';
              listingsQuery = query(listingsQuery, where('isDecaf', '==', isDecaf));
         }

        // TODO: Add server-side filtering for single-select Origin, Flavor, Processing Method, Varietal, Acidity, Body, Quantity, Seller Rating, Roast Date if possible and necessary
        // Remember to consider composite indexes for combinations of filters.

        const listingsSnapshot = await getDocs(listingsQuery);
        const fetchedListings = listingsSnapshot.docs.map(doc => ({
          ...doc.data() as BeanListing,
          id: doc.id,
        }));
        setAllListings(fetchedListings);

        const uniqueUserIds = Array.from(new Set(fetchedListings.map(listing => listing.userId)));

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
        console.error('Error fetching listings or users:', err);
        setError('Failed to load listings.');
        showAlert('Failed to load listings.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    // Only refetch listings on changes to filters that affect the server-side query
    fetchListingsAndUsers();
  }, [showAlert, tradeType, selectedRoasts, selectedDecafStatus]); // Keep only server-side filters and showAlert in dependencies

  const filteredListings = useMemo(() => {
    // Start with the listings fetched from the server
    let currentFilteredListings = allListings;

    // Apply client-side filtering for the search term
    currentFilteredListings = currentFilteredListings.filter(listing => {
        const searchTermMatch = 
            listing.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            listing.origin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (listing.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (listing.roaster || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (listing.boughtFrom || '').toLowerCase().includes(searchTerm.toLowerCase());
        return searchTermMatch;
    });


    // Apply client-side filtering for multi-select Roast Profile (if more than one is selected)
    currentFilteredListings = currentFilteredListings.filter(listing => selectedRoasts.length <= 1 || selectedRoasts.includes(listing.roast));

    // Apply client-side filtering for multi-select Origins
    currentFilteredListings = currentFilteredListings.filter(listing => selectedOrigins.length === 0 || (listing.origin && selectedOrigins.some(selectedOrigin => listing.origin.includes(selectedOrigin))));

    // Apply client-side filtering for multi-select Flavor Notes
    currentFilteredListings = currentFilteredListings.filter(listing => selectedFlavors.length === 0 || (listing.flavorNotes && selectedFlavors.some(selectedFlavorId =>
        listing.flavorNotes.split(',').map(note => note.trim()).some(note => {
            const flavorProfile = FLAVOR_PROFILES_OPTIONS.find((f: any) => f.name === note);
            return flavorProfile && flavorProfile.id === selectedFlavorId;
        })
    )));

    // Apply client-side filtering for multi-select Processing Methods
    currentFilteredListings = currentFilteredListings.filter(listing => selectedProcessingMethods.length === 0 || (listing.processingMethod && selectedProcessingMethods.includes(listing.processingMethod)));

    // Apply client-side filtering for multi-select Varietals
    currentFilteredListings = currentFilteredListings.filter(listing => selectedVarietals.length === 0 || (listing.varietal && selectedVarietals.includes(listing.varietal)));

    // Apply client-side filtering for multi-select Acidity
    currentFilteredListings = currentFilteredListings.filter(listing => selectedAcidity.length === 0 || (listing.acidity && selectedAcidity.includes(listing.acidity)));

    // Apply client-side filtering for multi-select Body
    currentFilteredListings = currentFilteredListings.filter(listing => selectedBody.length === 0 || (listing.body && selectedBody.includes(listing.body)));

    // Apply client-side filtering for Decaf Status (already server-side, but keeping client-side logic for safety)
     currentFilteredListings = currentFilteredListings.filter(listing => selectedDecafStatus === 'Any' || (selectedDecafStatus === 'Yes' ? listing.isDecaf === true : listing.isDecaf === false));

    // Apply client-side filtering for Quantity ranges
     currentFilteredListings = currentFilteredListings.filter(listing => selectedQuantities.length === 0 || (listing.quantity && selectedQuantities.some(range => {
         const quantity = parseFloat(listing.quantity);
         if (isNaN(quantity)) return false; // Skip if quantity is not a valid number
         if (range === 'Under 250g') return quantity < 250;
         if (range === '250g - 500g') return quantity >= 250 && quantity <= 500;
         if (range === '500g - 1kg') return quantity > 500 && quantity <= 1000; // Assuming 1kg = 1000g
         if (range === '1kg+') return quantity > 1000;
         return false; // Should not happen
     })));

    // Apply client-side filtering for Seller Rating
     currentFilteredListings = currentFilteredListings.filter(listing => selectedSellerRatings.length === 0 || (listing.userId && usersMap[listing.userId]?.averageRating !== undefined && selectedSellerRatings.some(minRating => (usersMap[listing.userId]?.averageRating ?? 0) >= minRating)));

    // Apply client-side filtering for Roast Date ranges
     currentFilteredListings = currentFilteredListings.filter(listing => selectedRoastDates.length === 0 || selectedRoastDates[0] === 'Any' || (listing.roastedDate && (() => {
         const roastDate = new Date(listing.roastedDate);
         const now = new Date();
         const diffInDays = (now.getTime() - roastDate.getTime()) / (1000 * 60 * 60 * 24);

         if (selectedRoastDates[0] === 'Within 1 Week') return listing.roastedDate && diffInDays <= 7 && diffInDays >= 0;
         if (selectedRoastDates[0] === 'Within 1 Month') return diffInDays <= 30 && diffInDays >= 0;
         if (selectedRoastDates[0] === 'More than 1 Month Ago') return diffInDays > 30;
         return false; // Should not happen
     })()));

    return currentFilteredListings;
  }, [allListings, searchTerm, selectedRoasts, selectedOrigins, selectedFlavors, selectedProcessingMethods, selectedVarietals, selectedAcidity, selectedBody, selectedDecafStatus, selectedQuantities, selectedSellerRatings, selectedRoastDates, usersMap]); // Update dependencies


  // Handlers for the remaining filters (Origin, Flavor Notes, Processing Method, Roast Profile)
  const handleOriginToggle = (origin: string) => {
    setSelectedOrigins(prev =>
      prev.includes(origin) ? prev.filter(o => o !== origin) : [...prev, origin]
    );
  };

  const handleFlavorToggle = (flavorId: string) => {
    setSelectedFlavors(prev =>
      prev.includes(flavorId) ? prev.filter(id => id !== flavorId) : [...prev, flavorId]
    );
  };

  const handleProcessingMethodToggle = (method: string) => {
    setSelectedProcessingMethods(prev =>
      prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
    );
  };

  const handleRoastToggle = (roast: RoastProfile) => {
    setSelectedRoasts(prev => 
      prev.includes(roast) ? prev.filter(r => r !== roast) : [...prev, roast]
    );
  };

  // Handler for Varietal filter
  const handleVarietalToggle = (varietal: string) => {
      setSelectedVarietals(prev =>
          prev.includes(varietal) ? prev.filter(v => v !== varietal) : [...prev, varietal]
      );
  };

  // Handler for Acidity filter
  const handleAcidityToggle = (acidity: string) => {
      setSelectedAcidity(prev =>
          prev.includes(acidity) ? prev.filter(a => a !== acidity) : [...prev, acidity]
      );
  };

  // Handler for Body filter
  const handleBodyToggle = (body: string) => {
      setSelectedBody(prev =>
          prev.includes(body) ? prev.filter(b => b !== body) : [...prev, body]
      );
  };

  // Handler for Decaf Status filter
  const handleDecafStatusChange = (status: 'Any' | 'Yes' | 'No') => {
      setSelectedDecafStatus(status);
  };

   // Handler for Quantity filter
   const handleQuantityToggle = (quantity: string) => {
       setSelectedQuantities(prev =>
           prev.includes(quantity) ? prev.filter(q => q !== quantity) : [...prev, quantity]
       );
   };

   // Handler for Seller Rating filter
   const handleSellerRatingToggle = (rating: number) => {
       setSelectedSellerRatings(prev =>
           prev.includes(rating) ? prev.filter(r => r !== rating) : [...prev, rating]
       );
   };

   // Handler for Roast Date filter
   const handleRoastDateChange = (range: string) => {
       // Treating this as single-select with radio buttons
       setSelectedRoastDates([range]);
   };

  // Function to generate applied filter tags (based on the sample code)
  const getAppliedFiltersTags = () => {
    const tags: { name: string; value: string | number; filterKey: string; valueToRemove?: any }[] = [];
    if (searchTerm) tags.push({ name: 'Search', value: searchTerm, filterKey: 'searchTerm' });
    if (tradeType !== 'all') tags.push({ name: 'Availability', value: tradeType === 'trade' ? 'Trade Only' : 'Gift Only', filterKey: 'tradeType' });
    selectedOrigins.forEach(o => tags.push({ name: 'Origin', value: o, filterKey: 'selectedOrigins', valueToRemove: o }));
    selectedRoasts.forEach(r => tags.push({ name: 'Roast', value: r, filterKey: 'selectedRoasts', valueToRemove: r }));
    selectedFlavors.forEach(f => {
        const flavor = FLAVOR_PROFILES_OPTIONS.find((opt: any) => opt.id === f);
        if (flavor) tags.push({ name: 'Flavor', value: flavor.name, filterKey: 'selectedFlavors', valueToRemove: f });
    });
    selectedProcessingMethods.forEach(p => tags.push({ name: 'Process', value: p, filterKey: 'selectedProcessingMethods', valueToRemove: p }));
    selectedVarietals.forEach(v => tags.push({ name: 'Varietal', value: v, filterKey: 'selectedVarietals', valueToRemove: v }));
    selectedAcidity.forEach(a => tags.push({ name: 'Acidity', value: a, filterKey: 'selectedAcidity', valueToRemove: a }));
    selectedBody.forEach(b => tags.push({ name: 'Body', value: b, filterKey: 'selectedBody', valueToRemove: b }));
    if (selectedDecafStatus !== 'Any') tags.push({ name: 'Decaf', value: selectedDecafStatus === 'Yes' ? 'Yes' : 'No', filterKey: 'selectedDecafStatus' });
    selectedQuantities.forEach(q => tags.push({ name: 'Quantity', value: q, filterKey: 'selectedQuantities', valueToRemove: q }));
    selectedSellerRatings.forEach(s => tags.push({ name: 'Seller Rating', value: `${s}+ Stars`, filterKey: 'selectedSellerRatings', valueToRemove: s }));
    selectedRoastDates.forEach(r => {
        const roastDateOption = ROAST_DATE_OPTIONS.find(opt => opt === r);
        if (roastDateOption) tags.push({ name: 'Roast Date', value: roastDateOption, filterKey: 'selectedRoastDates', valueToRemove: r });
    });

    return tags;
  };

   // Function to clear a single filter (based on the sample code)
   const clearFilter = (filterKey: string, valueToRemove?: any) => {
       if (filterKey === 'searchTerm') {
           setSearchTerm('');
       } else if (filterKey === 'tradeType') {
           setTradeType('all');
       } else if (filterKey === 'selectedDecafStatus') {
           setSelectedDecafStatus('Any');
       } else if (filterKey === 'selectedRoastDates') {
            setSelectedRoastDates([]); // Clear the single selection
       } else if (filterKey === 'selectedSellerRatings') {
           setSelectedSellerRatings([]); // Clear the single selection
       } else {
           // For multi-select arrays
           (eval(`set${filterKey.charAt(8).toUpperCase() + filterKey.slice(9)}` as any) as React.Dispatch<React.SetStateAction<any[]>>)(prev => prev.filter(item => item !== valueToRemove));
       }
   };

   // Function to clear all filters (based on the sample code)
   const clearAllFilters = () => {
       setSelectedOrigins([]);
       setSelectedRoasts([]);
       setSelectedFlavors([]);
       setSelectedProcessingMethods([]);
       setSelectedVarietals([]);
       setSelectedAcidity([]);
       setSelectedBody([]);
       setSelectedDecafStatus('Any');
       setSelectedQuantities([]);
       setSelectedSellerRatings([]);
       setSelectedRoastDates([]);
       setTradeType('all');
       setSearchTerm('');
   };


  if (isLoading) return <LoadingSpinner text="Loading beans..." />;
  if (error) return <div className="text-center text-xl text-red-500">{error}</div>;

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-4xl font-bold text-coffee-primary mb-4 font-['Playfair_Display']">Explore Coffee Beans</h1>
        <p className="text-lg text-gray-700">Find your next favorite coffee from our global community.</p>
      </header>

      {/* Mobile filter toggle button (visible only on small screens) */}
      <div className="flex justify-end mb-4 md:hidden">
           <button
               onClick={() => setIsSidebarOpen(!isSidebarOpen)}
               className="p-2 bg-coffee-primary text-white rounded-md flex items-center shadow"
           >
               <FilterIcon className="w-5 h-5 mr-2" />
               {isSidebarOpen ? 'Hide Filters' : 'Show Filters'}
           </button>
      </div>

      {/* Filters and Listings Container */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters Sidebar (Responsive - show/hide on small screens, static on medium+) */}
        <div className={`w-full md:w-1/4 bg-white p-6 rounded-lg shadow-md ${isSidebarOpen ? 'block' : 'hidden'} md:block`}>
          {/* Close button for mobile sidebar */}
          <div className="flex justify-end md:hidden mb-4">
              <button onClick={() => setIsSidebarOpen(false)} className="text-gray-500 hover:text-gray-700">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
          </div>

          <h2 className="text-xl font-semibold text-gray-800 mb-4">Filters</h2>

          {/* Search and Type Filters (moved to sidebar for consistency) */}
           <div className="mb-6">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-coffee-primary mb-1">
              <SearchIcon className="w-5 h-5 inline mr-1" /> Search Beans
            </label>
            <input
              type="text"
              id="search"
              placeholder="Enter name, origin, keywords, roaster, or company..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-coffee-primary focus:border-coffee-primary"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
            <div className="mt-4">
            <label className="block text-sm font-medium text-coffee-primary mb-1">
              <FilterIcon className="w-5 h-5 inline mr-1" /> Filter by Type
            </label>
            <select
              value={tradeType}
                onChange={e => setTradeType(e.target.value as 'all' | 'trade' | 'gift')}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-coffee-primary focus:border-coffee-primary bg-white"
            >
                <option value="all">All Listings</option>
              <option value="trade">For Trade</option>
                <option value="gift">Gift Only</option>
            </select>
          </div>
        </div>


          {/* Key Filters Section (Simplified Layout) - Moved to sidebar */}
          <div className="space-y-4 mt-6 pt-4 border-t border-gray-200">
            {/* Origin Filter */}
            <div>
                <label className="block text-sm font-medium text-coffee-primary mb-2">
                    Filter by Origin
                </label>
                <div className="flex flex-wrap gap-2">
                    {ORIGIN_OPTIONS.map(origin => (
                        <label key={origin} className="inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="form-checkbox h-4 w-4 text-coffee-primary rounded border-gray-300 focus:ring-coffee-secondary"
                                checked={selectedOrigins.includes(origin)}
                                onChange={() => handleOriginToggle(origin)}
                            />
                            <span className="ml-2 text-gray-700 text-sm">{origin}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Roast Profile Filter */}
        <div>
            <label className="block text-sm font-medium text-coffee-primary mb-2">
                Filter by Roast Profile
            </label>
            <div className="flex flex-wrap gap-2">
                {ROAST_OPTIONS.map(roast => (
                <button
                    key={roast}
                    onClick={() => handleRoastToggle(roast)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors
                    ${selectedRoasts.includes(roast) 
                        ? 'bg-coffee-primary text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                    {roast}
                </button>
                ))}
            </div>
        </div>

            {/* Flavor Notes Filter */}
            <div>
                <label className="block text-sm font-medium text-coffee-primary mb-2">
                    Filter by Flavor Notes
                </label>
                <div className="flex flex-wrap gap-2">
                    {FLAVOR_PROFILES_OPTIONS.map((flavor: any) => (
                        <label key={flavor.id} className="inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="form-checkbox h-4 w-4 text-coffee-primary rounded border-gray-300 focus:ring-coffee-secondary"
                                checked={selectedFlavors.includes(flavor.id)}
                                onChange={() => handleFlavorToggle(flavor.id)}
                            />
                            <span className="ml-2 text-gray-700 text-sm">{flavor.name}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Processing Method Filter */}
            <div>
                <label className="block text-sm font-medium text-coffee-primary mb-2">
                    Filter by Processing Method
                </label>
                <div className="flex flex-wrap gap-2">
                    {PROCESSING_METHOD_OPTIONS.map(method => (
                        <label key={method} className="inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="form-checkbox h-4 w-4 text-coffee-primary rounded border-gray-300 focus:ring-coffee-secondary"
                                checked={selectedProcessingMethods.includes(method)}
                                onChange={() => handleProcessingMethodToggle(method)}
                            />
                            <span className="ml-2 text-gray-700 text-sm">{method}</span>
                        </label>
                    ))}
                </div>
            </div>
          </div>

          {/* Additional Filters - Moved to sidebar and updated layout */}
          <div className="space-y-4 mt-6 pt-4 border-t border-gray-200">
              {/* Varietal Filter */}
              <div>
                  <label className="block text-sm font-medium text-coffee-primary mb-2">
                      Filter by Varietal
                  </label>
                  <div className="flex flex-wrap gap-2">
                      {VARIETAL_OPTIONS.map(varietal => (
                          <label key={varietal} className="inline-flex items-center cursor-pointer">
                              <input
                                  type="checkbox"
                                  className="form-checkbox h-4 w-4 text-coffee-primary rounded border-gray-300 focus:ring-coffee-secondary"
                                  checked={selectedVarietals.includes(varietal)}
                                  onChange={() => handleVarietalToggle(varietal)}
                              />
                              <span className="ml-2 text-gray-700 text-sm">{varietal}</span>
                          </label>
                      ))}
                  </div>
              </div>

              {/* Acidity Filter */}
              <div>
                  <label className="block text-sm font-medium text-coffee-primary mb-2">
                      Filter by Acidity
                  </label>
                  <div className="flex flex-wrap gap-2">
                      {ACIDITY_OPTIONS.map(acidity => (
                          <label key={acidity} className="inline-flex items-center cursor-pointer">
                              <input
                                  type="checkbox"
                                  className="form-checkbox h-4 w-4 text-coffee-primary rounded border-gray-300 focus:ring-coffee-secondary"
                                  checked={selectedAcidity.includes(acidity)}
                                  onChange={() => handleAcidityToggle(acidity)}
                              />
                              <span className="ml-2 text-gray-700 text-sm">{acidity}</span>
                          </label>
                      ))}
                  </div>
              </div>

              {/* Body Filter */}
              <div>
                  <label className="block text-sm font-medium text-coffee-primary mb-2">
                      Filter by Body
                  </label>
                  <div className="flex flex-wrap gap-2">
                      {BODY_OPTIONS.map(body => (
                          <label key={body} className="inline-flex items-center cursor-pointer">
                              <input
                                  type="checkbox"
                                  className="form-checkbox h-4 w-4 text-coffee-primary rounded border-gray-300 focus:ring-coffee-secondary"
                                  checked={selectedBody.includes(body)}
                                  onChange={() => handleBodyToggle(body)}
                              />
                              <span className="ml-2 text-gray-700 text-sm">{body}</span>
                          </label>
                      ))}
                  </div>
              </div>

              {/* Decaf Status Filter */}
              <div>
                  <label className="block text-sm font-medium text-coffee-primary mb-2">
                      Filter by Decaf Status
                  </label>
                  <div className="flex flex-wrap gap-2">
                      {DECAF_STATUS_OPTIONS.map(option => (
                          <label key={option} className="inline-flex items-center cursor-pointer">
                              <input
                                  type="radio"
                                  className="form-radio h-4 w-4 text-coffee-primary rounded border-gray-300 focus:ring-coffee-secondary"
                                  name="decafStatus"
                                  value={option}
                                  checked={selectedDecafStatus === option}
                                  onChange={() => handleDecafStatusChange(option as 'Any' | 'Yes' | 'No')}
                              />
                              <span className="ml-2 text-gray-700 text-sm">{option}</span>
                          </label>
                      ))}
                  </div>
              </div>
          </div>

          {/* Quantity Filter */}
          <div className="space-y-4 mt-6 pt-4 border-t border-gray-200">
              <div>
                  <label className="block text-sm font-medium text-coffee-primary mb-2">
                      Filter by Quantity
                  </label>
                  <div className="flex flex-wrap gap-2">
                      {QUANTITY_OPTIONS.map(quantity => (
                          <label key={quantity} className="inline-flex items-center cursor-pointer">
                              <input
                                  type="checkbox"
                                  className="form-checkbox h-4 w-4 text-coffee-primary rounded border-gray-300 focus:ring-coffee-secondary"
                                  checked={selectedQuantities.includes(quantity)}
                                  onChange={() => handleQuantityToggle(quantity)}
                              />
                              <span className="ml-2 text-gray-700 text-sm">{quantity}</span>
                          </label>
                      ))}
                  </div>
              </div>

              {/* Seller Rating Filter */}
              <div>
                  <label className="block text-sm font-medium text-coffee-primary mb-2">
                      Filter by Seller Rating
                  </label>
                  <div className="flex flex-wrap gap-2">
                      {SELLER_RATING_OPTIONS.map(option => (
                          <label key={option.value} className="inline-flex items-center cursor-pointer">
                              <input
                                  type="checkbox"
                                  className="form-checkbox h-4 w-4 text-coffee-primary rounded border-gray-300 focus:ring-coffee-secondary"
                                  checked={selectedSellerRatings.includes(option.value)}
                                  onChange={() => handleSellerRatingToggle(option.value)}
                              />
                              <span className="ml-2 text-gray-700 text-sm">{option.label}</span>
                          </label>
                      ))}
                  </div>
              </div>

              {/* Roast Date Filter */}
              <div>
                  <label className="block text-sm font-medium text-coffee-primary mb-2">
                      Filter by Roast Date
                  </label>
                  <div className="flex flex-wrap gap-2">
                      {ROAST_DATE_OPTIONS.map(option => (
                          <label key={option} className="inline-flex items-center cursor-pointer">
                              <input
                                  type="radio"
                                  className="form-radio h-4 w-4 text-coffee-primary rounded border-gray-300 focus:ring-coffee-secondary"
                                  name="roastDate"
                                  value={option}
                                  checked={selectedRoastDates[0] === option}
                                  onChange={() => handleRoastDateChange(option)}
                              />
                              <span className="ml-2 text-gray-700 text-sm">{option}</span>
                          </label>
                      ))}
                  </div>
              </div>
          </div>

      </div>
      
        {/* Listings Main Area */}
        <div className="flex-grow w-full md:w-3/4">
          {/* Applied Filters Display */}
          {getAppliedFiltersTags().length > 0 && (
            <div className="mb-6 p-3 bg-blue-50 rounded-lg flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-blue-800">Applied Filters:</span>
              {getAppliedFiltersTags().map((tag, index) => (
                <span
                  key={index}
                  className="bg-blue-200 text-blue-800 px-3 py-1 rounded-full flex items-center gap-1 cursor-pointer hover:bg-blue-300"
                  onClick={() => clearFilter(tag.filterKey, tag.valueToRemove)}
                >
                  {tag.name}: {tag.value}
                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </span>
              ))}
              <button
                onClick={clearAllFilters}
                className="ml-auto px-3 py-1 text-blue-700 hover:underline"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Display Listings */}
      {filteredListings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredListings.map(listing => {
            const lister = usersMap[listing.userId];
            return <BeanCard key={listing.id} listing={listing} lister={lister} />;
          })}
        </div>
      ) : (
            <div className="bg-white p-8 rounded-lg shadow-md text-center text-gray-600">
              <p className="text-xl font-semibold mb-4">No beans found matching your criteria.</p>
              <p>Try adjusting your filters or clearing them to see more listings.</p>
              <button onClick={clearAllFilters} className="mt-4 px-6 py-2 bg-coffee-primary text-white rounded-md hover:bg-coffee-secondary">
                Clear All Filters
              </button>
            </div>
          )}
          {/* Pagination/Load More - Placeholder */}
          {/* Add pagination or infinite scroll implementation here */}
        </div>
      </div>
    </div>
  );
};

export default ListingsPage;
