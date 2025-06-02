import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import DemoSlideshow from '../components/DemoSlideshow';
import Logo from '/nodai lo.png';

// Import SVG icons from src/public folder
import OpenAISVG from '../public/openai.svg';
import AnthropicSVG from '../public/anthropic.svg';
import PerplexitySVG from '../public/perplexity-color.svg';
import GeminiSVG from '../public/gemini-color.svg';
import CohereSVG from '../public/cohere-color.svg';
import MistralSVG from '../public/mistral-color.svg';
import OpenRouterSVG from '../public/openrouter.svg';
import HuggingFaceSVG from '../public/huggingface-color.svg';
import ReplicateSVG from '../public/replicate.svg';
import CrewAISVG from '../public/crewai-color.svg';
import LangChainSVG from '../public/langchain-color.svg';
import LlamaIndexSVG from '../public/llamaindex-color.svg';

// Beautiful SVG Icon Component with floating animations
const ProviderIcon = ({ src, name, size = 48, className = "" }) => {
  return (
    <div className={`relative group ${className}`}>
      <div 
        className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 hover:border-white/40 hover:bg-white/20 transition-all duration-500 hover:scale-110 hover:-translate-y-2 hover:shadow-2xl hover:shadow-purple-500/30"
        style={{ width: size + 24, height: size + 24 }}
      >
        <img 
          src={src} 
          alt={name}
          className="w-full h-full object-contain filter drop-shadow-lg group-hover:drop-shadow-2xl transition-all duration-300"
          style={{ width: size, height: size }}
        />
      </div>
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
        {name}
      </div>
    </div>
  );
};

