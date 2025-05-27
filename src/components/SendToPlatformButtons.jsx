import React, { useState } from 'react';
import { 
  Share2, 
  Linkedin, 
  Twitter, 
  Mail, 
  FileText, 
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

const SendToPlatformButtons = ({ content, metadata = {} }) => {
  const [posting, setPosting] = useState({});
  const [results, setResults] = useState({});

  const platforms = [
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'bg-blue-600 hover:bg-blue-700',
      description: 'Share professional insights'
    },
    {
      id: 'twitter',
      name: 'Twitter',
      icon: Twitter,
      color: 'bg-sky-500 hover:bg-sky-600',
      description: 'Tweet your findings'
    },
    {
      id: 'email',
      name: 'Email',
      icon: Mail,
      color: 'bg-gray-600 hover:bg-gray-700',
      description: 'Send via email'
    },
    {
      id: 'notion',
      name: 'Notion',
      icon: FileText,
      color: 'bg-gray-800 hover:bg-gray-900',
      description: 'Save to Notion'
    },
    {
      id: 'slack',
      name: 'Slack',
      icon: MessageSquare,
      color: 'bg-green-600 hover:bg-green-700',
      description: 'Share in Slack'
    }
  ];

  const handlePost = async (platform) => {
    setPosting(prev => ({ ...prev, [platform]: true }));
    setResults(prev => ({ ...prev, [platform]: null }));

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/post-to-platform`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform,
          content,
          metadata
        }),
      });

      const result = await response.json();
      setResults(prev => ({ ...prev, [platform]: result }));
    } catch (error) {
      setResults(prev => ({ 
        ...prev, 
        [platform]: { 
          success: false, 
          message: error.message 
        } 
      }));
    } finally {
      setPosting(prev => ({ ...prev, [platform]: false }));
    }
  };

  const getStatusIcon = (platform) => {
    if (posting[platform]) {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }
    
    const result = results[platform];
    if (result?.success) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (result && !result.success) {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    
    return null;
  };

  const getStatusMessage = (platform) => {
    const result = results[platform];
    if (result) {
      return result.message;
    }
    return null;
  };

  if (!content) {
    return null;
  }

  return (
    <div className="send-to-platform-buttons bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Share2 className="w-5 h-5 text-gray-600" />
        <h3 className="text-sm font-medium text-gray-700">Share Content</h3>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {platforms.map((platform) => {
          const Icon = platform.icon;
          const isPosting = posting[platform.id];
          const result = results[platform.id];
          
          return (
            <div key={platform.id} className="relative">
              <button
                onClick={() => handlePost(platform.id)}
                disabled={isPosting}
                className={`
                  w-full flex flex-col items-center gap-2 p-3 rounded-lg text-white text-xs
                  transition-all duration-200 transform hover:scale-105
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                  ${platform.color}
                `}
                title={platform.description}
              >
                <div className="flex items-center gap-1">
                  <Icon className="w-4 h-4" />
                  {getStatusIcon(platform.id)}
                </div>
                <span className="font-medium">{platform.name}</span>
              </button>
              
              {/* Status message */}
              {getStatusMessage(platform.id) && (
                <div className={`
                  absolute top-full left-0 right-0 mt-1 p-2 rounded text-xs z-10
                  ${result?.success 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-red-100 text-red-800 border border-red-200'
                  }
                `}>
                  {getStatusMessage(platform.id)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-3 text-xs text-gray-500">
        💡 Tip: Configure your platform credentials in settings to enable posting
      </div>
    </div>
  );
};

export default SendToPlatformButtons; 