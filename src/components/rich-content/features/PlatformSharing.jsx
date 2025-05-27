// components/rich-content/features/PlatformSharing.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { extractDisplayContent, getContentPreview } from '../content-detection/ContentExtractor';

const PlatformSharing = ({ content, metadata = {}, platforms = [] }) => {
  const [isPosting, setIsPosting] = useState(false);
  const [postStatus, setPostStatus] = useState({});
  const [customMessage, setCustomMessage] = useState('');
  const [showCustomMessage, setShowCustomMessage] = useState(false);

  // Platform configurations with modern styling and capabilities
  const platformConfigs = {
    LinkedIn: {
      icon: '💼',
      color: 'bg-blue-600 hover:bg-blue-700',
      textColor: 'text-white',
      name: 'LinkedIn',
      maxLength: 3000,
      supportsImages: true,
      supportsLinks: true
    },
    Twitter: {
      icon: '🐦',
      color: 'bg-sky-500 hover:bg-sky-600', 
      textColor: 'text-white',
      name: 'Twitter',
      maxLength: 280,
      supportsImages: true,
      supportsLinks: true
    },
    Facebook: {
      icon: '📘',
      color: 'bg-blue-700 hover:bg-blue-800',
      textColor: 'text-white', 
      name: 'Facebook',
      maxLength: 63206,
      supportsImages: true,
      supportsLinks: true
    },
    Instagram: {
      icon: '📸',
      color: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
      textColor: 'text-white',
      name: 'Instagram',
      maxLength: 2200,
      supportsImages: true,
      supportsLinks: false
    },
    Slack: {
      icon: '💬',
      color: 'bg-green-600 hover:bg-green-700',
      textColor: 'text-white',
      name: 'Slack',
      maxLength: 4000,
      supportsImages: true,
      supportsLinks: true
    },
    Discord: {
      icon: '🎮',
      color: 'bg-indigo-600 hover:bg-indigo-700',
      textColor: 'text-white',
      name: 'Discord', 
      maxLength: 2000,
      supportsImages: true,
      supportsLinks: true
    },
    Email: {
      icon: '📧',
      color: 'bg-gray-600 hover:bg-gray-700',
      textColor: 'text-white',
      name: 'Email',
      maxLength: 10000,
      supportsImages: true,
      supportsLinks: true
    },
    Notion: {
      icon: '📝',
      color: 'bg-black hover:bg-gray-800',
      textColor: 'text-white',
      name: 'Notion',
      maxLength: 10000,
      supportsImages: true,
      supportsLinks: true
    },
    Teams: {
      icon: '👥',
      color: 'bg-purple-600 hover:bg-purple-700',
      textColor: 'text-white',
      name: 'Microsoft Teams',
      maxLength: 4000,
      supportsImages: true,
      supportsLinks: true
    },
    WhatsApp: {
      icon: '💚',
      color: 'bg-green-500 hover:bg-green-600',
      textColor: 'text-white',
      name: 'WhatsApp',
      maxLength: 4096,
      supportsImages: true,
      supportsLinks: true
    }
  };

  // Format content for different platforms
  const formatContentForPlatform = (platform) => {
    const extracted = extractDisplayContent(content);
    const preview = getContentPreview(content, 500);
    const config = platformConfigs[platform];
    
    let baseContent = customMessage || preview;
    
    // Platform-specific formatting
    switch (platform) {
      case 'LinkedIn':
        return {
          text: `🚀 Automation Insights\n\n${baseContent}\n\n#Automation #AI #BusinessIntelligence #DataAnalysis`,
          subject: metadata?.title || 'Automation Analysis Results'
        };
        
      case 'Twitter':
        const truncated = baseContent.length > 240 ? baseContent.substring(0, 240) + '...' : baseContent;
        return {
          text: `🤖 ${truncated}\n\n#AutomationInsights #AI #Data`,
          thread: baseContent.length > 240 // Indicate if thread is needed
        };
        
      case 'Facebook':
        return {
          text: `📊 Check out these automation results:\n\n${baseContent}\n\n#Automation #BusinessIntelligence`,
          link: metadata?.sourceUrl
        };
        
      case 'Instagram':
        return {
          text: `📈 Automation insights! ${baseContent.substring(0, 100)}... \n\n#automation #data #business #ai #insights`,
          requiresImage: true
        };
        
      case 'Slack':
        return {
          text: `📊 *Automation Analysis Results*\n\n${baseContent}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `📊 *Automation Analysis Results*\n\n${baseContent}`
              }
            }
          ],
          channel: metadata?.slackChannel || '#general'
        };
        
      case 'Discord':
        return {
          content: `📊 **Automation Results**\n\n${baseContent}`,
          embeds: [{
            title: metadata?.title || 'Automation Analysis',
            description: baseContent.substring(0, 1000),
            color: 0x3498db,
            timestamp: new Date().toISOString()
          }]
        };
        
      case 'Email':
        return {
          subject: metadata?.title || 'Automation Analysis Results',
          body: `Hi,\n\nHere are the latest automation insights:\n\n${baseContent}\n\nBest regards,\nYour Automation Team`,
          html: `<h2>${metadata?.title || 'Automation Analysis Results'}</h2><p>Hi,</p><p>Here are the latest automation insights:</p><div style="background:#f5f5f5;padding:15px;border-radius:5px;margin:15px 0;">${baseContent.replace(/\n/g, '<br>')}</div><p>Best regards,<br>Your Automation Team</p>`
        };
        
      case 'Notion':
        return {
          title: metadata?.title || 'Automation Analysis',
          content: baseContent,
          properties: {
            'Type': 'Analysis',
            'Generated': new Date().toISOString(),
            'Status': 'Ready'
          }
        };
        
      case 'Teams':
        return {
          text: `📊 **Automation Analysis Results**\n\n${baseContent}`,
          summary: metadata?.title || 'New automation insights available'
        };
        
      case 'WhatsApp':
        return {
          text: `📊 *Automation Results*\n\n${baseContent}`
        };
        
      default:
        return { text: baseContent };
    }
  };

  // Handle posting to platform
  const handlePost = async (platform) => {
    if (isPosting) return;
    
    setIsPosting(true);
    setPostStatus(prev => ({ ...prev, [platform]: 'posting' }));

    try {
      const formattedContent = formatContentForPlatform(platform);
      
      // Call the platform-specific API
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/post-to-platform`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: platform.toLowerCase(),
          content: formattedContent,
          metadata: {
            ...metadata,
            contentType: extractDisplayContent(content).type,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        setPostStatus(prev => ({ 
          ...prev, 
          [platform]: { 
            status: 'success', 
            url: result.url,
            id: result.id 
          } 
        }));
        
        // Auto-clear success status after 5 seconds
        setTimeout(() => {
          setPostStatus(prev => ({ ...prev, [platform]: null }));
        }, 5000);
      } else {
        throw new Error(`Failed to post to ${platform}`);
      }
    } catch (error) {
      console.error(`Error posting to ${platform}:`, error);
      setPostStatus(prev => ({ 
        ...prev, 
        [platform]: { 
          status: 'error', 
          error: error.message 
        } 
      }));
      
      // Auto-clear error status after 10 seconds
      setTimeout(() => {
        setPostStatus(prev => ({ ...prev, [platform]: null }));
      }, 10000);
    } finally {
      setIsPosting(false);
    }
  };

  // Get button status and styling
  const getButtonStatus = (platform) => {
    const status = postStatus[platform];
    const config = platformConfigs[platform];
    
    if (status?.status === 'posting') {
      return { 
        text: 'Posting...', 
        disabled: true,
        className: `${config.color.replace('hover:', '')} opacity-75 cursor-not-allowed`
      };
    }
    
    if (status?.status === 'success') {
      return { 
        text: 'Posted ✓', 
        disabled: true,
        className: 'bg-green-600 text-white cursor-not-allowed',
        url: status.url
      };
    }
    
    if (status?.status === 'error') {
      return { 
        text: 'Failed ✗', 
        disabled: false,
        className: 'bg-red-600 hover:bg-red-700 text-white',
        error: status.error
      };
    }
    
    return { 
      text: `Share on ${config.name}`, 
      disabled: false,
      className: `${config.color} ${config.textColor}`
    };
  };

  // Don't render if no platforms specified
  if (!platforms.length) return null;

  // Filter to only supported platforms
  const supportedPlatforms = platforms.filter(platform => platformConfigs[platform]);
  
  if (!supportedPlatforms.length) return null;

  return (
    <div className="platform-sharing mt-6 p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 rounded-xl border border-purple-200 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-lg font-bold text-purple-800 flex items-center">
          <span className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mr-3">
            🚀
          </span>
          Share Your Results
        </h4>
        
        <button
          onClick={() => setShowCustomMessage(!showCustomMessage)}
          className="text-sm text-purple-600 hover:text-purple-700 transition-colors"
        >
          {showCustomMessage ? 'Hide' : 'Customize'} Message
        </button>
      </div>

      {/* Custom Message Input */}
      {showCustomMessage && (
        <div className="mb-6 p-4 bg-white/60 rounded-lg border border-purple-200">
          <label className="block text-sm font-medium text-purple-800 mb-2">
            Custom Message (optional)
          </label>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Add your own message or leave blank to use auto-generated content..."
            className="w-full p-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
            rows="3"
          />
          <div className="text-xs text-purple-600 mt-1">
            This will be used instead of auto-generated content
          </div>
        </div>
      )}

      {/* Platform Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {supportedPlatforms.map(platform => {
          const config = platformConfigs[platform];
          const buttonStatus = getButtonStatus(platform);
          
          return (
            <div key={platform} className="relative">
              <button
                onClick={() => handlePost(platform)}
                disabled={buttonStatus.disabled}
                className={`
                  w-full inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-semibold
                  transition-all duration-200 transform hover:scale-105 active:scale-95
                  shadow-lg hover:shadow-xl
                  ${buttonStatus.className}
                  ${buttonStatus.disabled ? 'transform-none' : ''}
                `}
                title={buttonStatus.error || `Share to ${config.name}`}
              >
                <span className="mr-2 text-lg">{config.icon}</span>
                {buttonStatus.text}
                {buttonStatus.status === 'posting' && (
                  <div className="ml-2 w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                )}
              </button>
              
              {/* Success indicator with link */}
              {buttonStatus.url && (
                <a
                  href={buttonStatus.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-green-600 transition-colors"
                  title="View post"
                >
                  🔗
                </a>
              )}
            </div>
          );
        })}
      </div>

      {/* Platform Requirements */}
      <div className="bg-white/40 rounded-lg p-4 border border-purple-200">
        <h5 className="font-medium text-purple-800 mb-3">📋 Platform Requirements</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {supportedPlatforms.map(platform => {
            const config = platformConfigs[platform];
            return (
              <div key={platform} className="flex items-center justify-between p-2 bg-white/60 rounded">
                <span className="flex items-center">
                  <span className="mr-2">{config.icon}</span>
                  {config.name}
                </span>
                <span className="text-purple-600">
                  Max: {config.maxLength} chars
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="mt-4 p-4 bg-blue-50/50 rounded-lg border border-blue-200">
        <h5 className="font-medium text-blue-800 mb-2 flex items-center">
          <span className="mr-2">💡</span>
          Setup Instructions
        </h5>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Configure your platform credentials in Settings → Integrations</li>
          <li>• Some platforms require approval for posting permissions</li>
          <li>• Content will be automatically formatted for each platform</li>
          <li>• Images and links are supported where available</li>
          <li>• Failed posts can be retried by clicking the button again</li>
        </ul>
      </div>
    </div>
  );
};

PlatformSharing.propTypes = {
  content: PropTypes.any.isRequired,
  metadata: PropTypes.object,
  platforms: PropTypes.arrayOf(PropTypes.string)
};

export default PlatformSharing;