// Floating News Bar Component with unicorn vibes! 🦄
const FloatingNewsBar = () => {
  const providers = [
    { name: "OpenAI", src: OpenAISVG },
    { name: "Anthropic", src: AnthropicSVG },
    { name: "Perplexity", src: PerplexitySVG },
    { name: "Google Gemini", src: GeminiSVG },
    { name: "Cohere", src: CohereSVG },
    { name: "Mistral", src: MistralSVG },
    { name: "OpenRouter", src: OpenRouterSVG },
    { name: "HuggingFace", src: HuggingFaceSVG },
    { name: "Replicate", src: ReplicateSVG }
  ];

  // Triple the providers for seamless infinite scroll
  const infiniteProviders = [...providers, ...providers, ...providers];

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-purple-900/20 via-pink-900/20 to-cyan-900/20 py-8 rounded-2xl border border-white/10">
      {/* Floating sparkles background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
        {/* Add some bigger sparkles */}
        {[...Array(8)].map((_, i) => (
          <div
            key={`big-${i}`}
            className="absolute w-2 h-2 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Gradient fade edges */}
      <div className="absolute left-0 top-0 w-20 h-full bg-gradient-to-r from-purple-900/20 to-transparent z-10"></div>
      <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-pink-900/20 to-transparent z-10"></div>

      {/* Scrolling news ticker content */}
      <div className="relative overflow-hidden py-4">
        <div className="flex animate-scroll-left whitespace-nowrap">
          {infiniteProviders.map((provider, index) => (
            <div
              key={`${provider.name}-${index}`}
              className="inline-flex items-center mx-8 group"
            >
              {/* Provider icon - bigger size */}
              <div className="w-12 h-12 mr-4 group-hover:scale-110 transition-transform duration-300">
                <img 
                  src={provider.src} 
                  alt={provider.name}
                  className="w-full h-full object-contain filter drop-shadow-lg"
                />
              </div>

              {/* Provider name with news ticker style */}
              <span className="text-white font-medium text-lg mr-4 group-hover:text-cyan-300 transition-colors duration-300">
                {provider.name}
              </span>

              {/* Status indicator */}
              <div className="flex items-center mr-6">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                <span className="text-green-400 text-sm font-medium">ACTIVE</span>
              </div>

              {/* Fun decorative elements */}
              <div className="flex items-center mr-4">
                <span className="text-purple-400 text-lg animate-pulse">✨</span>
                <span className="text-cyan-400 text-lg animate-pulse mx-1">💫</span>
                <span className="text-pink-400 text-lg animate-pulse">⭐</span>
              </div>

              {/* Separator */}
              <div className="text-white/30 text-2xl">•</div>
            </div>
          ))}
        </div>
      </div>

      {/* News ticker label */}
      <div className="absolute left-4 top-4 bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider z-20">
        🦄 LIVE LLMs
      </div>

      {/* Fun corner decorations */}
      <div className="absolute top-2 right-4 text-purple-400 text-xl animate-bounce">🌟</div>
      <div className="absolute bottom-2 right-8 text-cyan-400 text-lg animate-pulse">💎</div>
    </div>
  );
};

// Floating Frameworks Bar Component with even more unicorn vibes! 🦄✨
const FloatingFrameworksBar = () => {
  const frameworks = [
    { name: "CrewAI", src: CrewAISVG },
    { name: "LangChain", src: LangChainSVG },
    { name: "LlamaIndex", src: LlamaIndexSVG },
    { name: "AutoGen", icon: "🤖" } // Using emoji for AutoGen since no SVG
  ];

  // Triple the frameworks for seamless infinite scroll
  const infiniteFrameworks = [...frameworks, ...frameworks, ...frameworks];

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-orange-900/20 via-red-900/20 to-purple-900/20 py-8 rounded-2xl border border-white/10">
      {/* Floating sparkles background with different colors */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(25)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-orange-300 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
        {/* Add some bigger sparkles */}
        {[...Array(10)].map((_, i) => (
          <div
            key={`big-${i}`}
            className="absolute w-2 h-2 bg-gradient-to-r from-orange-400 to-red-400 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}
        {/* Add some floating emojis */}
        {['🚀', '⚡', '🔥', '💫', '✨'].map((emoji, i) => (
          <div
            key={`emoji-${i}`}
            className="absolute text-lg animate-float opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${4 + Math.random() * 3}s`
            }}
          >
            {emoji}
          </div>
        ))}
      </div>

      {/* Gradient fade edges */}
      <div className="absolute left-0 top-0 w-20 h-full bg-gradient-to-r from-orange-900/20 to-transparent z-10"></div>
      <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-purple-900/20 to-transparent z-10"></div>

      {/* Scrolling news ticker content */}
      <div className="relative overflow-hidden py-4">
        <div className="flex animate-scroll-left whitespace-nowrap" style={{ animationDirection: 'reverse' }}>
          {infiniteFrameworks.map((framework, index) => (
            <div
              key={`${framework.name}-${index}`}
              className="inline-flex items-center mx-8 group"
            >
              {/* Framework icon - bigger size */}
              <div className="w-12 h-12 mr-4 group-hover:scale-110 transition-transform duration-300">
                {framework.src ? (
                  <img 
                    src={framework.src} 
                    alt={framework.name}
                    className="w-full h-full object-contain filter drop-shadow-lg"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl">
                    {framework.icon}
                  </div>
                )}
              </div>

              {/* Framework name with news ticker style */}
              <span className="text-white font-medium text-lg mr-4 group-hover:text-orange-300 transition-colors duration-300">
                {framework.name}
              </span>

              {/* Status indicator */}
              <div className="flex items-center mr-6">
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse mr-2"></div>
                <span className="text-orange-400 text-sm font-medium">READY</span>
              </div>

              {/* Fun decorative elements */}
              <div className="flex items-center mr-4">
                <span className="text-orange-400 text-lg animate-pulse">🔥</span>
                <span className="text-red-400 text-lg animate-pulse mx-1">⚡</span>
                <span className="text-purple-400 text-lg animate-pulse">🚀</span>
              </div>

              {/* Separator */}
              <div className="text-white/30 text-2xl">•</div>
            </div>
          ))}
        </div>
      </div>

      {/* News ticker label */}
      <div className="absolute left-4 top-4 bg-gradient-to-r from-orange-600 to-red-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider z-20">
        🦄 LIVE FRAMEWORKS
      </div>

      {/* Fun corner decorations */}
      <div className="absolute top-2 right-4 text-orange-400 text-xl animate-bounce">🔥</div>
      <div className="absolute bottom-2 right-8 text-red-400 text-lg animate-pulse">⚡</div>
      <div className="absolute top-1/2 right-2 text-purple-400 text-sm animate-ping">💫</div>
    </div>
  );
};

// Custom hook for scroll-triggered animations
const useScrollAnimation = () => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return [ref, isVisible];
};

// Testimonials component with enhanced animations
const TestimonialsSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ref, isVisible] = useScrollAnimation();
  
  const testimonials = [
    {
      id: 1,
      name: "Alex Chen",
      role: "Lead Developer, TechFuse",
      image: "/api/placeholder/64/64",
      text: "NODAI has revolutionized how we build and deploy AI workflows. What used to take days now takes hours, and the visual interface makes our entire team more productive."
    },
    {
      id: 2,
      name: "Sarah Johnson",
      role: "AI Product Manager, Innovate AI",
      image: "/api/placeholder/64/64",
      text: "The ability to visually design workflows and connect any API with AI research is a game-changer. Our non-technical stakeholders can now participate in the AI design process."
    },
    {
      id: 3,
      name: "Michael Torres",
      role: "CTO, AgentStack",
      image: "/api/placeholder/64/64",
      text: "NODAI's Universal API framework and BYOK integration solved our biggest pain points. We can now connect to any service securely with our own API keys."
    }
  ];

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <div 
      ref={ref}
      className={`relative overflow-hidden bg-gray-900 rounded-xl p-8 shadow-lg transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
    >
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-gray-900 to-purple-900 opacity-90"></div>
      
      <div className="relative z-10">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-white">What Developers Say</h3>
        </div>
        
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center bg-gray-800 bg-opacity-50 rounded-xl p-6 shadow-lg border border-purple-500 border-opacity-30 hover:border-opacity-60 hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-500">
            <div className="mr-6">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-cyan-400 shadow-lg shadow-cyan-400/20 hover:scale-110 transition-transform duration-300">
                <img src={testimonials[currentIndex].image} alt={testimonials[currentIndex].name} className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-white text-lg italic mb-4 hover:text-gray-100 transition-colors">"{testimonials[currentIndex].text}"</p>
              <div className="flex items-center">
                <span className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">{testimonials[currentIndex].name}</span>
                <span className="mx-2 text-gray-400">|</span>
                <span className="text-gray-300">{testimonials[currentIndex].role}</span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center mt-6 space-x-4">
            <button 
              onClick={prevSlide}
              className="p-2 rounded-full bg-gray-800 text-white hover:bg-purple-900 hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-purple-500/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex space-x-2">
              {testimonials.map((_, index) => (
                <button 
                  key={index} 
                  onClick={() => setCurrentIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 hover:scale-125 ${
                    index === currentIndex ? 'bg-cyan-400 shadow-lg shadow-cyan-400/50' : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
            <button 
              onClick={nextSlide}
              className="p-2 rounded-full bg-gray-800 text-white hover:bg-purple-900 hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-purple-500/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// NODAI Interactive Workflow Visual with enhanced animations
const NODAIWorkflowVisual = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [activeNode, setActiveNode] = useState(0);
  const [ref, isVisible] = useScrollAnimation();
  
  // Cycle through nodes automatically
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveNode((prev) => (prev + 1) % 4);
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  
  const nodes = [
    { name: "CrewAI", color: "from-orange-500 to-red-500", icon: "🤖" },
    { name: "Universal API", color: "from-cyan-500 to-blue-500", icon: "🔗" },
    { name: "LangChain", color: "from-green-500 to-emerald-500", icon: "⛓️" },
    { name: "Output", color: "from-purple-500 to-pink-500", icon: "✨" }
  ];
  
  return (
    <div 
      ref={ref}
      className={`relative w-80 h-80 mx-auto transition-all duration-1000 ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Central NODAI Logo */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
        <div className={`w-20 h-20 bg-gradient-to-br from-purple-600 to-cyan-400 rounded-2xl flex items-center justify-center transition-all duration-500 ${
          isHovered ? 'scale-110 rotate-12 shadow-2xl shadow-purple-500/50' : 'scale-100 shadow-2xl shadow-purple-500/30'
        }`}>
          <img src={Logo} alt="NODAI" className="w-12 h-12" />
        </div>
      </div>
      
      {/* Orbiting Framework Nodes */}
      {nodes.map((node, index) => {
        const angle = (index * 90) - 90; // Start from top
        const radius = 120;
        const x = Math.cos((angle * Math.PI) / 180) * radius;
        const y = Math.sin((angle * Math.PI) / 180) * radius;
        const isActive = activeNode === index;
        
        return (
          <div
            key={index}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000"
            style={{
              transform: `translate(${x}px, ${y}px) translate(-50%, -50%) ${isActive ? 'scale(1.2)' : 'scale(1)'}`,
            }}
          >
            <div className={`w-16 h-16 bg-gradient-to-br ${node.color} rounded-xl flex items-center justify-center shadow-lg transition-all duration-500 hover:scale-110 cursor-pointer ${
              isActive ? 'shadow-2xl animate-pulse' : 'shadow-md'
            }`}>
              <span className="text-2xl">{node.icon}</span>
            </div>
            <div className={`text-center mt-2 text-sm font-medium transition-all duration-500 ${
              isActive ? 'text-white scale-110' : 'text-gray-400'
            }`}>
              {node.name}
            </div>
            
            {/* Connection Line to Center */}
            <div 
              className={`absolute top-8 left-8 w-px bg-gradient-to-b transition-all duration-1000 ${
                isActive ? 'from-white to-purple-400 opacity-100' : 'from-gray-600 to-gray-800 opacity-30'
              }`}
              style={{
                height: `${radius - 40}px`,
                transform: `rotate(${angle + 180}deg)`,
                transformOrigin: 'top center'
              }}
            />
          </div>
        );
      })}
      
      {/* Pulsing Ring Effect */}
      {isHovered && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-64 h-64 border-2 border-purple-400/30 rounded-full animate-ping"></div>
          <div className="absolute top-4 left-4 w-56 h-56 border border-cyan-400/20 rounded-full animate-pulse"></div>
        </div>
      )}
    </div>
  );
};

