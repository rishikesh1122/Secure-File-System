require('dotenv').config();  // Load env variables once at the very top

const express = require('express');
// const authenticate = require('./middleware/auth');
const uploadRoutes = require('./routes/upload');
const authRoutes = require('./routes/authRoutes');
const cors = require('cors'); 

const app = express();
app.use(express.json());
app.use(cors()); // Enable CORS for all routes
app.use('/api/upload', uploadRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/files', require('./routes/fileRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

