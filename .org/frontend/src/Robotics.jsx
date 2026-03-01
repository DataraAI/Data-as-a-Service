import React, { useState, useEffect } from 'react';
import './Robotics.css';

const ROBOTICS_URL = 'http://localhost:5002';

export default function Robotics() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [iframeError, setIframeError] = useState(false);

  useEffect(() => {
    const checkRoboticsAvailability = async () => {
      try {
        setIsLoading(true);
        // Try to check if the robotics system is running
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(ROBOTICS_URL, {
          method: 'HEAD',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Robotics system not available: ${response.status}`);
        }
        
        setError(null);
      } catch (err) {
        console.error('Robotics system check failed:', err);
        setError('Robotics system is not running on port 5002');
      } finally {
        setIsLoading(false);
      }
    };

    checkRoboticsAvailability();
  }, []);

  const handleRefresh = () => {
    setError(null);
    setIframeError(false);
    setIsLoading(true);
    // Re-check availability
    window.location.reload();
  };

  const handleIframeError = () => {
    setIframeError(true);
  };

  if (isLoading) {
    return (
      <div className="robotics-container">
        <div className="robotics-header">
          <h2>🤖 AI Robotics System</h2>
          <div className="robotics-controls">
            <button onClick={handleRefresh} className="refresh-btn">
              🔄 Refresh
            </button>
          </div>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading AI Robotics System...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="robotics-container">
        <div className="robotics-header">
          <h2>🤖 AI Robotics System</h2>
          <div className="robotics-controls">
            <button onClick={handleRefresh} className="refresh-btn">
              🔄 Retry
            </button>
          </div>
        </div>
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>Robotics System Unavailable</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={handleRefresh} className="retry-btn">
              Try Again
            </button>
            <a 
              href={ROBOTICS_URL} 
              target="_blank" 
              rel="noopener noreferrer"
              className="external-link-btn"
            >
              Open in New Tab
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (iframeError) {
    return (
      <div className="robotics-container">
        <div className="robotics-header">
          <h2>🤖 AI Robotics System</h2>
          <div className="robotics-controls">
            <button onClick={handleRefresh} className="refresh-btn">
              🔄 Retry
            </button>
          </div>
        </div>
        <div className="error-container">
          <div className="error-icon">🔒</div>
          <h3>Embedding Restricted</h3>
          <p>The robotics system cannot be embedded due to security restrictions. Please use the external link.</p>
          <div className="error-actions">
            <a 
              href={ROBOTICS_URL} 
              target="_blank" 
              rel="noopener noreferrer"
              className="external-link-btn"
            >
              🔗 Open in New Tab
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="robotics-container">
      <div className="robotics-header">
        <h2>🤖 AI Robotics System</h2>
        <div className="robotics-controls">
          <button onClick={handleRefresh} className="refresh-btn">
            🔄 Refresh
          </button>
          <a 
            href={ROBOTICS_URL} 
            target="_blank" 
            rel="noopener noreferrer"
            className="external-link-btn"
          >
            🔗 Open in New Tab
          </a>
        </div>
      </div>
      <div className="robotics-iframe-container">
        <iframe
          src={ROBOTICS_URL}
          title="AI Robotics System"
          className="robotics-iframe"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
          onError={handleIframeError}
          onLoad={() => {
            // Check if iframe loaded successfully
            setTimeout(() => {
              try {
                const iframe = document.querySelector('.robotics-iframe');
                if (iframe && iframe.contentWindow === null) {
                  handleIframeError();
                }
              } catch (e) {
                handleIframeError();
              }
            }, 2000);
          }}
        />
      </div>
    </div>
  );
}