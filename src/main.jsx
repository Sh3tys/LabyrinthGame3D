import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Suppress known, non-critical THREE.js library warnings
const originalWarn = console.warn;
console.warn = function(...args) {
  const message = args[0]?.toString() || '';
  
  // Suppress specific non-critical THREE.js warnings
  if (
    message.includes('THREE.FBXLoader: ShininessExponent map is not supported') ||
    message.includes('THREE.FBXLoader: Vertex has more than 4 skinning weights') ||
    message.includes('THREE.THREE.Clock: This module has been deprecated')
  ) {
    return; // Suppress these warnings
  }
  
  // Pass through all other warnings
  originalWarn.apply(console, args);
};

createRoot(document.getElementById('root')).render(
  <App />,
)
