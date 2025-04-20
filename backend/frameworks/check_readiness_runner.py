# /backend/frameworks/check_readiness_runner.py

def run_readiness_check(data):
    """
    Checks the readiness of a lead based on urgency and budget.
    
    Args:
        data: Dictionary containing lead information
        
    Returns:
        Dictionary with score and intent assessment
    """
    urgency = data.get("urgency", "low")
    budget = data.get("budget", "unknown")
    timeline = data.get("timeline", "unknown")
    
    # Calculate base score
    base_score = 0
    
    # Urgency scoring
    if urgency == "high":
        base_score += 40
    elif urgency == "medium":
        base_score += 25
    else:  # low
        base_score += 10
        
    # Budget scoring
    if budget in ["high", "enterprise"]:
        base_score += 40
    elif budget in ["medium", "growth"]:
        base_score += 25
    elif budget in ["low", "starter"]:
        base_score += 15
    else:  # unknown or none
        base_score += 5
        
    # Timeline scoring
    if timeline == "immediate":
        base_score += 20
    elif timeline == "1-3 months":
        base_score += 15
    elif timeline == "3-6 months":
        base_score += 10
    else:  # longer or unknown
        base_score += 5
    
    # Cap the score at 100
    final_score = min(base_score, 100)
    
    # Determine intent based on score
    if final_score >= 80:
        intent = "Hot lead - immediate follow-up required"
    elif final_score >= 60:
        intent = "Warm lead - high potential"
    elif final_score >= 40:
        intent = "Moderate interest - nurture required"
    else:
        intent = "Low priority lead - add to newsletter"
    
    return {
        "score": final_score,
        "intent": intent,
        "details": f"Urgency: {urgency}, Budget: {budget}, Timeline: {timeline}"
    }
