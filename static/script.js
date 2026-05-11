// ================= GLOBAL FUNCTION =================
let latestSections = {};

function addMessage(text, type) {
  let box = document.createElement("div");

  box.className = type === "user" ? "text-right" : "text-left";

  let bubble = document.createElement("span");

  bubble.className =
    type === "user"
      ? "inline-block bg-orange-500 text-white px-3 py-2 rounded-xl"
      : "inline-block bg-gray-800 text-gray-200 px-3 py-2 rounded-xl";

  bubble.innerText = text;

  box.appendChild(bubble);

  let chatBox = document.getElementById("chatBox");

  if (chatBox) {
    chatBox.appendChild(box);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

// ================= MAIN =================
document.addEventListener("DOMContentLoaded", function () {

  // ================= SEND MESSAGE =================
  window.sendMsg = function () {
    let input = document.getElementById("msg");
    let msg = input.value.trim();

    if (!msg) return;

    addMessage("You: " + msg, "user");
    input.value = "";

    fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg }),
    })
      .then((res) => res.json())
      .then((data) => {
        addMessage("AI: " + (data.response || data.error), "bot");
      })
      .catch(() => {
        addMessage("AI: Server error 😅", "bot");
      });
  };

  // ================= ENTER PRESS =================
  let input = document.getElementById("msg");
  if (input) {
    input.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        sendMsg();
      }
    });
  }

  // ================= RESUME =================
const form = document.getElementById("resumeForm");

if (form) {
  form.onsubmit = function (e) {
    e.preventDefault();

    let formData = new FormData(this);
    let scoreBox = document.getElementById("score");
    let bar = document.getElementById("progressBar");

    // 🔄 Loading
    scoreBox.innerText = "Analyzing... ⏳";
    scoreBox.className = "mt-4 text-yellow-400 font-semibold";

    if (bar) bar.style.width = "10%";

    fetch("/resume", {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
    let scoreBox = document.getElementById("score");
    let bar = document.getElementById("progressBar");

    // ❌ error
    if (data.error) {
        scoreBox.innerText = "❌ " + data.error;
        scoreBox.className = "mt-4 text-red-400 font-semibold";
        if (bar) bar.style.width = "0%";
        return;
    }

    // 🔥 AI RESPONSE SHOW (MAIN FIX)
    scoreBox.className = "mt-4 text-gray-200 whitespace-pre-line";
let text = data.response.replace(/\*\*/g, "");

// 🔥 sections split
latestSections = {

    score: "",
    strengths: "",
    weaknesses: "",
    improvements: "",
    roles: ""

};

let sections = latestSections;

let current = "";

text.split("\n").forEach(line => {
    line = line.trim();

    if (line.toLowerCase().includes("score")) current = "score";
    else if (line.toLowerCase().includes("strength")) current = "strengths";
    else if (line.toLowerCase().includes("weakness")) current = "weaknesses";
    else if (line.toLowerCase().includes("improvement")) current = "improvements";
    else if (line.toLowerCase().includes("role")) current = "roles";

    if (current && line !== "") {
    sections[current] += line + " ";
}
});


// 🎨 PREMIUM FINAL UI
let scoreNumber = sections.score.match(/\d+/);

scoreNumber = scoreNumber ? scoreNumber[0] : 0;
scoreBox.innerHTML = `
<div class="space-y-5">

    <!-- SCORE CARD -->
   
<div class="bg-[#101826]
border border-orange-500/20
rounded-2xl px-6 py-5">

 <div class="flex items-center justify-between gap-4 flex-wrap">

        <div>

            <p class="text-orange-400 text-xs tracking-[4px] uppercase">
                ATS Resume Score
            </p>

            <div class="flex items-end gap-2 mt-3">

                <h1 class="text-5xl font-black text-white leading-none">
                    ${scoreNumber}
                </h1>

                <span class="text-xl text-gray-400 mb-1">
                    /100
                </span>

            </div>

            <p class="text-gray-500 text-sm mt-2">
                AI Powered Resume Analysis
            </p>

        </div>

        <!-- SIMPLE SCORE -->
        <div class="w-20 h-20 rounded-full
        border-[6px] border-orange-500
        flex items-center justify-center">

            <span class="text-lg font-bold text-white">
                ${scoreNumber}%
            </span>

        </div>

    </div>

</div>

    <!-- STRENGTHS -->
    <div class="bg-[#0f172a] border border-green-500/20
   rounded-2xl px-5 py-4">

        <h3 class="text-green-400 text-lg font-semibold mb-3">
            💪 Strengths
        </h3>

        <p class="text-gray-300 text-[15px] leading-7">
            ${sections.strengths.replace("Strengths:", "").trim()}
        </p>

    </div>

    <!-- WEAKNESSES -->
    <div class="bg-[#0f172a] border border-red-500/20
    rounded-2xl px-5 py-4">

        <h3 class="text-red-400 text-lg font-semibold mb-3">
            ⚠ Weaknesses
        </h3>

        <p class="text-gray-300 text-sm leading-7">
            ${sections.weaknesses.replace("Weaknesses:", "").trim()}
        </p>

    </div>

    <!-- IMPROVEMENTS -->
    <div class="bg-[#0f172a] border border-yellow-500/20
    rounded-2xl px-5 py-4">

        <h3 class="text-yellow-300 text-lg font-semibold mb-3">
            🚀 Improvements
        </h3>

        <p class="text-gray-300 text-sm leading-7">
            ${sections.improvements.replace("Improvements:", "").trim()}
        </p>

    </div>

    <!-- ROLES -->
    <div class="bg-[#0f172a] border border-blue-500/20
    rounded-2xl p-5 py-4">

        <h3 class="text-blue-400 text-lg font-semibold mb-3">
            🎯 Suitable Roles
        </h3>

        <p class="text-gray-300 text-sm leading-7">
            ${sections.roles.replace("Suitable Job Roles:", "").trim()}
        </p>

    </div>

    <button onclick="downloadReport()"

class="w-full py-3 rounded-xl
bg-orange-500 hover:bg-orange-600
transition duration-300
text-white font-semibold text-sm">

    Download Report

</button>

</div>
`;

    // 🎯 progress bar remove ya fixed rakho
    if (bar) bar.style.width = "100%";
})
     
      .catch(() => {
        scoreBox.innerText = "❌ Server error 😅";
        scoreBox.className = "mt-4 text-red-400 font-semibold";
        if (bar) bar.style.width = "0%";
      });
  };
}

  // ================= LOAD CHAT HISTORY =================
  fetch("/history")
    .then((res) => res.json())
    .then((data) => {
      data.forEach((chat) => {
        addMessage("You: " + chat.message, "user");
        addMessage("AI: " + chat.response, "bot");
      });
    });
});

