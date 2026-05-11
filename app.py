from dotenv import load_dotenv
import os
from flask import Flask, render_template, request, redirect, session, jsonify
from flask_sqlalchemy import SQLAlchemy
import requests

from werkzeug.security import generate_password_hash, check_password_hash
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from flask import send_file
import re
import PyPDF2

load_dotenv()


app = Flask(__name__)

# ✅ SECRET KEY FIX
app.secret_key = os.getenv("SECRET_KEY")

# ✅ API KEY FIX
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

if app.secret_key is None:
    print("❌ SECRET KEY NOT LOADED")

if OPENROUTER_API_KEY is None:
    print("❌ API KEY NOT LOADED")

# ================= DB =================
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db.sqlite3'
db = SQLAlchemy(app)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100))
    password = db.Column(db.String(100))


class Chat(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_email = db.Column(db.String(100))
    message = db.Column(db.Text)
    response = db.Column(db.Text)


class Resume(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_email = db.Column(db.String(100))
    score = db.Column(db.Integer)
    suggestions = db.Column(db.Text)
# ================= HOME =================


@app.route("/")
def home():
    if "user" in session:
        return render_template("index.html")
    return redirect("/login")

# ================= SIGNUP =================


@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        email = request.form["email"]
        password = generate_password_hash(request.form["password"])

        user = User(email=email, password=password)
        db.session.add(user)
        db.session.commit()

        return redirect("/login")

    return render_template("signup.html")

# ================= LOGIN =================


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form["email"]
        password = request.form["password"]

        user = User.query.filter_by(email=email).first()

        if user and check_password_hash(user.password, password):
            session["user"] = email
            return redirect("/dashboard")

    return render_template("login.html")
# ================= LOGOUT =================


@app.route("/logout")
def logout():
    session.pop("user", None)
    return redirect("/login")


# ================= 🔥 CHAT (REAL AI) =================

@app.route("/chat", methods=["POST"])
def chat():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    msg = data.get("message")

    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:5000",
                "X-Title": "AI Assistant"
            },
            json={
                "model": "meta-llama/llama-3-8b-instruct",
                "messages": [
                    {"role": "user", "content": msg}
                ]
            }
        )

        result = response.json()
        print(result)

        # ❌ error
        if "error" in result:
            return jsonify({"response": "API Error 😅: " + result["error"]["message"]})

        # ✅ correct block
        if "choices" in result:
            reply = result["choices"][0]["message"]["content"]

            # SAVE CHAT
            chat_data = Chat(
                user_email=session["user"],
                message=msg,
                response=reply
            )

            db.session.add(chat_data)
            db.session.commit()

            return jsonify({"response": reply})

        else:
            return jsonify({"response": "No response from AI 😅"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Dowload report


@app.route("/download-report", methods=["POST"])
def download_report():
    data = request.get_json()
    content = data.get("content")

    # 🔥 REMOVE EMOJIS FOR CLEAN PDF
    content = content.replace("💪", "")
    content = content.replace("⚠", "")
    content = content.replace("🚀", "")
    content = content.replace("🎯", "")
    content = content.replace("📥", "")

    file_path = "report.pdf"

    doc = SimpleDocTemplate(file_path)
    styles = getSampleStyleSheet()

    story = []

    for line in content.split("\n"):
        story.append(Paragraph(line, styles["BodyText"]))
        story.append(Spacer(1, 6))

    doc.build(story)

    return send_file(file_path, as_attachment=True)
# ================= RESUME =================


@app.route("/resume", methods=["POST"])
def resume():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    file = request.files.get("file")

    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    try:
        # 📄 PDF READ
        pdf_reader = PyPDF2.PdfReader(file)
        text = ""

        for page in pdf_reader.pages:
            if page.extract_text():
                text += page.extract_text()

        # 🔥 AI PROMPT
        prompt = f"""
You are an expert ATS Resume Analyzer and Career Coach.

Analyze the following resume professionally.

Return response ONLY in this format:

Score: XX/100

Strengths:
- point
- point
- point

Weaknesses:
- point
- point
- point

Improvements:
- point
- point
- point

Suitable Job Roles:
- role
- role
- role

ATS Analysis:
- Formatting
- Keywords
- Technical Skills
- Projects
- Communication

Resume Content:
{text}

"""

        # 🤖 API CALL
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "meta-llama/llama-3-8b-instruct",
                "messages": [
                    {"role": "user", "content": prompt}
                ]
            }
        )

        result = response.json()

        # ❌ error handle
        if "error" in result:
            return jsonify({"error": result["error"]["message"]})

        # ✅ AI response
        reply = result["choices"][0]["message"]["content"]

        # 💾 SAVE IN DB (optional but recommended)
                # 💾 EXTRACT SCORE
        score_match = re.search(r'(\d+)', reply)

        score = int(score_match.group(1)) if score_match else 0

        # 💾 SAVE IN DATABASE
        resume_data = Resume(
            user_email=session["user"],
            score=score,
            suggestions=reply
        )

 
        db.session.add(resume_data)
        db.session.commit()

        return jsonify({"response": reply})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
# dashboard


@app.route("/dashboard")
def dashboard():
    if "user" not in session:
        return redirect("/login")
    return render_template("dashboard.html")

# history


@app.route("/history")
def history():
    if "user" not in session:
        return jsonify([])

    chats = (Chat.query
             .filter_by(user_email=session["user"])
             .order_by(Chat.id.desc())
             .limit(50)
             .all())

    return jsonify([
        {"message": c.message, "response": c.response}
        for c in chats
    ])


@app.route("/chat-page")
def chat_page():
    if "user" not in session:
        return redirect("/login")
    return render_template("index.html")


@app.route("/resume-history")
def resume_history():
    if "user" not in session:
        return jsonify([])

    data = Resume.query.filter_by(user_email=session["user"]).all()

    return jsonify([
        {
            "score": r.score,
            "suggestions": r.suggestions
        } for r in data
    ])



# ================= Analytics =================


@app.route("/analytics")
def analytics():

    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    user_email = session["user"]

    chats = Chat.query.filter_by(user_email=user_email).count()

    resumes = Resume.query.filter_by(user_email=user_email).all()

    total_resumes = len(resumes)

    scores = []

    for r in resumes:
        try:
            scores.append(int(r.score))
        except:
            pass

    avg_score = round(sum(scores) / len(scores), 1) if scores else 0

    highest_score = max(scores) if scores else 0

    return jsonify({
        "total_chats": chats,
        "total_resumes": total_resumes,
        "avg_score": avg_score,
        "highest_score": highest_score
    })


# ================= RUN =================
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)
