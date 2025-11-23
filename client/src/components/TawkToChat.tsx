import { useEffect } from 'react';

/**
 * Tawk.to Live Chat Widget Component
 * 
 * To use this component:
 * 1. Sign up at https://www.tawk.to
 * 2. Get your Property ID and Widget ID from the dashboard
 * 3. Replace PROPERTY_ID and WIDGET_ID below with your actual IDs
 * 4. Add this component to your App.tsx or main layout
 */

export default function TawkToChat() {
  useEffect(() => {
    // Replace these with your actual Tawk.to IDs
    const PROPERTY_ID = 'YOUR_PROPERTY_ID'; // e.g., '5f1234567890abcdef123456'
    const WIDGET_ID = 'default'; // Usually 'default' unless you have multiple widgets
    
    // Only load if IDs are configured
    if (PROPERTY_ID === 'YOUR_PROPERTY_ID') {
      console.warn('Tawk.to chat widget not configured. Please add your Property ID and Widget ID.');
      return;
    }

    // Tawk.to script injection
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://embed.tawk.to/${PROPERTY_ID}/${WIDGET_ID}`;
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');
    
    // Configure Tawk.to to position on the left side (to avoid Aria on the right)
    (window as any).Tawk_API = (window as any).Tawk_API || {};
    (window as any).Tawk_LoadStart = new Date();
    
    // Position widget on bottom-left instead of bottom-right
    (window as any).Tawk_API.customStyle = {
      visibility: {
        desktop: {
          position: 'bl', // bottom-left
          xOffset: 20,
          yOffset: 20
        },
        mobile: {
          position: 'bl', // bottom-left
          xOffset: 10,
          yOffset: 10
        }
      }
    };
    
    document.body.appendChild(script);

    // Cleanup
    return () => {
      // Remove the script when component unmounts
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      
      // Remove Tawk.to widget elements
      const tawkWidget = document.getElementById('tawkchat-container');
      if (tawkWidget) {
        tawkWidget.remove();
      }
    };
  }, []);

  return null; // This component doesn't render anything visible
}

/**
 * Usage Instructions:
 * 
 * 1. Sign up for Tawk.to:
 *    - Go to https://www.tawk.to
 *    - Create a free account
 *    - Add a new property (your website)
 * 
 * 2. Get your IDs:
 *    - Go to Administration > Channels > Chat Widget
 *    - Copy your Property ID (looks like: 5f1234567890abcdef123456)
 *    - Copy your Widget ID (usually 'default')
 * 
 * 3. Configure the widget:
 *    - Replace PROPERTY_ID and WIDGET_ID in this file
 *    - Customize colors in Tawk.to dashboard to match your theme
 *    - Set welcome message and offline message
 * 
 * 4. Add to your app:
 *    - Import and add <TawkToChat /> to your App.tsx or main layout
 *    - The widget will appear in the bottom-left corner (Aria is on the right)
 * 
 * 5. Customization (in Tawk.to dashboard):
 *    - Widget appearance: Colors, position, size
 *    - Welcome message: First message visitors see
 *    - Offline message: Message when you're not available
 *    - Pre-chat form: Collect visitor info before chat
 *    - Triggers: Show chat based on visitor behavior
 */
