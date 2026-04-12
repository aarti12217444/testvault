const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;

  // Purana student ID replace karo naye se
  await db.collection('users').updateOne(
    { _id: new mongoose.Types.ObjectId('69b24943ac3a8bcbb588ccb9') },
    { $set: { _id: new mongoose.Types.ObjectId('69b24943ac3a8bcbb588ccb9') } }
  );

  // Nandani ka sahi _id set karo
  // Pehle check karte hain dono documents
  const allNandani = await db.collection('users').find({ 
    role: 'student',
    instituteId: new mongoose.Types.ObjectId('69b24943ac3a8bcbb588ccb9')
  }).toArray();
  
  console.log('All student docs:', JSON.stringify(allNandani.map(s => ({
    _id: s._id,
    name: s.name,
    email: s.email
  })), null, 2));

  process.exit();
});