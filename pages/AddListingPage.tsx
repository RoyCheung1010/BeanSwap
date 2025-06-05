import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { BeanListing, RoastProfile } from '../types';
import { ROAST_OPTIONS, GEMINI_API_KEY_INFO } from '../constants';
import { generateBeanDescription } from '../services/geminiService';
import LoadingSpinner from '../components/LoadingSpinner';
import { PhotographIcon, BeakerIcon, SparklesIcon } from '../components/Icons';

const AddListingPage: React.FC = () => {
  const { currentUser, addListing, showAlert } = useAppContext();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [origin, setOrigin] = useState('');
  const [roast, setRoast] = useState<RoastProfile>(RoastProfile.MEDIUM);
  const [flavorNotes, setFlavorNotes] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [tradeOrGiveaway, setTradeOrGiveaway] = useState<'trade' | 'giveaway'>('trade');
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const [roaster, setRoaster] = useState('');
  const [boughtFrom, setBoughtFrom] = useState('');
  const [roastedDate, setRoastedDate] = useState('');
  const [isDecaf, setIsDecaf] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  
  const isApiKeySet = process.env.API_KEY && process.env.API_KEY !== "YOUR_API_KEY_HERE" && process.env.API_KEY.length > 10;

  if (!currentUser) {
    navigate('/'); // Redirect if not logged in
    showAlert('You must be logged in to add a listing.', 'error');
    return null;
  }

  const handleGenerateDescription = async () => {
    if (!isApiKeySet) {
        setGeminiError(`AI features are disabled. ${GEMINI_API_KEY_INFO}`);
        showAlert(`AI features are disabled. ${GEMINI_API_KEY_INFO}`, 'error');
        return;
    }
    if (!origin || !roast) {
      showAlert('Please provide Origin and Roast type to generate a description.', 'info');
      return;
    }
    setIsGeneratingDesc(true);
    setGeminiError(null);
    try {
      const aiDescription = await generateBeanDescription(origin, roast);
      setDescription(aiDescription);
      showAlert('AI description generated!', 'success');
    } catch (error) {
      console.error('Error generating AI description:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate description.';
      setGeminiError(errorMessage);
      showAlert(errorMessage, 'error');
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !origin || !quantity) {
      showAlert('Please fill in all required fields.', 'error');
      return;
    }

    const newListing: Omit<BeanListing, 'id' | 'createdAt' | 'status' | 'userId'> = {
      name,
      origin,
      roast,
      flavorNotes,
      description,
      quantity,
      imageUrl: imageUrl || undefined,
      tradeOrGiveaway,
      roaster,
      boughtFrom,
      roastedDate: roastedDate || undefined,
      isDecaf,
    };
    addListing(newListing);
    showAlert('Bean listing added successfully!', 'success');
    navigate('/listings');
  };
  
  const inputClass = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-coffee-primary focus:border-coffee-primary sm:text-sm";
  const labelClass = "block text-sm font-medium text-coffee-extralight";

  return (
    <div className="max-w-2xl mx-auto bg-coffee-primary p-8 rounded-lg shadow-xl">
      <h1 className="text-3xl font-bold text-coffee-extralight mb-6 text-center font-['Playfair_Display']">Share Your Coffee Beans</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className={labelClass}>Bean Name*</label>
          <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className={`${inputClass.replace("border-gray-300", "border-coffee-dark")} text-gray-900 focus:ring-coffee-dark focus:border-coffee-dark`} />
        </div>
        <div>
          <label htmlFor="origin" className={labelClass}>Origin*</label>
          <input type="text" id="origin" value={origin} onChange={e => setOrigin(e.target.value)} required className={`${inputClass.replace("border-gray-300", "border-coffee-dark")} text-gray-900 focus:ring-coffee-dark focus:border-coffee-dark`} />
        </div>
        <div>
          <label htmlFor="roaster" className={labelClass}>Roaster</label>
          <input type="text" id="roaster" value={roaster} onChange={e => setRoaster(e.target.value)} className={`${inputClass.replace("border-gray-300", "border-coffee-dark")} text-gray-900 focus:ring-coffee-dark focus:border-coffee-dark`} />
        </div>
        <div>
          <label htmlFor="boughtFrom" className={labelClass}>Bought From (Company Name)</label>
          <input type="text" id="boughtFrom" value={boughtFrom} onChange={e => setBoughtFrom(e.target.value)} className={`${inputClass.replace("border-gray-300", "border-coffee-dark")} text-gray-900 focus:ring-coffee-dark focus:border-coffee-dark`} />
        </div>
        <div>
          <label htmlFor="roastedDate" className={labelClass}>Roasted Date</label>
          <input type="date" id="roastedDate" value={roastedDate} onChange={e => setRoastedDate(e.target.value)} className={`${inputClass.replace("border-gray-300", "border-coffee-dark")} text-gray-900 focus:ring-coffee-dark focus:border-coffee-dark`} />
        </div>
        <div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isDecaf"
              checked={isDecaf}
              onChange={e => setIsDecaf(e.target.checked)}
              className="form-checkbox h-4 w-4 text-coffee-dark accent-coffee-dark focus:ring-coffee-dark"
            />
            <label htmlFor="isDecaf" className="ml-2 block text-sm text-gray-900">Decaffeinated</label>
          </div>
        </div>
        <div>
          <label htmlFor="roast" className={labelClass}>Roast Profile*</label>
          <select id="roast" value={roast} onChange={e => setRoast(e.target.value as RoastProfile)} required className={`${inputClass.replace("border-gray-300", "border-coffee-dark")} bg-white text-gray-900 focus:ring-coffee-dark focus:border-coffee-dark`}>
            {ROAST_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="description" className={labelClass}>Description*</label>
          <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={4} className={`${inputClass.replace("border-gray-300", "border-coffee-dark")} text-gray-900 focus:ring-coffee-dark focus:border-coffee-dark`}></textarea>
          <button 
            type="button" 
            onClick={handleGenerateDescription}
            disabled={isGeneratingDesc || !isApiKeySet}
            className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-coffee-dark hover:bg-coffee-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-coffee-accent disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isGeneratingDesc ? (
                <LoadingSpinner size="sm" />
            ) : (
                <SparklesIcon className="w-4 h-4 mr-2" />
            )}
            Generate with AI
          </button>
          {!isApiKeySet && <p className="text-xs text-red-500 mt-1">{GEMINI_API_KEY_INFO}</p>}
          {geminiError && <p className="text-xs text-red-500 mt-1">{geminiError}</p>}
        </div>
        <div>
          <label htmlFor="flavorNotes" className={labelClass}>Flavor Notes (e.g., chocolate, fruity, nutty)</label>
          <input type="text" id="flavorNotes" value={flavorNotes} onChange={e => setFlavorNotes(e.target.value)} className={`${inputClass.replace("border-gray-300", "border-coffee-dark")} text-gray-900 focus:ring-coffee-dark focus:border-coffee-dark`} />
        </div>
        <div>
          <label htmlFor="quantity" className={labelClass}>Quantity* (e.g., 250g, 1lb)</label>
          <input type="text" id="quantity" value={quantity} onChange={e => setQuantity(e.target.value)} required className={`${inputClass.replace("border-gray-300", "border-coffee-dark")} text-gray-900 focus:ring-coffee-dark focus:border-coffee-dark`} />
        </div>
        
        <div>
          <label htmlFor="imageUrl" className={labelClass}><PhotographIcon className="w-4 h-4 inline mr-1"/>Image URL (Optional)</label>
          <input type="url" id="imageUrl" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className={`${inputClass.replace("border-gray-300", "border-coffee-dark")} text-gray-900 focus:ring-coffee-dark focus:border-coffee-dark`} placeholder="https://example.com/image.jpg"/>
        </div>

        <div>
          <label className={labelClass}><BeakerIcon className="w-4 h-4 inline mr-1"/>Listing Type*</label>
          <div className="mt-2 flex space-x-4">
            <label className="inline-flex items-center">
              <input type="radio" name="tradeOrGiveaway" value="trade" checked={tradeOrGiveaway === 'trade'} onChange={() => setTradeOrGiveaway('trade')} className="form-radio h-4 w-4 text-coffee-primary focus:ring-coffee-secondary"/>
              <span className="ml-2 text-gray-700">Trade</span>
            </label>
            <label className="inline-flex items-center">
              <input type="radio" name="tradeOrGiveaway" value="giveaway" checked={tradeOrGiveaway === 'giveaway'} onChange={() => setTradeOrGiveaway('giveaway')} className="form-radio h-4 w-4 text-coffee-primary focus:ring-coffee-secondary"/>
              <span className="ml-2 text-gray-700">Giveaway</span>
            </label>
          </div>
        </div>
        <button 
          type="submit" 
          className="w-full bg-coffee-dark hover:bg-coffee-accent text-white font-semibold py-3 px-4 rounded-md transition-colors duration-300 text-lg disabled:cursor-not-allowed"
          disabled={isGeneratingDesc}
        >
          Add Bean Listing
        </button>
      </form>
    </div>
  );
};

export default AddListingPage;
