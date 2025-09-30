import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store.js";
import App from "./App.jsx";
import "./index.css";
import "react-toastify/dist/ReactToastify.css";

try {
  console.log('=== MAIN.JSX STARTING ===');
  
  const root = document.getElementById("root");
  console.log('Root element found:', !!root);
  
  if (!root) {
    throw new Error('Root element not found');
  }

  console.log('Creating React root...');
  const reactRoot = createRoot(root);
  
  console.log('Rendering App component...');
  reactRoot.render(
    <React.StrictMode>
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    </React.StrictMode>
  );
  
  console.log('✅ React app rendered successfully');
  
} catch (error) {
  console.error('❌ Error in main.jsx:', error);
  
  // Fallback HTML
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; color: red; font-family: monospace;">
        <h1>❌ React Failed to Load</h1>
        <p>Error: ${error.message}</p>
        <p>Check console for more details</p>
      </div>
    `;
  }
}
