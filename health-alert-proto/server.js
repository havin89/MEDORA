const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());

// Get ML API URL from environment variable or use localhost
const ML_API_BASE_URL = process.env.ML_API_URL || 'http://localhost:5001';

// Middleware to inject ML API URL into HTML pages
app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path === '/') {
    const filePath = req.path === '/' 
      ? path.join(__dirname, 'public', 'index.html')
      : path.join(__dirname, 'public', req.path);
    
    if (fs.existsSync(filePath)) {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          return next();
        }
        // Inject ML API URL as a global variable
        const injectedData = data.replace(
          '</head>',
          `<script>window.ML_API_BASE_URL = '${ML_API_BASE_URL}';</script></head>`
        );
        res.send(injectedData);
      });
    } else {
      next();
    }
  } else {
    next();
  }
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🚀 Medora Health Alert Frontend');
  console.log(`📍 Server running on port ${PORT}`);
  console.log(`🔗 ML API: ${ML_API_BASE_URL}`);
});