const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreLabel = document.getElementById("scoreLabel");

const box = 38;  // ขนาดของกล่องแต่ละช่อง
let snake, prevSnake, food, score, d, pendingDir, gameOver;

// โหลดรูปหัวงู
let headImg = new Image();
headImg.src = "head.png";

// โหลดเสียงเอฟเฟกต์
let eatSound = new Audio("eat.mp3");
let gameOverSound = new Audio("gameover.mp3");
eatSound.volume = 0.6;
gameOverSound.volume = 0.7;

function playEatSound() {
    eatSound.currentTime = 0;
    eatSound.play().catch(() => {});
}

function playGameOverSound() {
    gameOverSound.currentTime = 0;
    gameOverSound.play().catch(() => {});
}

// ===== ตั้งค่าความเร็ว/ความ smooth =====
// ระยะเวลาต่อการขยับ 1 ช่อง (ms) — ยิ่งน้อยยิ่งเร็ว ปรับได้อิสระจาก fps ของจอ
let moveInterval = 120;
let lastMoveTime = 0;

// เริ่มเกม
function init() {
    snake = [{ x: 9 * box, y: 10 * box }];
    prevSnake = [{ x: 9 * box, y: 10 * box }];
    food = randomFood();
    score = 0;
    d = null;
    pendingDir = null;
    gameOver = false;
    lastMoveTime = 0;
    scoreLabel.textContent = "0";
    gameOverSound.pause();
    gameOverSound.currentTime = 0;
    requestAnimationFrame(draw);
}

function randomFood() {
    return {
        x: Math.floor(Math.random() * (canvas.width / box - 1) + 1) * box,
        y: Math.floor(Math.random() * (canvas.height / box - 1) + 1) * box
    };
}

document.addEventListener("keydown", direction);

function direction(event) {
    if (!gameOver) {
        // เก็บทิศทางที่ผู้เล่นกดไว้ใน pendingDir แล้วค่อยนำไปใช้ตอน tick ถัดไป
        // เพื่อไม่ให้ input หาย/ขัดกันระหว่างเฟรม
        if (event.keyCode == 37 && d !== "RIGHT") pendingDir = "LEFT";
        else if (event.keyCode == 38 && d !== "DOWN") pendingDir = "UP";
        else if (event.keyCode == 39 && d !== "LEFT") pendingDir = "RIGHT";
        else if (event.keyCode == 40 && d !== "UP") pendingDir = "DOWN";
    } else if (event.keyCode == 13) {
        init();
    }
}

