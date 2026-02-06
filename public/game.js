console.log("game.js loaded");
const params = new URLSearchParams(window.location.search);

const digits = clampInt(params.get("digits"), 5, 1, 12);
const maxGuesses = clampInt(params.get("maxGuesses"), 20, 1, 99);
let gameId = params.get("gameId") || null;

const playerNameEl = document.getElementById("playerName");
const remainingBoxEl = document.getElementById("remainingBox");
const listLeft = document.getElementById("listLeft");
const listRight = document.getElementById("listRight");
const guessInputsWrap = document.getElementById("guessInputs");
const guessBtn = document.getElementById("guessBtn");
const hintEl = document.getElementById("hint");

// Finish overlay
const finishOverlay = document.getElementById("finishOverlay");
const finishTitle = document.getElementById("finishTitle");
const finishText = document.getElementById("finishText");
const finishHint = document.getElementById("finishHint");
const finishPlayAgainBtn = document.getElementById("finishPlayAgainBtn");
const finishCopyLinkBtn = document.getElementById("finishCopyLinkBtn");

init();

async function init() {
    // player name from URL -> cookie
    const nameFromUrl = params.get("username");
    if (nameFromUrl) setCookie("playerName", nameFromUrl, 30);

    const playerName = getCookie("playerName") || "Player";
    playerNameEl.textContent = playerName;

    if (!getCookie("wins")) setCookie("wins", "0", 365);

    renderDashInputs(digits);
    renderEmptyHistory(maxGuesses);

    guessBtn.addEventListener("click", onGuess);
    finishPlayAgainBtn.addEventListener("click", onPlayAgain);
    finishCopyLinkBtn.addEventListener("click", onCopyLink);

    try {
        // create new game if needed
        if (!gameId) {
            const created = await apiNewGame({ digits, maxGuesses });
            gameId = created.gameId;

            params.set("gameId", gameId);
            params.set("digits", String(digits));
            params.set("maxGuesses", String(maxGuesses));
            history.replaceState(
                null,
                "",
                `${location.pathname}?${params.toString()}`,
            );
        }

        const state = await apiState(gameId);
        renderState(state);

        hintEl.textContent = `Digits: ${state.digits} • Max guesses: ${state.maxGuesses}`;
    } catch (e) {
        // If you see this, your API isn't running / you're using file://
        remainingBoxEl.textContent = "—";
        guessBtn.disabled = true;
        setInputsDisabled(true);
        hintEl.textContent =
            "API not reachable. Run your Node server (node server.js) and open this page at http://localhost:3000/game.html";
    }
}

function renderDashInputs(n) {
    guessInputsWrap.innerHTML = "";
    const inputs = [];

    for (let i = 0; i < n; i++) {
        const input = document.createElement("input");
        input.className = "dash";
        input.inputMode = "numeric";
        input.maxLength = 1;
        input.autocomplete = "off";

        input.addEventListener("input", () => {
            input.value = input.value.replace(/\D/g, "");
            if (input.value && inputs[i + 1]) inputs[i + 1].focus();
            updateGuessBtnState();
        });

        input.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" && !input.value && inputs[i - 1])
                inputs[i - 1].focus();
            if (e.key === "Enter") onGuess();
        });

        inputs.push(input);
        guessInputsWrap.appendChild(input);
    }

    guessInputsWrap._inputs = inputs;
    inputs[0]?.focus();
    updateGuessBtnState();
}

function renderEmptyHistory(max) {
    listLeft.innerHTML = "";
    listRight.innerHTML = "";
    for (let turn = 1; turn <= max; turn++) {
        const li = buildHistoryRow(null);
        if (turn <= 10) listLeft.appendChild(li);
        else listRight.appendChild(li);
    }
}

function buildHistoryRow(entry) {
    const li = document.createElement("li");

    const guessCell = document.createElement("div");
    guessCell.className = "guess-cell";
    guessCell.textContent = entry
        ? entry.guess.split("").join(" ")
        : "— — — — —";

    const correctCell = document.createElement("div");
    correctCell.className = "correct-cell";
    correctCell.textContent = entry ? String(entry.digitsCorrect) : "#";

    li.appendChild(guessCell);
    li.appendChild(correctCell);
    return li;
}

