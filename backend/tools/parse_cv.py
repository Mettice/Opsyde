import base64

def parse_uploaded_cv(input_data):
    file_info = input_data.get("file_upload", {})
    filename = file_info.get("filename", "")
    content = file_info.get("content", "")

    if not filename or not content:
        return {"status": "❌ No file uploaded."}

    # Optionally handle base64 for PDFs/DOCX
    if filename.endswith(".pdf") or filename.endswith(".docx"):
        decoded = base64.b64decode(content.split(",")[-1])
        text = decode_document(decoded, filename)
    else:
        text = content  # assume plain text

    # Fake extraction for demo
    return {
        "filename": filename,
        "summary": f"Parsed content from {filename}",
        "skills": ["Python", "React", "LLMs"],
        "job_title": "AI Engineer",
        "experience_level": "Senior"
    }

def decode_document(binary_data, filename):
    # Optional: Use PyMuPDF, docx2txt, or LangChain loaders here
    return "🚧 Text extracted from binary resume content"
