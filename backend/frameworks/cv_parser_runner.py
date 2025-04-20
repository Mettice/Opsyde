# /backend/frameworks/cv_parser_runner.py

def run_cv_parser_tool(tool_data):
    text = tool_data.get("cv_text", "")

    # Simulate CV parsing
    parsed = {
        "name": "John Doe",
        "email": "john.doe@email.com",
        "skills": ["Python", "NLP", "FastAPI", "AWS"],
        "experience": "4 years",
        "education": "BSc in Computer Science",
        "score": 84,
        "recommendation": "Strong match for backend roles"
    }

    return parsed
