import { collection, addDoc, serverTimestamp, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../firebase';

const MAJORS = ['Computer Science', 'Business', 'Engineering', 'Arts', 'Medicine', 'Law', 'Psychology', 'Design'];
const INTERESTS = ['Coding', 'Music', 'Sports', 'Travel', 'Photography', 'Gaming', 'Reading', 'Art'];
const POST_TEMPLATES = [
  "Just finished a huge project! Feeling accomplished. #CSLife",
  "Anyone want to grab coffee at the library later?",
  "The campus looks beautiful today with all the cherry blossoms.",
  "Study session at the student union starting at 5 PM. Join us!",
  "Can't believe it's already midterms week. Good luck everyone!",
  "Just joined the photography club. Can't wait to share some shots!",
  "Does anyone have the notes from today's Econ lecture?",
  "Found a great new spot for lunch near the engineering building.",
  "Late night coding sessions are the best. 💻✨",
  "Who's excited for the game this weekend? Go team! 🏈",
  "Just saw a squirrel eating a whole slice of pizza. Campus is wild.",
  "Thinking of starting a new club for board game enthusiasts. Any interest?",
  "The sunset from the rooftop lounge is unmatched.",
  "Finally mastered that difficult piano piece. 🎹",
  "Looking for a roommate for next semester. DM me if interested!"
];

export async function seedDummyData(schoolId: string) {
  console.log('Starting seed process for school:', schoolId);
  
  // 1. Create 100 dummy users
  const dummyUsers = [];
  for (let i = 0; i < 100; i++) {
    const name = `Student ${Math.floor(Math.random() * 10000)}`;
    const major = MAJORS[Math.floor(Math.random() * MAJORS.length)];
    const userInterests = INTERESTS.sort(() => 0.5 - Math.random()).slice(0, 3);
    
    const userRef = await addDoc(collection(db, 'users'), {
      name,
      email: `student${i}@example.com`,
      major,
      interests: userInterests,
      schoolId,
      role: 'student',
      bio: `I'm a ${major} student who loves ${userInterests.join(' and ')}.`,
      createdAt: new Date().toISOString(),
      isDummy: true
    });
    dummyUsers.push({ id: userRef.id, name });
  }

  console.log('Created 100 dummy users');

  // 2. Create random posts for these users
  for (const user of dummyUsers) {
    const postCount = Math.floor(Math.random() * 10) + 1; // 1-10 posts per user
    for (let j = 0; j < postCount; j++) {
      const text = POST_TEMPLATES[Math.floor(Math.random() * POST_TEMPLATES.length)];
      const hasImage = Math.random() > 0.5;
      
      await addDoc(collection(db, 'posts'), {
        authorId: user.id,
        schoolId,
        text,
        imageUrl: hasImage ? `https://picsum.photos/seed/${user.id}_${j}/800/600` : null,
        audience: 'campus',
        status: 'active',
        reactionCount: Math.floor(Math.random() * 50),
        replyCount: Math.floor(Math.random() * 10),
        reportCount: 0,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 1000000000)).toISOString()
      });
    }
  }

  console.log('Created random posts for dummy users');

  // 3. Create random follow relationships
  for (const user of dummyUsers) {
    const followCount = Math.floor(Math.random() * 20) + 5; // 5-25 follows per user
    const potentialFollowing = dummyUsers.filter(u => u.id !== user.id).sort(() => 0.5 - Math.random()).slice(0, followCount);
    
    for (const following of potentialFollowing) {
      await addDoc(collection(db, 'follows'), {
        followerId: user.id,
        followingId: following.id,
        createdAt: serverTimestamp()
      });
    }
  }

  console.log('Created random follow relationships');
  return true;
}
