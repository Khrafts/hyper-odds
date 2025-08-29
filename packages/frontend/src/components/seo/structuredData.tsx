'use client';

import { useEffect } from 'react';

interface StructuredDataProps {
  data: object | null;
}

export function StructuredData({ data }: StructuredDataProps) {
  useEffect(() => {
    if (!data) return;
    
    // Only inject structured data on the client side to avoid hydration issues
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.innerHTML = JSON.stringify(data);
    script.id = 'structured-data-script';
    
    // Remove any existing structured data script first
    const existing = document.getElementById('structured-data-script');
    if (existing) {
      existing.remove();
    }
    
    document.head.appendChild(script);
    
    return () => {
      // Cleanup on unmount
      const scriptToRemove = document.getElementById('structured-data-script');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [data]);
  
  return null;
}