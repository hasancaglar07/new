"use client";
import React from 'react';

const MobileLayout = ({ children, hideNavbar = false, isNativeApp, setIsNativeApp }) => {
    React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const isNative = document.body.classList.contains('native-app');
      setIsNativeApp(isNative);
    }
  }, [setIsNativeApp]);

  React.useEffect(() => {
    // Detect if running in WebView
    const isWebView = window.navigator.userAgent.includes('wv') || 
                     window.navigator.userAgent.includes('WebView') ||
                     window.ReactNativeWebView;

    if (isWebView) {
      // Add WebView-specific styles
      document.body.classList.add('webview-mode');
      
      // Prevent default zoom behavior
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
      }

      // Hide elements that shouldn't appear in mobile app
      if (hideNavbar) {
        const navbar = document.querySelector('.navbar, .header-nav, .main-nav');
        if (navbar) {
          navbar.style.display = 'none';
        }
      }

      // Add touch-friendly styles
      const style = document.createElement('style');
      style.textContent = `
        .webview-mode {
          font-size: 16px !important;
          line-height: 1.6 !important;
          -webkit-text-size-adjust: 100%;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        .webview-mode * {
          box-sizing: border-box;
        }
        
        .webview-mode img {
          max-width: 100% !important;
          height: auto !important;
        }
        
        .webview-mode button,
        .webview-mode a,
        .webview-mode input,
        .webview-mode select {
          min-height: 44px !important;
          padding: 12px !important;
          border-radius: 8px !important;
        }
        
        .webview-mode .container {
          padding: 10px !important;
          margin: 0 !important;
          max-width: 100% !important;
        }
        
        .webview-mode table {
          width: 100% !important;
          font-size: 14px !important;
          overflow-x: auto;
          display: block;
          white-space: nowrap;
        }
        
        .webview-mode .hidden-mobile {
          display: none !important;
        }
        
        .webview-mode .mobile-only {
          display: block !important;
        }
        
        .webview-mode pre {
          white-space: pre-wrap !important;
          word-wrap: break-word !important;
          overflow-x: auto !important;
        }
        
        .webview-mode .card {
          border-radius: 12px !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
          margin-bottom: 16px !important;
        }
        
        .webview-mode .text-responsive {
          font-size: clamp(14px, 4vw, 18px) !important;
        }
        
        @media (max-width: 768px) {
          .webview-mode .desktop-only {
            display: none !important;
          }
          
          .webview-mode .mobile-stack {
            flex-direction: column !important;
          }
          
          .webview-mode .mobile-full-width {
            width: 100% !important;
          }
        }
      `;
      document.head.appendChild(style);

      // Smooth scrolling for better mobile experience
      document.documentElement.style.scrollBehavior = 'smooth';

      // Prevent accidental zoom on double tap
      let lastTouchEnd = 0;
      document.addEventListener('touchend', function(event) {
        const now = new Date().getTime();
        if (now - lastTouchEnd <= 300) {
          event.preventDefault();
        }
        lastTouchEnd = now;
      }, false);
    }
  }, [hideNavbar]);

  return (
    <div className={`mobile-layout ${hideNavbar ? 'hide-navbar' : ''}`}>
      {children}
    </div>
  );
};

export default MobileLayout;