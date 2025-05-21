import logging
import json
import aiohttp
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class SerperIntegration:
    """Serper Google Search API Integration"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://google.serper.dev"
        self.headers = {
            "X-API-KEY": api_key,
            "Content-Type": "application/json"
        }

    async def search(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Perform search using Serper API"""
        try:
            search_type = config.get("type", "search")
            endpoint = f"{self.base_url}/{search_type}"
            
            payload = {
                "q": config.get("query", ""),
                "num": int(config.get("num", 10)),
                "gl": config.get("country", "us"),  # Country code
                "hl": "en"  # Language
            }

            # Add type-specific parameters
            if search_type == "news":
                payload["tbs"] = config.get("time_range", "")  # qdr:d (day), qdr:w (week), etc.
            elif search_type == "images":
                payload["imgSize"] = config.get("image_size", "")
                payload["imgType"] = config.get("image_type", "")

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    endpoint,
                    headers=self.headers,
                    json=payload
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        
                        # Format results based on search type
                        formatted_results = self._format_search_results(result, search_type)
                        
                        return {
                            "success": True,
                            "data": {
                                "query": payload["q"],
                                "type": search_type,
                                "total_results": result.get("searchInformation", {}).get("totalResults", 0),
                                "search_time": result.get("searchInformation", {}).get("searchTime", 0),
                                "results": formatted_results,
                                "knowledge_graph": result.get("knowledgeGraph"),
                                "answer_box": result.get("answerBox"),
                                "people_also_ask": result.get("peopleAlsoAsk", [])
                            },
                            "metadata": {
                                "provider": "serper",
                                "search_type": search_type,
                                "country": payload["gl"],
                                "timestamp": datetime.now().isoformat()
                            }
                        }
                    else:
                        error_data = await response.json()
                        return {
                            "success": False,
                            "error": {
                                "message": error_data.get("message", "Search failed"),
                                "status": response.status
                            }
                        }

        except Exception as e:
            logger.error(f"Serper search error: {str(e)}")
            return {
                "success": False,
                "error": {
                    "message": str(e),
                    "type": "integration_error"
                }
            }

    def _format_search_results(self, result: Dict[str, Any], search_type: str) -> List[Dict[str, Any]]:
        """Format search results based on type"""
        if search_type == "search":
            return [
                {
                    "title": item.get("title", ""),
                    "link": item.get("link", ""),
                    "snippet": item.get("snippet", ""),
                    "position": item.get("position", 0),
                    "date": item.get("date")
                }
                for item in result.get("organic", [])
            ]
        elif search_type == "news":
            return [
                {
                    "title": item.get("title", ""),
                    "link": item.get("link", ""),
                    "snippet": item.get("snippet", ""),
                    "date": item.get("date", ""),
                    "source": item.get("source", ""),
                    "imageUrl": item.get("imageUrl")
                }
                for item in result.get("news", [])
            ]
        elif search_type == "images":
            return [
                {
                    "title": item.get("title", ""),
                    "imageUrl": item.get("imageUrl", ""),
                    "thumbnailUrl": item.get("thumbnailUrl", ""),
                    "source": item.get("source", ""),
                    "link": item.get("link", ""),
                    "position": item.get("position", 0)
                }
                for item in result.get("images", [])
            ]
        elif search_type == "videos":
            return [
                {
                    "title": item.get("title", ""),
                    "link": item.get("link", ""),
                    "snippet": item.get("snippet", ""),
                    "imageUrl": item.get("imageUrl", ""),
                    "duration": item.get("duration", ""),
                    "source": item.get("source", ""),
                    "channel": item.get("channel", ""),
                    "date": item.get("date", ""),
                    "position": item.get("position", 0)
                }
                for item in result.get("videos", [])
            ]
        else:
            return result.get("organic", [])

