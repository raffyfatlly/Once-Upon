import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Loader2, AlertCircle } from 'lucide-react';

export const LinkRedirector: React.FC = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const resolveLink = async () => {
      if (!shortCode) {
        navigate('/', { replace: true });
        return;
      }

      try {
        const q = query(
          collection(db, 'tracked_links'),
          where('shortCode', '==', shortCode),
          limit(1)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          // Fallback check: look up by document ID
          const docRef = await getDocs(query(collection(db, 'tracked_links'), where('id', '==', shortCode), limit(1)));
          if (docRef.empty) {
            setError("The shortened link you are trying to reach was not found or has expired.");
            return;
          }
          const data = docRef.docs[0].data();
          if (data.originalUrl) {
            window.location.replace(data.originalUrl);
          } else {
            setError("The link registry entry is missing its target destination.");
          }
          return;
        }

        const data = querySnapshot.docs[0].data();
        if (data.originalUrl) {
          // Perform clean replacement redirect
          window.location.replace(data.originalUrl);
        } else {
          setError("The link registry entry is missing its target destination.");
        }
      } catch (err: any) {
        console.error("Error resolving short link:", err);
        setError("Failed to redirect: " + (err.message || "An unexpected database connectivity issue occurred."));
      }
    };

    resolveLink();
  }, [shortCode, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-brand-grey/5 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="bg-white p-8 border border-brand-latte/20 rounded-[2px] max-w-sm shadow-sm">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
          <h2 className="font-serif text-xl text-gray-900 mb-2">Redirect Failed</h2>
          <p className="text-xs text-gray-500 mb-6 leading-relaxed">{error}</p>
          <button 
            id="btn-error-redirect-home"
            onClick={() => window.location.replace('/')}
            className="w-full bg-brand-flamingo text-white py-2.5 text-xs font-bold uppercase tracking-widest rounded-[2px]"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-grey/5 flex flex-col items-center justify-center p-6 text-center font-sans">
      <Loader2 size={32} className="text-brand-flamingo animate-spin mb-4" />
      <h2 className="font-serif text-lg text-gray-800">Redirecting you...</h2>
      <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Preparing your premium story</p>
    </div>
  );
};