// ตรวจสอบการชน
function collision(newHead, array) {
    for (let i = 0; i < array.length; i++) {
        if (newHead.x === array[i].x && newHead.y === array[i].y) {
            return true;
        }
    }
    return false;
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// วาดหางเป็นรูปสามเหลี่ยม โดยฐานหันเข้าหาลำตัว ปลายแหลมชี้ออก
function drawTailTriangle(ctx, x, y, dirX, dirY, size, color) {
    let p1, p2, tip;
    if (dirX > 0) { // ลำตัวอยู่ทางขวา ฐานอยู่ขวา ปลายชี้ซ้าย
        p1 = { x: x + size, y: y };
        p2 = { x: x + size, y: y + size };
        tip = { x: x, y: y + size / 2 };
    } else if (dirX < 0) { // ลำตัวอยู่ทางซ้าย ฐานอยู่ซ้าย ปลายชี้ขวา
        p1 = { x: x, y: y };
        p2 = { x: x, y: y + size };
        tip = { x: x + size, y: y + size / 2 };
    } else if (dirY > 0) { // ลำตัวอยู่ด้านล่าง ฐานอยู่ล่าง ปลายชี้ขึ้น
        p1 = { x: x, y: y + size };
        p2 = { x: x + size, y: y + size };
        tip = { x: x + size / 2, y: y };
    } else { // ลำตัวอยู่ด้านบน (หรือ default) ฐานอยู่บน ปลายชี้ลง
        p1 = { x: x, y: y };
        p2 = { x: x + size, y: y };
        tip = { x: x + size / 2, y: y + size };
    }

    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

// อัปเดตตรรกะเกม 1 ช่อง (ไม่วาด)
function tick() {
    if (d === null && pendingDir === null) return; // ยังไม่เริ่มขยับ
    if (pendingDir) d = pendingDir;

    prevSnake = snake.map(s => ({ x: s.x, y: s.y }));

    let snakeX = snake[0].x;
    let snakeY = snake[0].y;

    if (d === "LEFT") snakeX -= box;
    if (d === "UP") snakeY -= box;
    if (d === "RIGHT") snakeX += box;
    if (d === "DOWN") snakeY += box;

    let ate = snakeX === food.x && snakeY === food.y;
    if (ate) {
        score++;
        scoreLabel.textContent = score;
        food = randomFood();
        playEatSound();
    } else {
        snake.pop();
    }

    let newHead = { x: snakeX, y: snakeY };

    if (
        snakeX < 0 || snakeY < 0 ||
        snakeX >= canvas.width || snakeY >= canvas.height ||
        collision(newHead, snake)
    ) {
        gameOver = true;
        playGameOverSound();
    }

    snake.unshift(newHead);
}

function draw(currentTime) {
    if (!gameOver) {
        if (lastMoveTime === 0) lastMoveTime = currentTime;
        if (currentTime - lastMoveTime >= moveInterval) {
            lastMoveTime += moveInterval;
            tick();
        }
    }

    // alpha = ความคืบหน้าไปยังช่องถัดไป ใช้ทำ interpolation ให้ลื่น
    let alpha = gameOver ? 1 : Math.min(1, (currentTime - lastMoveTime) / moveInterval);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // เส้นตารางจาง ๆ เพิ่มมิติให้พื้น
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let gx = box; gx < canvas.width; gx += box) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, canvas.height);
        ctx.stroke();
    }
    for (let gy = box; gy < canvas.height; gy += box) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(canvas.width, gy);
        ctx.stroke();
    }

    // อาหาร — เต้นเบา ๆ พร้อมแสงเรือง
    let pulse = 1 + Math.sin(currentTime / 180) * 0.08;
    let fs = box * pulse;
    let fo = (box - fs) / 2;
    ctx.save();
    ctx.shadowColor = "#ff3d3d";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#ff4d4d";
    roundRect(ctx, food.x + fo, food.y + fo, fs, fs, 8);
    ctx.fill();
    ctx.restore();

    // งู — วาดจากหางไปหัวพร้อม interpolation ให้เคลื่อนไหวลื่นไหล
    for (let i = snake.length - 1; i >= 0; i--) {
        let prev = prevSnake[i] || prevSnake[prevSnake.length - 1] || snake[i];
        let x = lerp(prev.x, snake[i].x, alpha);
        let y = lerp(prev.y, snake[i].y, alpha);

        if (i === 0) {
            ctx.save();
            ctx.shadowColor = "rgba(217,255,0,0.6)";
            ctx.shadowBlur = 10;
            ctx.drawImage(headImg, x, y, box, box);
            ctx.restore();
        } else if (i === snake.length - 1) {
            // หาง — สามเหลี่ยมสีน้ำตาลเข้ม ฐานหันเข้าหาปล้องถัดไป
            let next = snake[i - 1];
            let dx = next.x - snake[i].x;
            let dy = next.y - snake[i].y;
            drawTailTriangle(ctx, x, y, dx, dy, box, "#4a2c17");
        } else {
            let t = i / snake.length;
            let g = Math.floor(180 - t * 90);
            ctx.fillStyle = `rgb(40, ${g}, 60)`;
            roundRect(ctx, x + 1, y + 1, box - 2, box - 2, 8);
            ctx.fill();
        }
    }

    if (gameOver) {
        ctx.save();
        ctx.fillStyle = "rgba(6, 10, 20, 0.72)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.textAlign = "center";
        ctx.fillStyle = "#ff4d4d";
        ctx.font = "bold 64px 'Bebas Neue', Arial";
        ctx.shadowColor = "rgba(255,77,77,0.6)";
        ctx.shadowBlur = 18;
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 20);

        ctx.shadowBlur = 0;
        ctx.fillStyle = "#d9ff00";
        ctx.font = "28px Arial";
        ctx.fillText(`คะแนน ${score}`, canvas.width / 2, canvas.height / 2 + 25);

        ctx.fillStyle = "#fff";
        ctx.font = "20px Arial";
        ctx.fillText("กด Enter เพื่อเริ่มเกมใหม่", canvas.width / 2, canvas.height / 2 + 60);
        ctx.textAlign = "start";
        ctx.restore();
    }

    requestAnimationFrame(draw);
}

init();