class TavilyIntegration:
    """Tavily AI-Powered Research API Integration"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.tavily.com"
        self.headers = {
            "Content-Type": "application/json"
        }

    async def search(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Perform AI-powered research using Tavily API"""
        try:
            endpoint = f"{self.base_url}/search"
            
            payload = {
                "api_key": self.api_key,
                "query": config.get("query", ""),
                "search_depth": config.get("search_depth", "basic"),  # basic or advanced
                "include_answer": True,
                "include_raw_content": False,
                "max_results": int(config.get("max_results", 5)),
                "include_images": False
            }

            # Add optional domain filtering
            if config.get("include_domains"):
                domains = [d.strip() for d in config["include_domains"].split(",")]
                payload["include_domains"] = domains
            
            if config.get("exclude_domains"):
                domains = [d.strip() for d in config["exclude_domains"].split(",")]
                payload["exclude_domains"] = domains

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    endpoint,
                    headers=self.headers,
                    json=payload
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        
                        # Format the research results
                        formatted_results = [
                            {
                                "title": item.get("title", ""),
                                "url": item.get("url", ""),
                                "content": item.get("content", ""),
                                "score": item.get("score", 0),
                                "published_date": item.get("published_date"),
                                "raw_content": item.get("raw_content", "")
                            }
                            for item in result.get("results", [])
                        ]
                        
                        return {
                            "success": True,
                            "data": {
                                "query": payload["query"],
                                "answer": result.get("answer", ""),
                                "follow_up_questions": result.get("follow_up_questions", []),
                                "results": formatted_results,
                                "images": result.get("images", []),
                                "response_time": result.get("response_time", 0)
                            },
                            "metadata": {
                                "provider": "tavily",
                                "search_depth": payload["search_depth"],
                                "max_results": payload["max_results"],
                                "timestamp": datetime.now().isoformat()
                            }
                        }
                    else:
                        error_data = await response.json()
                        return {
                            "success": False,
                            "error": {
                                "message": error_data.get("error", "Research failed"),
                                "status": response.status
                            }
                        }

        except Exception as e:
            logger.error(f"Tavily research error: {str(e)}")
            return {
                "success": False,
                "error": {
                    "message": str(e),
                    "type": "integration_error"
                }
            }