// Animated Value Proposition Cards
const AnimatedValueCard = ({ children, delay = 0 }) => {
  const [ref, isVisible] = useScrollAnimation();
  
  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// Animated Background Component - Neural Network Constellation! 🌟
const AnimatedBackground = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Base gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900/10 to-cyan-900/10 animate-gradient"></div>
      
      {/* Floating gradient orbs */}
      {[...Array(6)].map((_, i) => (
        <div
          key={`orb-${i}`}
          className="absolute rounded-full opacity-20 animate-float"
          style={{
            width: `${100 + i * 50}px`,
            height: `${100 + i * 50}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: `radial-gradient(circle, ${
              ['rgba(147, 51, 234, 0.3)', 'rgba(6, 182, 212, 0.3)', 'rgba(236, 72, 153, 0.3)', 'rgba(251, 146, 60, 0.3)'][i % 4]
            } 0%, transparent 70%)`,
            animationDelay: `${i * 2}s`,
            animationDuration: `${8 + i * 2}s`
          }}
        />
      ))}

      {/* Neural network nodes */}
      {[...Array(12)].map((_, i) => (
        <div
          key={`node-${i}`}
          className="absolute w-2 h-2 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full animate-pulse"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 2}s`
          }}
        />
      ))}

      {/* Connection lines */}
      <svg className="absolute inset-0 w-full h-full">
        {[...Array(8)].map((_, i) => {
          const x1 = Math.random() * 100;
          const y1 = Math.random() * 100;
          const x2 = Math.random() * 100;
          const y2 = Math.random() * 100;
          return (
            <line
              key={`line-${i}`}
              x1={`${x1}%`}
              y1={`${y1}%`}
              x2={`${x2}%`}
              y2={`${y2}%`}
              stroke="url(#gradient)"
              strokeWidth="1"
              opacity="0.1"
              className="animate-pulse"
              style={{
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            />
          );
        })}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>

      {/* Interactive particles that follow mouse */}
      {[...Array(5)].map((_, i) => (
        <div
          key={`particle-${i}`}
          className="absolute w-1 h-1 bg-white rounded-full opacity-60 transition-all duration-1000 ease-out"
          style={{
            left: mousePos.x + Math.sin(Date.now() * 0.001 + i) * 50,
            top: mousePos.y + Math.cos(Date.now() * 0.001 + i) * 50,
            transform: `translate(-50%, -50%) scale(${0.5 + Math.sin(Date.now() * 0.002 + i) * 0.5})`
          }}
        />
      ))}

      {/* Floating code snippets (very subtle) */}
      {['AI', 'ML', '🤖', '⚡', '🚀', '💫'].map((text, i) => (
        <div
          key={`code-${i}`}
          className="absolute text-purple-300/10 text-sm font-mono animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${i * 3}s`,
            animationDuration: `${10 + Math.random() * 5}s`
          }}
        >
          {text}
        </div>
      ))}

      {/* Corner decorative elements */}
      <div className="absolute top-10 right-10 text-6xl text-purple-400/20 animate-pulse">✨</div>
      <div className="absolute bottom-10 left-10 text-4xl text-cyan-400/20 animate-bounce">🦄</div>
      <div className="absolute top-1/3 left-10 text-3xl text-pink-400/20 animate-ping">💎</div>
      <div className="absolute bottom-1/3 right-10 text-5xl text-orange-400/20 animate-pulse">🌟</div>
    </div>
  );
};