// ================= BACKGROUND =================
document.addEventListener("DOMContentLoaded", function () {
  const canvas = document.getElementById("bg");

  if (canvas) {
    const ctx = canvas.getContext("2d");

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    resize();
    window.addEventListener("resize", resize);

    let particles = [];

    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2,
        dx: (Math.random() - 0.5) * 0.5,
        dy: (Math.random() - 0.5) * 0.5,
      });
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "orange";

      particles.forEach((p) => {
        p.x += p.dx;
        p.y += p.dy;

        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      requestAnimationFrame(draw);
    }

    draw();
  }
});

// 🔥 TYPING ANIMATION
function typingEffect(text) {
    let chatBox = document.getElementById("chatBox");

    let box = document.createElement("div");
    box.className = "text-left";

    let bubble = document.createElement("span");
    bubble.className = "inline-block bg-gray-800 text-gray-200 px-3 py-2 rounded-xl";

    box.appendChild(bubble);
    chatBox.appendChild(box);

    let i = 0;

    function type() {
        if (i < text.length) {
            bubble.innerHTML += text.charAt(i);
            i++;
            chatBox.scrollTop = chatBox.scrollHeight;
            setTimeout(type, 20); // speed 🔥
        }
    }

    type();
}


function downloadReport() {

    let report = `
ATS RESUME SCORE
${latestSections.score}

====================================

STRENGTHS
${latestSections.strengths}

====================================

WEAKNESSES
${latestSections.weaknesses}

====================================

IMPROVEMENTS
${latestSections.improvements}

====================================

SUITABLE JOB ROLES
${latestSections.roles}

====================================

Generated By AI Smart Assistant
`;

    fetch("/download-report", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            content: report
        })

    })

    .then(res => res.blob())

    .then(blob => {

        let url = window.URL.createObjectURL(blob);

        let a = document.createElement("a");

        a.href = url;

        a.download = "Resume_Report.pdf";

        a.click();

    });

}

// 🎤 VOICE INPUT
function startVoice() {

    const recognition =
        new(window.SpeechRecognition ||
            window.webkitSpeechRecognition)();

    recognition.lang = "en-US";

    recognition.start();

    recognition.onstart = () => {
        console.log("Voice started...");
    };

    recognition.onresult = (event) => {

        const text =
            event.results[0][0].transcript;

        document.getElementById("msg").value = text;
    };

    recognition.onerror = (event) => {
        console.log("Voice Error:", event.error);
    };
}