class DuckDuckGoIntegration:
    """DuckDuckGo Search Integration (No API Key Required)"""
    
    def __init__(self):
        self.base_url = "https://api.duckduckgo.com"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }

    async def search(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Perform search using DuckDuckGo API"""
        try:
            query = config.get("query", "")
            search_type = config.get("type", "text")
            
            if search_type == "text":
                endpoint = f"{self.base_url}/"
                params = {
                    "q": query,
                    "format": "json",
                    "no_html": "1",
                    "skip_disambig": "1"
                }
            elif search_type == "news":
                # Use instant answer API for news
                endpoint = f"{self.base_url}/"
                params = {
                    "q": f"{query} news",
                    "format": "json",
                    "no_html": "1"
                }
            else:
                return {
                    "success": False,
                    "error": {
                        "message": f"Unsupported search type: {search_type}",
                        "type": "configuration_error"
                    }
                }

            async with aiohttp.ClientSession() as session:
                async with session.get(
                    endpoint,
                    headers=self.headers,
                    params=params
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        
                        # Format DuckDuckGo results
                        formatted_results = []
                        
                        # Abstract (main answer)
                        if result.get("Abstract"):
                            formatted_results.append({
                                "title": result.get("AbstractText", ""),
                                "content": result.get("Abstract", ""),
                                "source": result.get("AbstractSource", ""),
                                "url": result.get("AbstractURL", ""),
                                "type": "abstract"
                            })
                        
                        # Related topics
                        for topic in result.get("RelatedTopics", []):
                            if isinstance(topic, dict) and topic.get("Text"):
                                formatted_results.append({
                                    "title": topic.get("Text", "")[:100] + "...",
                                    "content": topic.get("Text", ""),
                                    "url": topic.get("FirstURL", ""),
                                    "type": "related_topic"
                                })
                        
                        # Infobox
                        infobox = result.get("Infobox", {})
                        if infobox.get("content"):
                            formatted_results.append({
                                "title": "Information",
                                "content": "\n".join([item.get("label", "") + ": " + str(item.get("value", "")) 
                                                     for item in infobox.get("content", [])]),
                                "type": "infobox"
                            })
                        
                        return {
                            "success": True,
                            "data": {
                                "query": query,
                                "type": search_type,
                                "heading": result.get("Heading", ""),
                                "abstract": result.get("Abstract", ""),
                                "answer": result.get("Answer", ""),
                                "answer_type": result.get("AnswerType", ""),
                                "results": formatted_results,
                                "image": result.get("Image", ""),
                                "definition": result.get("Definition", "")
                            },
                            "metadata": {
                                "provider": "duckduckgo",
                                "search_type": search_type,
                                "timestamp": datetime.now().isoformat()
                            }
                        }
                    else:
                        return {
                            "success": False,
                            "error": {
                                "message": "DuckDuckGo search failed",
                                "status": response.status
                            }
                        }

        except Exception as e:
            logger.error(f"DuckDuckGo search error: {str(e)}")
            return {
                "success": False,
                "error": {
                    "message": str(e),
                    "type": "integration_error"
                }
            }

# Factory function to create web search integrations
def create_web_search_integration(provider: str, api_key: Optional[str] = None):
    """Create web search integration based on provider"""
    if provider.lower() == "serper":
        if not api_key:
            raise ValueError("API key is required for Serper")
        return SerperIntegration(api_key)
    elif provider.lower() == "tavily":
        if not api_key:
            raise ValueError("API key is required for Tavily")
        return TavilyIntegration(api_key)
    elif provider.lower() == "duckduckgo":
        return DuckDuckGoIntegration()
    else:
        raise ValueError(f"Unsupported web search provider: {provider}")

# Main handler function
async def handle_web_search(provider: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """Handle web search request"""
    try:
        api_key = config.get("api_key")
        
        # DuckDuckGo doesn't require an API key
        if provider.lower() != "duckduckgo" and not api_key:
            return {
                "success": False,
                "error": {
                    "message": f"API key is required for {provider}",
                    "type": "configuration_error"
                }
            }
        
        integration = create_web_search_integration(provider, api_key)
        result = await integration.search(config)
        
        return result
        
    except Exception as e:
        logger.error(f"Web search handler error: {str(e)}")
        return {
            "success": False,
            "error": {
                "message": str(e),
                "type": "handler_error"
            }
        }

# Additional utility functions
async def search_and_summarize(provider: str, config: Dict[str, Any], summarizer_config: Dict[str, Any]) -> Dict[str, Any]:
    """Search and then summarize the results using an LLM"""
    try:
        # First perform the search
        search_result = await handle_web_search(provider, config)
        
        if not search_result.get("success"):
            return search_result
        
        # Extract search results for summarization
        search_data = search_result["data"]
        results_text = ""
        
        if search_data.get("answer"):
            results_text += f"Main Answer: {search_data['answer']}\n\n"
        
        for i, result in enumerate(search_data.get("results", [])[:5]):  # Limit to top 5
            results_text += f"{i+1}. {result.get('title', '')}\n"
            results_text += f"   {result.get('content', result.get('snippet', ''))}\n\n"
        
        # Create summarization prompt
        summary_prompt = f"""
        Please provide a comprehensive summary of the following search results for the query: "{search_data.get('query', '')}"
        
        Search Results:
        {results_text}
        
        Please create a concise, informative summary that captures the key points and insights from these search results.
        """
        
        # Import text generation handler (assuming it exists)
        from backend.integrations.text_gen import handle_text_generation
        
        summary_config = {
            **summarizer_config,
            "prompt": summary_prompt
        }
        
        summary_result = await handle_text_generation(
            summarizer_config.get("provider", "openai"),
            summary_config
        )
        
        # Combine search results with summary
        return {
            "success": True,
            "data": {
                **search_data,
                "summary": summary_result.get("data", {}).get("content", "") if summary_result.get("success") else None,
                "summary_error": summary_result.get("error") if not summary_result.get("success") else None
            },
            "metadata": {
                **search_result.get("metadata", {}),
                "includes_summary": True,
                "summarizer": summarizer_config.get("provider", "openai")
            }
        }
        
    except Exception as e:
        logger.error(f"Search and summarize error: {str(e)}")
        return {
            "success": False,
            "error": {
                "message": str(e),
                "type": "handler_error"
            }
        }