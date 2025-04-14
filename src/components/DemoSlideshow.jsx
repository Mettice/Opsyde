import React, { useState, useEffect } from 'react';

const DemoSlideshow = () => {
  // Use public URLs for images in the public folder
  const slides = [
    { 
      src: '/configure.png', // This will look in crewbuilder/public/
      caption: 'Design your agent workflow' 
    },
    { 
      src: '/connect.png',
      caption: 'Connect agents and tasks' 
    },
    { 
      src: '/demo-screenshot3.png',
      caption: 'Export to code with one click' 
    },
    { 
      src: '/preview.png',
      caption: 'Run your workflow in preview mode' 
    },
  ];
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [imageError, setImageError] = useState(false);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [slides.length]);
  
  const handleImageError = (index) => {
    console.error(`Failed to load image: ${slides[index].src}`);
    setImageError(true);
  };
  
  return (
    <div className="relative" style={{ height: '600px' }}>
      {imageError && (
        <div className="absolute top-0 left-0 right-0 bg-red-500 text-white p-2 z-20">
          Images failed to load. Check that these files exist in your public folder:
          <ul className="text-xs">
            {slides.map((slide, i) => (
              <li key={i}>{slide.src}</li>
            ))}
          </ul>
        </div>
      )}
      
      {slides.map((slide, index) => (
        <div 
          key={index}
          className={`transition-opacity duration-500 absolute inset-0 ${
            index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          <img 
            src={slide.src} 
            alt={`Demo slide ${index + 1}`} 
            className="w-full h-full object-contain bg-gray-100"
            onError={() => handleImageError(index)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-3 text-center">
            {slide.caption}
          </div>
        </div>
      ))}
      
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 z-0">
        <p className="text-gray-500 mb-2">Loading slideshow...</p>
        <p className="text-xs text-gray-400">
          If images don't appear, verify that demo-screenshot.png files exist in the public folder
        </p>
      </div>
    </div>
  );
};

export default DemoSlideshow; 