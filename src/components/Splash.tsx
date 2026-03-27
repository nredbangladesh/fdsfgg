import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const DEFAULT_SCHOOLS = [
  { id: '1', name: "Jahangirnagar University", type: "University" },
  { id: '2', name: "Savar Government College", type: "College" },
  { id: '3', name: "Savar Cantonment Public School and College", type: "School & College" },
  { id: '4', name: "Morning Glory School and College", type: "School & College" },
  { id: '5', name: "Savar Model College", type: "College" },
  { id: '6', name: "Enam Medical College and Hospital", type: "Medical College" },
  { id: '7', name: "Bangladesh Noubahini School and College Savar", type: "School & College" },
  { id: '8', name: "AERE School and College", type: "School & College" },
  { id: '9', name: "Gonoshasthaya Samaj Vittik Medical College", type: "Medical College" },
  { id: '10', name: "Savar Laboratory College", type: "College" },
  { id: '11', name: "Savar Laboratory School", type: "School" },
  { id: '12', name: "Green Bell Laboratory School", type: "School" },
  { id: '13', name: "Australis International School", type: "School" },
  { id: '14', name: "Mofazzal-Momena Chakladar Mohila College", type: "College" },
  { id: '15', name: "Adhar Chandra High School", type: "School" },
  { id: '16', name: "Savar Girls' High School", type: "School" },
  { id: '17', name: "Dairy Farm High School", type: "School" },
  { id: '18', name: "BPATC School and College", type: "School & College" },
  { id: '19', name: "Savar University College", type: "College" },
  { id: '20', name: "Ashulia School and College", type: "School & College" },
  { id: '21', name: "Dhamsona Karamatia High School", type: "School" },
  { id: '22', name: "Genda Government Primary School", type: "School" },
  { id: '23', name: "Thana Road Ideal School", type: "School" },
  { id: '24', name: "Bank Colony High School", type: "School" },
  { id: '25', name: "Savar Residential School & College", type: "School & College" },
  { id: '26', name: "Zirabo Cantonment Public School & College", type: "School & College" },
  { id: '27', name: "Shaheed Monsur Ali Medical College", type: "Medical College" },
  { id: '28', name: "Savar Primary Training Institute (PTI)", type: "Training Institute" },
  { id: '29', name: "Savar High School", type: "School" },
  { id: '30', name: "Bananighat High School", type: "School" },
  { id: '31', name: "Vatpara High School", type: "School" },
  { id: '32', name: "Pathalia High School", type: "School" },
  { id: '33', name: "Shimulia High School", type: "School" },
  { id: '34', name: "Bishmail High School", type: "School" },
  { id: '35', name: "Rajashon High School", type: "School" },
  { id: '36', name: "Savar City College", type: "College" },
  { id: '37', name: "Amin Bazar High School", type: "School" },
  { id: '38', name: "Kadda High School", type: "School" },
  { id: '39', name: "Bhanga Wall High School", type: "School" },
  { id: '40', name: "Mirzanagar High School", type: "School" },
  { id: '41', name: "Nayarhat High School", type: "School" },
  { id: '42', name: "Kushumbra High School", type: "School" },
  { id: '43', name: "Tetuljhora High School", type: "School" },
  { id: '44', name: "Hemayetpur High School", type: "School" },
  { id: '45', name: "Savar Ideal College", type: "College" },
  { id: '46', name: "Gono Bishwabidyalay", type: "University" },
  { id: '47', name: "Asian University of Bangladesh (Savar Campus)", type: "University" },
  { id: '48', name: "City University (Permanent Campus)", type: "University" },
  { id: '49', name: "Brac University (Savar Campus)", type: "University" },
  { id: '50', name: "Daffodil International University (Permanent Campus)", type: "University" }
];

export default function Splash() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [allSchools, setAllSchools] = useState<{id: string, name: string}[]>(DEFAULT_SCHOOLS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'schools'));
        const schoolsData: {id: string, name: string}[] = [];
        querySnapshot.forEach((doc) => {
          schoolsData.push({ id: doc.id, name: doc.data().name });
        });
        if (schoolsData.length > 0) {
          setAllSchools(schoolsData);
        }
      } catch (error) {
        console.error("Error fetching schools:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSchools();
  }, []);

  const schools = allSchools.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Animated background shapes */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[var(--accent-color)] rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-[var(--text-color)] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-12 z-10"
      >
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-black tracking-tighter">Quad</h1>
          <p className="text-xl font-medium opacity-80">Your campus, your people.</p>
        </div>

        <div className="space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50" />
            <input 
              ref={searchInputRef}
              type="text"
              placeholder="Find your school..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-black/5 dark:bg-white/5 border-none focus:ring-2 focus:ring-[var(--accent-color)] outline-none transition-all"
            />
          </div>

          {searchQuery && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-black/5 dark:bg-white/5 rounded-2xl overflow-hidden max-h-64 overflow-y-auto"
            >
              {schools.length > 0 ? (
                schools.map(school => (
                  <button 
                    key={school.id}
                    onClick={() => navigate('/signup', { state: { school } })}
                    className="w-full flex items-center justify-between p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left border-b border-black/5 dark:border-white/5 last:border-0"
                  >
                    <span className="font-medium">{school.name}</span>
                    <ChevronRight className="w-5 h-5 opacity-50" />
                  </button>
                ))
              ) : (
                <div className="p-4 text-center opacity-70">
                  <p>School not listed?</p>
                  <button onClick={() => navigate('/request-school')} className="text-[var(--accent-color)] font-medium mt-2 hover:underline">Request your school</button>
                </div>
              )}
            </motion.div>
          )}
        </div>

        <div className="flex flex-col gap-4 pt-8">
          <button 
            onClick={() => searchInputRef.current?.focus()}
            className="w-full py-4 rounded-full bg-[var(--accent-color)] text-white font-bold text-lg hover:opacity-90 transition-opacity"
          >
            Sign up
          </button>
          <button 
            onClick={() => navigate('/login')}
            className="w-full py-4 rounded-full border-2 border-current font-bold text-lg opacity-80 hover:opacity-100 transition-opacity"
          >
            Log in
          </button>
        </div>
      </motion.div>
    </div>
  );
}
