const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

let dataStore = [{ name: "Teacher", message: "API is live!" }];

const games = new Map();

app.post("/api/new", (req, res) => {
    const { digits = 7, maxGuesses = 20 } = req.body || {};

    const secret = Array.from({ length: digits }, () =>
        Math.floor(Math.random() * 10),
    ).join("");

    const gameId = `game_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    games.set(gameId, {
        secret,
        digits,
        maxGuesses,
        history: [],
        status: "playing",
    });

    res.json({ gameId });
});

app.get("/api/state", (req, res) => {
    const { gameId } = req.query;

    if (!gameId || !games.has(gameId)) {
        return res.status(404).json({ message: "Game not found" });
    }

    const game = games.get(gameId);

    res.json({
        digits: game.digits,
        maxGuesses: game.maxGuesses,
        guessesRemaining: game.maxGuesses - game.history.length,
        history: game.history,
        status: game.status,
    });
});

app.post("/api/guess", (req, res) => {
    const { gameId, guess } = req.body || {};

    if (!gameId || !games.has(gameId)) {
        return res.status(404).json({ message: "Game not found" });
    }

    const game = games.get(gameId);

    if (game.status !== "playing") {
        return res.status(400).json({ message: "Game already finished" });
    }

    if (!guess || guess.length !== game.digits) {
        return res.status(400).json({ message: "Invalid guess length" });
    }

    let digitsCorrect = 0;
    for (let i = 0; i < guess.length; i++) {
        if (guess[i] === game.secret[i]) {
            digitsCorrect++;
        }
    }

    const turn = game.history.length + 1;
    game.history.push({ turn, guess, digitsCorrect });

    if (digitsCorrect === game.digits) {
        game.status = "win";
    } else if (turn >= game.maxGuesses) {
        game.status = "lose";
    }

    res.json({
        digits: game.digits,
        maxGuesses: game.maxGuesses,
        guessesRemaining: game.maxGuesses - game.history.length,
        history: game.history,
        status: game.status,
    });
});

app.get("/api/messages", (req, res) => {
    res.json(dataStore);
});

app.get("/api/messages/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 0 || id >= dataStore.length) {
        return res.status(404).send({ message: "Message not found" });
    }
    res.json(dataStore[id]);
});

app.post("/api/messages", (req, res) => {
    const { name, message } = req.body || {};

    if (!name || !message) {
        return res.status(400).send({ message: "Missing name or message" });
    }

    dataStore.push({ name, message });
    res.status(201).send({ message: "Received!" });
});

app.put("/api/messages/:id", (req, res) => {
    const id = Number(req.params.id);
    const { name, message } = req.body || {};

    if (!Number.isInteger(id) || id < 0 || id >= dataStore.length) {
        return res.status(404).send({ message: "Message not found" });
    }
    if (!name || !message) {
        return res.status(400).send({ message: "Missing name or message" });
    }

    dataStore[id] = { name, message };
    res.send({ message: "Updated!" });
});

app.delete("/api/messages/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 0 || id >= dataStore.length) {
        return res.status(404).send({ message: "Message not found" });
    }

    dataStore.splice(id, 1);
    res.send({ message: "Deleted!" });
});

app.listen(PORT, () => console.log(`Server: http://localhost:${PORT}`));
