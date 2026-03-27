import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export default function RequestSchool() {
  const navigate = useNavigate();
  const [schoolName, setSchoolName] = useState('');
  const [schoolType, setSchoolType] = useState('University');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim()) {
      setError('Please enter a school name.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await addDoc(collection(db, 'schoolRequests'), {
        name: schoolName.trim(),
        type: schoolType,
        location: location.trim(),
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setSubmitted(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'schoolRequests');
      setError('Failed to submit request. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 flex flex-col max-w-md mx-auto relative overflow-hidden">
      <button 
        onClick={() => navigate(-1)}
        className="w-12 h-12 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 mb-8"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1"
      >
        {submitted ? (
          <div className="text-center space-y-6 pt-12">
            <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-bold">Request Sent!</h1>
            <p className="opacity-70 text-lg">
              Thanks for helping us grow. We'll review your request and add {schoolName} to Quad soon.
            </p>
            <button 
              onClick={() => navigate('/')}
              className="w-full py-4 mt-8 rounded-full bg-[var(--accent-color)] text-white font-bold text-lg hover:opacity-90 transition-opacity"
            >
              Back to Home
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-4xl font-bold mb-2">Request School</h1>
            <p className="opacity-70 mb-8">Don't see your campus? Let us know and we'll add it.</p>

            {error && (
              <div className="p-4 mb-6 bg-red-500/10 text-red-500 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium opacity-70 ml-1">Institution Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Jahangirnagar University"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full p-4 rounded-xl bg-black/5 dark:bg-white/5 border-none outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium opacity-70 ml-1">Institution Type</label>
                <select 
                  value={schoolType}
                  onChange={(e) => setSchoolType(e.target.value)}
                  className="w-full p-4 rounded-xl bg-black/5 dark:bg-white/5 border-none outline-none focus:ring-2 focus:ring-[var(--accent-color)] appearance-none"
                >
                  <option value="University">University</option>
                  <option value="College">College</option>
                  <option value="School & College">School & College</option>
                  <option value="School">School</option>
                  <option value="Medical College">Medical College</option>
                  <option value="Training Institute">Training Institute</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium opacity-70 ml-1">Location / City (Optional)</label>
                <input 
                  type="text"
                  placeholder="e.g. Savar, Dhaka"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-4 rounded-xl bg-black/5 dark:bg-white/5 border-none outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 mt-4 rounded-full bg-[var(--accent-color)] text-white font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Submitting...' : (
                  <>
                    Submit Request <Send className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
