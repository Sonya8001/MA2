const startBtn = document.getElementById("startBtn");
const usernameEl = document.getElementById("username");

const validate = () => {
    startBtn.disabled = usernameEl.value.trim().length === 0;
};

usernameEl.addEventListener("input", validate);
validate();

startBtn.addEventListener("click", () => {
    const name = usernameEl.value.trim();
    window.location.href = `game.html?username=${encodeURIComponent(name)}`;
});
