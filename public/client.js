const socket = io();

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const roomInput = document.getElementById('room-input');
const joinBtn = document.getElementById('join-btn');
const boardEl = document.getElementById('omok-board');
const turnIndicator = document.getElementById('turn-indicator');
const playerRole = document.getElementById('player-role');
const messageArea = document.getElementById('message-area');
const restartBtn = document.getElementById('restart-btn');
const soloBtn = document.getElementById('solo-btn');

let myColor = null;
let currentRoom = null;
let isMyTurn = false;

// Join Room
joinBtn.addEventListener('click', () => {
    const roomName = roomInput.value.trim();
    console.log(`[DEBUG] Join button clicked. Room: ${roomName}`);
    if (roomName) {
        console.log('[DEBUG] Emitting join_room');
        socket.emit('join_room', roomName);
        currentRoom = roomName;
    } else {
        alert("Please enter a room name!");
    }
});

if (soloBtn) {
    soloBtn.addEventListener('click', () => {
        console.log('[DEBUG] Solo button clicked.');
        socket.emit('join_solo');
    });
}

socket.on('connect', () => {
    console.log('[DEBUG] Connected to server with ID:', socket.id);
});

// Initialize Board UI
function initBoard(boardData) {
    boardEl.innerHTML = '';
    for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.col = c;

            // Hover/Click zone
            const trigger = document.createElement('div');
            trigger.classList.add('cell-trigger');
            trigger.addEventListener('click', () => handleCellClick(r, c));
            cell.appendChild(trigger);

            // Star points (Only the center point requested)
            const isStar = (r === 7 && c === 7);
            if (isStar) {
                const star = document.createElement('div');
                star.classList.add('star-point');
                cell.appendChild(star);
            }

            // Existing stone?
            if (boardData && boardData[r][c]) {
                const stone = document.createElement('div');
                stone.classList.add('stone', boardData[r][c]);
                cell.appendChild(stone);
            }

            boardEl.appendChild(cell);
        }
    }
}

function handleCellClick(r, c) {
    if (!myColor || !isMyTurn) return;
    socket.emit('place_stone', { roomId: currentRoom, row: r, col: c });
}

// Socket Events
// Socket Events
socket.on('init_game', ({ color, board, turn, status, roomId }) => {
    myColor = color;
    if (roomId) currentRoom = roomId;

    loginScreen.classList.remove('active');
    gameScreen.classList.add('active');

    if (myColor === 'spectator') {
        playerRole.innerHTML = `You: <span class="role-indicator">Spectator</span>`;
    } else if (myColor === 'solo') {
        playerRole.innerHTML = `You: <span class="role-indicator" style="color: #4CAF50">Solo Mode (Both)</span>`;
    } else {
        playerRole.innerHTML = `You: <span class="role-indicator" style="color: ${color === 'black' ? '#000' : '#888'}">${color.toUpperCase()}</span>`;
    }

    updateTurn(turn);
    initBoard(board);

    if (status === 'waiting') {
        messageArea.textContent = "Waiting for opponent to join...";
    } else if (status === 'playing') {
        messageArea.textContent = "Game in progress!";
    }
});

socket.on('player_joined', ({ message }) => {
    messageArea.textContent = message;
});

socket.on('game_start', ({ message }) => {
    messageArea.textContent = message;
    restartBtn.style.display = 'none';
});

socket.on('room_full', (msg) => {
    alert(msg);
});

socket.on('update_board', ({ row, col, color }) => {
    const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    if (cell && !cell.querySelector('.stone')) {
        const stone = document.createElement('div');
        stone.classList.add('stone', color);
        cell.appendChild(stone);

        // Remove forbidden marker if exists
        cell.classList.remove('forbidden');
    }
});

socket.on('forbidden_move', (msg) => {
    messageArea.textContent = `🚫 ${msg}`;
    // simple visual shake or alert could go here
    messageArea.style.color = 'red';
    setTimeout(() => {
        messageArea.style.color = ''; // reset
        if (isMyTurn) messageArea.textContent = "Your Turn";
    }, 2000);
});

socket.on('turn_change', ({ turn }) => {
    updateTurn(turn);
    // messageArea.textContent = ""; 
});

socket.on('game_over', ({ winner }) => {
    messageArea.textContent = `🏆 ${winner.toUpperCase()} WINS!`;
    isMyTurn = false;
    restartBtn.style.display = 'block';
});

socket.on('reset_game', () => {
    initBoard(null); // Clear board
    messageArea.textContent = 'Game Restarted!';
    restartBtn.style.display = 'none';
});

socket.on('player_left', (msg) => {
    messageArea.textContent = msg;
    isMyTurn = false;
    // Optional: Lock board
    boardEl.style.opacity = '0.5';
});

restartBtn.addEventListener('click', () => {
    socket.emit('restart_game', currentRoom);
});

function updateTurn(turn) {
    turnIndicator.textContent = `Turn: ${turn.toUpperCase()}`;
    if (myColor === 'solo') {
        isMyTurn = true;
    } else {
        isMyTurn = (turn === myColor);
    }

    // Visual cue for turn
    boardEl.style.opacity = isMyTurn ? '1' : '0.8';
    boardEl.style.cursor = isMyTurn ? 'pointer' : 'not-allowed';
}
