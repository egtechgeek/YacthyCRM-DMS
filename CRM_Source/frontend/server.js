// Add error handling at the top
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

let express;
try {
  express = require('express');
} catch (error) {
  console.error('ERROR: express module not found. Please run: npm install');
  process.exit(1);
}

const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Handle base path for subdirectory deployment (e.g., /frontend)
const BASE_PATH = process.env.BASE_PATH || '';
const basePathRegex = BASE_PATH ? new RegExp(`^${BASE_PATH.replace(/\//g, '\\/')}`) : null;

// Check if dist folder exists (production build)
const distPath = path.join(__dirname, 'dist');
const hasDist = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'));

if (hasDist) {
  // Production mode: serve static files from dist
  console.log('Serving production build from dist/');
  
  // Handle base path if configured
  if (BASE_PATH) {
    console.log(`Base path configured: ${BASE_PATH}`);
    app.use(BASE_PATH, express.static(distPath));
    
    // Handle React Router with base path
    app.get(`${BASE_PATH}/*`, (req, res) => {
      // Remove base path from request
      const filePath = req.path.replace(BASE_PATH, '') || '/index.html';
      res.sendFile(path.join(distPath, filePath === '/' ? 'index.html' : filePath));
    });
    
    // Redirect root to base path
    app.get('/', (req, res) => {
      res.redirect(BASE_PATH);
    });
  } else {
    // No base path - serve from root
    app.use(express.static(distPath));
    
    // Handle React Router - all routes return index.html
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
} else {
  // Development mode: serve from public and src (for Vite dev server)
  console.log('No dist folder found. Make sure to run: npm run build');
  console.log('Serving from public/ directory as fallback...');
  
  const publicPath = path.join(__dirname, 'public');
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
  }
  
  app.get('*', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Build Required</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #d32f2f; background: #ffebee; padding: 20px; border-radius: 5px; }
            .instructions { margin-top: 20px; text-align: left; max-width: 600px; margin-left: auto; margin-right: auto; }
            code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>Build Required</h1>
            <p>The frontend needs to be built before it can be served.</p>
          </div>
          <div class="instructions">
            <h3>In Plesk Node.js Plugin:</h3>
            <ol>
              <li>Go to your domain/subdomain in Plesk</li>
              <li>Navigate to <strong>Node.js</strong> settings</li>
              <li>Use the terminal or run commands to build:</li>
              <li>Run: <code>npm install</code></li>
              <li>Run: <code>npm run build</code></li>
              <li>Restart the Node.js application</li>
            </ol>
            <p><strong>Or use Plesk Terminal:</strong></p>
            <ol>
              <li>Navigate to your frontend directory</li>
              <li>Run <code>npm install</code></li>
              <li>Run <code>npm run build</code></li>
            </ol>
          </div>
        </body>
      </html>
    `);
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Server Error</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: #d32f2f; background: #ffebee; padding: 20px; border-radius: 5px; }
          code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>500 - Server Error</h1>
          <p>An error occurred: ${err.message}</p>
          <p>Check Plesk Node.js logs for details.</p>
        </div>
      </body>
    </html>
  `);
});

app.listen(PORT, (err) => {
  if (err) {
    console.error('ERROR: Failed to start server on port', PORT);
    console.error('Error details:', err);
    process.exit(1);
  }
  console.log(`Server is running on port ${PORT}`);
  if (hasDist) {
    console.log(`Production mode: Serving from ${distPath}`);
  } else {
    console.log(`⚠️  WARNING: Production build not found. Please run 'npm run build'`);
  }
});