function updateHistory(state) {
    listLeft.innerHTML = "";
    listRight.innerHTML = "";

    const byTurn = new Map(state.history.map((h) => [h.turn, h]));

    for (let turn = 1; turn <= state.maxGuesses; turn++) {
        const entry = byTurn.get(turn) || null;
        const li = buildHistoryRow(entry);
        if (turn <= 10) listLeft.appendChild(li);
        else listRight.appendChild(li);
    }
}

function getGuessString() {
    const inputs = guessInputsWrap._inputs || [];
    return inputs.map((i) => i.value || "").join("");
}

function clearInputs() {
    const inputs = guessInputsWrap._inputs || [];
    for (const i of inputs) i.value = "";
    inputs[0]?.focus();
    updateGuessBtnState();
}

function setInputsDisabled(disabled) {
    const inputs = guessInputsWrap._inputs || [];
    for (const i of inputs) i.disabled = disabled;
}

function updateGuessBtnState() {
    const g = getGuessString();
    guessBtn.disabled = g.length !== digits || !/^\d+$/.test(g);
}

async function onGuess() {
    updateGuessBtnState();
    if (guessBtn.disabled) return;

    const guess = getGuessString();
    const state = await apiGuess({ gameId, guess });

    renderState(state);

    if (state.status === "playing") {
        clearInputs();
        return;
    }

    showFinish(state.status);
}

function renderState(state) {
    remainingBoxEl.textContent = String(state.guessesRemaining);
    updateHistory(state);

    if (state.status === "playing") {
        setInputsDisabled(false);
        updateGuessBtnState();
    } else {
        setInputsDisabled(true);
        guessBtn.disabled = true;
        showFinish(state.status);
    }
}

function showFinish(status) {
    if (!finishOverlay.classList.contains("hidden")) return;

    console.log("showFinish called with status:", status);
    finishOverlay.classList.remove("wi n", "lose");
    finishOverlay.classList.add(status === "win" ? "win" : "lose");
    console.log("Added class:", status === "win" ? "win" : "lose");
    console.log("Overlay classes:", finishOverlay.className);

    // Create random rain
    const rainLayer = document.querySelector(".rain-layer");
    rainLayer.innerHTML = "";
    for (let i = 0; i < 15; i++) {
        const rain = document.createElement("div");
        rain.className = "rain-item";
        rain.style.left = Math.random() * 92 + "%"; // better distribution
        rain.style.top = "-" + (100 + Math.random() * 200) + "px"; // start high above screen
        rain.style.animationDelay = Math.random() * 4 + "s";
        rain.style.animationDuration = 3 + Math.random() * 2 + "s";
        rainLayer.appendChild(rain);
    }

    if (status === "win") {
        const wins = parseInt(getCookie("wins") || "0", 10) + 1;
        setCookie("wins", String(wins), 365);

        finishTitle.textContent = "Congratulations! You cracked the code!";
        finishText.textContent = `Wins: ${wins}`;
    } else {
        finishTitle.textContent = "You didn't crack the code :(";
        finishText.textContent = "Try again.";
    }

    finishHint.textContent = "";
    finishOverlay.classList.remove("hidden");
    console.log("Rain should be showing now!");
}

function onPlayAgain() {
    const next = new URLSearchParams();
    next.set("digits", String(digits));
    next.set("maxGuesses", String(maxGuesses));
    next.set("username", getCookie("playerName") || "Player");
    window.location.href = `game.html?${next.toString()}`;
}
async function onCopyLink() {
    const url = new URL(window.location.href);
    url.searchParams.set("gameId", gameId);
    url.searchParams.set("digits", String(digits));
    url.searchParams.set("maxGuesses", String(maxGuesses));
    url.searchParams.delete("username");

    await navigator.clipboard.writeText(url.toString());
    finishHint.textContent = "Link copied.";
}

async function apiNewGame(body) {
    const r = await fetch("/api/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error("new game failed");
    return r.json();
}

async function apiState(id) {
    const r = await fetch(`/api/state?gameId=${encodeURIComponent(id)}`);
    if (!r.ok) throw new Error("state failed");
    return r.json();
}

async function apiGuess(body) {
    const r = await fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${d.toUTCString()}; path=/`;
}

function getCookie(name) {
    const key = `${encodeURIComponent(name)}=`;
    const parts = document.cookie.split("; ");
    for (const p of parts)
        if (p.startsWith(key)) return decodeURIComponent(p.slice(key.length));
    return null;
}

function clampInt(raw, fallback, min, max) {
    const n = parseInt(raw ?? "", 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
}