export default function HomePage() {
  const [heroRef, heroVisible] = useScrollAnimation();
  const [featuresRef, featuresVisible] = useScrollAnimation();

  return (
    <main className="min-h-screen bg-gray-900 text-white overflow-hidden relative">
      {/* 🌟 ANIMATED BACKGROUND - Neural Network Constellation! */}
      <AnimatedBackground />
      
      {/* Header - Full width navigation bar with hover animations */}
      <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div className="flex items-center gap-3 group">
            <img src={Logo} alt="NODAI Logo" className="h-12 w-12 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12" />
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-cyan-400 transition-all duration-300 group-hover:scale-110">NODAI</h1>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-gray-300 hover:text-cyan-400 font-medium transition-all duration-300 hover:scale-105 relative group">
              Features
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-cyan-400 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#frameworks" className="text-gray-300 hover:text-cyan-400 font-medium transition-all duration-300 hover:scale-105 relative group">
              Frameworks
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-cyan-400 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#demo" className="text-gray-300 hover:text-cyan-400 font-medium transition-all duration-300 hover:scale-105 relative group">
              Demo
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-cyan-400 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#testimonials" className="text-gray-300 hover:text-cyan-400 font-medium transition-all duration-300 hover:scale-105 relative group">
              Testimonials
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-cyan-400 transition-all duration-300 group-hover:w-full"></span>
            </a>
          </div>
          <Link 
            to="/builder"
            className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-500 hover:to-red-500 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/30 font-semibold"
          >
            Get started for free
          </Link>
        </div>
      </header>

      {/* Hero Section with staggered animations */}
      <div className="relative min-h-screen flex items-center z-10">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/50 via-purple-900/10 to-cyan-900/10"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent"></div>
        
        <div ref={heroRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Content with staggered animations */}
            <div className="text-left">
              <div className={`mb-6 transition-all duration-1000 ${
                heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}>
                <span className="inline-block px-4 py-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-full text-orange-400 text-sm font-medium hover:scale-105 transition-transform duration-300">
                  🚀 Next-Generation AI Workflows
                </span>
              </div>
              
              <h1 className={`text-6xl lg:text-7xl font-extrabold leading-tight mb-8 transition-all duration-1000 delay-200 ${
                heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}>
                <span className="text-white hover:text-gray-100 transition-colors duration-300">Intelligent AI workflow</span><br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 transition-all duration-300">automation</span><br />
                <span className="text-gray-300 text-4xl lg:text-5xl hover:text-gray-200 transition-colors duration-300">for AI teams</span>
              </h1>
              
              <p className={`text-xl text-gray-300 leading-relaxed mb-8 max-w-2xl transition-all duration-1000 delay-400 hover:text-gray-200 ${
                heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}>
                Build with the precision of code or the speed of drag-n-drop. Host with 
                enterprise security or cloud convenience. NODAI gives you more 
                freedom to implement multi-framework AI workflows than any other tool.
              </p>
              
              <div className={`flex flex-col sm:flex-row gap-4 mb-12 transition-all duration-1000 delay-600 ${
                heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}>
                <Link
                  to="/builder"
                  className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg text-lg font-semibold hover:from-orange-500 hover:to-red-500 transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 hover:shadow-xl hover:shadow-orange-500/30 text-center"
                >
                  Get started for free
                </Link>
                <a 
                  href="mailto:hello@nodai.io" 
                  className="px-8 py-4 bg-transparent border-2 border-gray-600 text-gray-300 rounded-lg text-lg font-semibold hover:border-cyan-400 hover:text-cyan-400 hover:bg-cyan-400/5 transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 text-center"
                >
                  Talk to sales
                </a>
              </div>
            </div>
            
            {/* Right side - NODAI Workflow Visual */}
            <div className="relative">
              <NODAIWorkflowVisual />
            </div>
          </div>
          
          {/* NODAI Unique Value Props with staggered animations */}
          <div className="mt-24">
            <div className={`text-center mb-12 transition-all duration-1000 ${
              heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`} style={{ transitionDelay: '800ms' }}>
              <h3 className="text-2xl font-bold text-white mb-4 hover:text-gray-100 transition-colors duration-300">
                Why developers choose NODAI over everything else
              </h3>
              <p className="text-gray-400 hover:text-gray-300 transition-colors duration-300">The only platform that combines visual workflow building with enterprise-grade AI orchestration</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Multi-Framework Orchestration */}
              <AnimatedValueCard delay={200}>
                <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-8 hover:border-purple-400/50 hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-2 transition-all duration-500 group">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                      <span className="text-2xl">🧠</span>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white mb-3 group-hover:text-purple-200 transition-colors duration-300">Multi-Framework AI Orchestration</h4>
                      <p className="text-gray-300 leading-relaxed group-hover:text-gray-200 transition-colors duration-300">
                        Mix and match CrewAI, LangChain, AutoGen, and more in a single workflow. 
                        No vendor lock-in, no limitations - just pure AI power.
                      </p>
                      <div className="flex gap-2 mt-4">
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm hover:bg-purple-500/30 hover:scale-105 transition-all duration-300">CrewAI</span>
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm hover:bg-purple-500/30 hover:scale-105 transition-all duration-300">LangChain</span>
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm hover:bg-purple-500/30 hover:scale-105 transition-all duration-300">AutoGen</span>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimatedValueCard>

              {/* Universal API Research */}
              <AnimatedValueCard delay={400}>
                <div className="bg-gradient-to-br from-cyan-900/30 to-cyan-800/20 backdrop-blur-sm border border-cyan-500/30 rounded-2xl p-8 hover:border-cyan-400/50 hover:shadow-2xl hover:shadow-cyan-500/20 hover:-translate-y-2 transition-all duration-500 group">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                      <span className="text-2xl">🔍</span>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-200 transition-colors duration-300">AI-Powered API Discovery</h4>
                      <p className="text-gray-300 leading-relaxed group-hover:text-gray-200 transition-colors duration-300">
                        Just describe what you need. Our AI researches, configures, and integrates 
                        any API automatically. No more reading docs or writing boilerplate.
                      </p>
                      <div className="flex items-center gap-2 mt-4 text-cyan-300 group-hover:text-cyan-200 transition-colors duration-300">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <span className="text-sm">Auto-configuration in seconds</span>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimatedValueCard>

              {/* Enterprise Security */}
              <AnimatedValueCard delay={600}>
                <div className="bg-gradient-to-br from-orange-900/30 to-orange-800/20 backdrop-blur-sm border border-orange-500/30 rounded-2xl p-8 hover:border-orange-400/50 hover:shadow-2xl hover:shadow-orange-500/20 hover:-translate-y-2 transition-all duration-500 group">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                      <span className="text-2xl">🔐</span>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white mb-3 group-hover:text-orange-200 transition-colors duration-300">Enterprise BYOK Security</h4>
                      <p className="text-gray-300 leading-relaxed group-hover:text-gray-200 transition-colors duration-300">
                        Your API keys, your data, your control. Military-grade encryption 
                        with zero-trust architecture. SOC2 compliant from day one.
                      </p>
                      <div className="flex items-center gap-2 mt-4 text-orange-300 group-hover:text-orange-200 transition-colors duration-300">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd"/>
                        </svg>
                        <span className="text-sm">Zero data exposure guarantee</span>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimatedValueCard>

              {/* Visual + Code Flexibility */}
              <AnimatedValueCard delay={800}>
                <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 backdrop-blur-sm border border-green-500/30 rounded-2xl p-8 hover:border-green-400/50 hover:shadow-2xl hover:shadow-green-500/20 hover:-translate-y-2 transition-all duration-500 group">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                      <span className="text-2xl">⚡</span>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white mb-3 group-hover:text-green-200 transition-colors duration-300">Visual + Code Flexibility</h4>
                      <p className="text-gray-300 leading-relaxed group-hover:text-gray-200 transition-colors duration-300">
                        Drag-and-drop for speed, code for precision. Switch between visual 
                        and code modes seamlessly. Perfect for both technical and non-technical teams.
                      </p>
                      <div className="flex gap-2 mt-4">
                        <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm hover:bg-green-500/30 hover:scale-105 transition-all duration-300">Visual Builder</span>
                        <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm hover:bg-green-500/30 hover:scale-105 transition-all duration-300">Code Mode</span>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimatedValueCard>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Demo Section - Visual like n8n */}
      <div className="py-24 bg-gray-800/30 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            ref={featuresRef}
            className={`text-center mb-16 transition-all duration-1000 ${
              featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <h2 className="text-4xl font-bold text-white mb-4 hover:text-gray-100 transition-colors duration-300">
              The world's most advanced AI workflow platform for technical teams including
            </h2>
            
            {/* Company Logos with staggered animations */}
            <div className="flex justify-center items-center gap-12 mt-12 opacity-60">
              {['OpenAI', 'Anthropic', 'HuggingFace', 'Perplexity'].map((company, index) => (
                <div 
                  key={company}
                  className={`text-2xl font-bold text-gray-400 hover:text-gray-300 hover:scale-110 transition-all duration-500 cursor-pointer ${
                    featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
                  }`}
                  style={{ transitionDelay: `${index * 100 + 200}ms` }}
                >
                  {company}
                </div>
              ))}
            </div>
          </div>
          
          {/* Interactive Workflow Demo */}
          <div className={`bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 shadow-2xl hover:border-gray-600 hover:shadow-3xl transition-all duration-500 ${
            featuresVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`} style={{ transitionDelay: '600ms' }}>
            <DemoSlideshow />
          </div>
        </div>
      </div>

      {/* Social Proof Section with enhanced animations */}
      <div className="py-16 bg-gray-900/50 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: (
                  <svg className="w-8 h-8 text-purple-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                ),
                number: "9+",
                title: "LLM Providers",
                subtitle: "OpenAI, Anthropic, Perplexity, Google, Cohere, Groq, Mistral + more"
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                  </svg>
                ),
                number: "4+",
                title: "AI Frameworks",
                subtitle: "CrewAI, LangChain, LlamaIndex, AutoGen"
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-cyan-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                ),
                number: "∞",
                title: "APIs Discoverable",
                subtitle: "AI-powered API research and configuration"
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-orange-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd"/>
                  </svg>
                ),
                number: "BYOK",
                title: "Enterprise Security",
                subtitle: "Your keys, your data, your control"
              }
            ].map((item, index) => {
              const [ref, isVisible] = useScrollAnimation();
              return (
                <div 
                  key={index}
                  ref={ref}
                  className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 text-center hover:border-gray-600 hover:bg-gray-800/70 hover:-translate-y-2 hover:shadow-xl transition-all duration-500 group ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                  }`}
                  style={{ transitionDelay: `${index * 200}ms` }}
                >
                  <div className="flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                    <span className="text-2xl font-bold text-white group-hover:text-gray-100 transition-colors duration-300">{item.number}</span>
                  </div>
                  <div className="text-gray-300 group-hover:text-white transition-colors duration-300">{item.title}</div>
                  <div className="text-sm text-gray-400 mt-2 group-hover:text-gray-300 transition-colors duration-300">{item.subtitle}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI Integration Section with enhanced animations */}
      <div className="py-24 bg-gradient-to-br from-purple-900/20 to-cyan-900/20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedValueCard>
            <h2 className="text-5xl font-bold text-white mb-4 hover:text-gray-100 transition-colors duration-300">
              Connect any LLM provider with
            </h2>
            <h3 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500 mb-16 hover:from-orange-400 hover:to-red-400 transition-all duration-300">
              any AI framework
            </h3>
          </AnimatedValueCard>
          
          {/* LLM Providers Section */}
          <div className="mb-20">
            <AnimatedValueCard delay={200}>
              <h4 className="text-3xl font-bold text-white mb-8 hover:text-gray-100 transition-colors duration-300">
                🤖 LLM Providers
              </h4>
              <p className="text-gray-400 mb-12 text-lg hover:text-gray-300 transition-colors duration-300">
                Bring your own API keys and connect to any LLM provider
              </p>
            </AnimatedValueCard>
            
            {/* 🦄 FLOATING NEWS BAR - Unicorn vibes! */}
            <FloatingNewsBar />
          </div>

          {/* AI Frameworks Section */}
          <div>
            <AnimatedValueCard delay={400}>
              <h4 className="text-3xl font-bold text-white mb-8 hover:text-gray-100 transition-colors duration-300">
                ⚡ AI Frameworks
              </h4>
              <p className="text-gray-400 mb-12 text-lg hover:text-gray-300 transition-colors duration-300">
                Build with the most powerful AI orchestration frameworks
              </p>
            </AnimatedValueCard>
            
            {/* 🦄 FLOATING FRAMEWORKS BAR - Even more unicorn vibes! */}
            <FloatingFrameworksBar />
          </div>
        </div>
      </div>

      {/* Features Section with enhanced animations */}
      <div id="features" className="py-24 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedValueCard>
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4 hover:text-gray-100 transition-colors duration-300">
                The fast way to actually
              </h2>
              <h3 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 transition-all duration-300">
                get AI working in your business
              </h3>
            </div>
          </AnimatedValueCard>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left side - Build multi-step agents */}
            <AnimatedValueCard delay={200}>
              <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 hover:border-gray-600 hover:bg-gray-800/50 hover:-translate-y-2 hover:shadow-2xl transition-all duration-500 group">
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-gray-100 transition-colors duration-300">Build multi-framework AI workflows</h3>
                <p className="text-gray-300 mb-6 group-hover:text-gray-200 transition-colors duration-300">
                  Create intelligent systems on a single screen. 
                  Integrate any AI framework into your workflows as fast 
                  as you can drag-n-drop.
                </p>
                <Link
                  to="/builder"
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-500 hover:scale-105 hover:-translate-y-1 transition-all duration-300"
                >
                  Explore AI →
                </Link>
                
                {/* Workflow Preview with animations */}
                <div className="mt-8 bg-gray-900/50 rounded-xl p-4 hover:bg-gray-900/70 transition-all duration-300">
                  <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                    <span className="group-hover:text-gray-300 transition-colors duration-300">🔄 Workflow Running</span>
                    <span className="group-hover:text-gray-300 transition-colors duration-300">⚡ Real-time Execution</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-green-400 hover:text-green-300 transition-colors duration-300">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                      <span className="text-sm">✓ API Research Completed</span>
                    </div>
                    <div className="flex items-center text-blue-400 hover:text-blue-300 transition-colors duration-300">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></span>
                      <span className="text-sm">🔄 Running CrewAI Agent</span>
                    </div>
                    <div className="flex items-center text-gray-400 hover:text-gray-300 transition-colors duration-300">
                      <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                      <span className="text-sm">⏳ LangChain Processing</span>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedValueCard>
            
            {/* Right side - Chat with your data */}
            <AnimatedValueCard delay={400}>
              <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 hover:border-gray-600 hover:bg-gray-800/50 hover:-translate-y-2 hover:shadow-2xl transition-all duration-500 group">
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-gray-100 transition-colors duration-300">Research APIs with AI</h3>
                <p className="text-gray-300 mb-6 group-hover:text-gray-200 transition-colors duration-300">
                  Use AI-powered research to discover, configure, and integrate 
                  any API automatically. Get accurate answers from your data, create 
                  tasks, and complete workflows.
                </p>
                
                {/* Chat Interface Preview with animations */}
                <div className="bg-gray-900/50 rounded-xl p-4 hover:bg-gray-900/70 transition-all duration-300">
                  <div className="space-y-3">
                    <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-3 hover:border-blue-500/50 transition-all duration-300">
                      <div className="text-sm text-blue-400 mb-1">You</div>
                      <div className="text-white text-sm">Research the Stripe API for payment processing</div>
                    </div>
                    <div className="bg-gray-700/50 border border-gray-600/30 rounded-lg p-3 hover:border-gray-600/50 transition-all duration-300">
                      <div className="text-sm text-cyan-400 mb-1">NODAI AI</div>
                      <div className="text-white text-sm">✅ Found Stripe API configuration:<br/>
                      • Base URL: https://api.stripe.com<br/>
                      • Auth: Bearer token required<br/>
                      • Ready to integrate!</div>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedValueCard>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div id="testimonials" className="py-24 bg-gray-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedValueCard>
            <h2 className="text-3xl font-bold text-center mb-16 text-white hover:text-gray-100 transition-colors duration-300">
              <span className="border-b-4 border-orange-500 pb-2 hover:border-orange-400 transition-colors duration-300">Developer Testimonials</span>
            </h2>
          </AnimatedValueCard>
          
          <TestimonialsSlider />
        </div>
      </div>

      {/* Final CTA Section with enhanced animations */}
      <div className="py-24 bg-gradient-to-br from-purple-900 to-cyan-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-500/10 via-transparent to-transparent animate-pulse"></div>
        
        <AnimatedValueCard>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h2 className="text-5xl font-bold mb-6 hover:text-gray-100 transition-colors duration-300">
              There's nothing you<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 transition-all duration-300">can't automate with NODAI.</span>
            </h2>
            
            <p className="text-xl text-cyan-100 mb-2 hover:text-cyan-50 transition-colors duration-300">Our customer's words, not ours.</p>
            <p className="text-xl text-cyan-100 mb-8 hover:text-cyan-50 transition-colors duration-300">
              Skeptical? <span className="text-orange-400 font-semibold cursor-pointer hover:underline hover:text-orange-300 transition-all duration-300">Try it out</span>, and see for yourself.
            </p>
            
            <Link
              to="/builder"
              className="inline-block px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg text-lg font-semibold hover:from-orange-500 hover:to-red-500 transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 hover:shadow-xl hover:shadow-orange-500/30"
            >
              Start building
            </Link>
          </div>
        </AnimatedValueCard>
      </div>

      {/* Footer with enhanced animations */}
      <footer className="bg-gray-900 text-white py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <AnimatedValueCard>
              <div className="col-span-1">
                <div className="flex items-center gap-3 mb-6 group">
                  <img src={Logo} alt="NODAI Logo" className="h-10 w-10 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                  <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-cyan-400 group-hover:scale-105 transition-transform duration-300">NODAI</h1>
                </div>
                <p className="text-gray-400 mb-6 hover:text-gray-300 transition-colors duration-300">
                  Building the future of AI workflows, one visual connection at a time.
                </p>
                <div className="flex space-x-4">
                  <a href="#" className="text-gray-400 hover:text-cyan-400 hover:scale-110 transition-all duration-300" aria-label="Twitter">
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                    </svg>
                  </a>
                  <a href="#" className="text-gray-400 hover:text-cyan-400 hover:scale-110 transition-all duration-300" aria-label="GitHub">
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                  </a>
                </div>
              </div>
            </AnimatedValueCard>
            
            <div className="col-span-3 grid grid-cols-3 gap-8">
              {[
                {
                  title: "Product",
                  links: [
                    { name: "Features", href: "#features" },
                    { name: "Frameworks", href: "#frameworks" },
                    { name: "Demo", href: "#demo" }
                  ]
                },
                {
                  title: "Company",
                  links: [
                    { name: "About", href: "#" },
                    { name: "Blog", href: "#" },
                    { name: "Contact", href: "mailto:hello@nodai.io" }
                  ]
                },
                {
                  title: "Legal",
                  links: [
                    { name: "Privacy", href: "#" },
                    { name: "Terms", href: "#" }
                  ]
                }
              ].map((section, sectionIndex) => (
                <AnimatedValueCard key={section.title} delay={sectionIndex * 100}>
                  <div>
                    <h3 className="text-lg font-semibold mb-4 hover:text-gray-100 transition-colors duration-300">{section.title}</h3>
                    <ul className="space-y-2">
                      {section.links.map((link) => (
                        <li key={link.name}>
                          <a href={link.href} className="text-gray-400 hover:text-cyan-400 hover:translate-x-1 transition-all duration-300 inline-block">
                            {link.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </AnimatedValueCard>
              ))}
            </div>
          </div>
          
          <AnimatedValueCard delay={400}>
            <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-400">
              <p className="hover:text-gray-300 transition-colors duration-300">© {new Date().getFullYear()} NODAI. All rights reserved.</p>
              <p className="mt-2 text-sm hover:text-gray-300 transition-colors duration-300">Built with ❤️ for the AI community - Supporting CrewAI, LangChain, AutoGen, LlamaIndex, HuggingFace & more</p>
            </div>
          </AnimatedValueCard>
        </div>
      </footer>
    </main>
  );
}
