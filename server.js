const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

const helper = require('./gameLogic');

// ... (existing helper function 'createBoard' if needed, or inline it)
function createBoard() {
    return Array(15).fill(null).map(() => Array(15).fill(null));
}

const rooms = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join_room', (roomId) => {
        console.log(`[DEBUG] socket ${socket.id} requesting to join room: ${roomId}`);
        if (socket.room) socket.leave(socket.room);
        socket.join(roomId);
        socket.room = roomId;

        if (!rooms[roomId]) {
            console.log(`[DEBUG] Creating new room: ${roomId}`);
            rooms[roomId] = {
                board: createBoard(),
                players: [],
                currentTurn: 'black',
                status: 'waiting' // waiting, playing, finished
            };
        }

        const room = rooms[roomId];

        // Assign role
        let playerColor = null;
        if (!room.players.some(p => p.color === 'black')) {
            playerColor = 'black';
        } else if (!room.players.some(p => p.color === 'white')) {
            playerColor = 'white';
        } else {
            console.log(`[DEBUG] Room ${roomId} full, assigning spectator`);
            // Spectator
            socket.emit('room_full', 'Room is full (Spectator Mode)');
            socket.emit('init_game', {
                color: 'spectator',
                board: room.board,
                turn: room.currentTurn,
                status: room.status
            });
            return;
        }

        room.players.push({ id: socket.id, color: playerColor });
        console.log(`User ${socket.id} joined ${roomId} as ${playerColor}. Total players: ${room.players.length}`);

        // Check if ready to start
        if (room.players.length === 2) {
            room.status = 'playing';
            io.to(roomId).emit('game_start', { message: 'Game Start! Black to move.' });
        } else {
            io.to(roomId).emit('player_joined', { message: 'Waiting for opponent...' });
        }

        // Send Initial State
        console.log(`[DEBUG] Sending init_game to ${socket.id}`);
        socket.emit('init_game', {
            color: playerColor,
            board: room.board,
            turn: room.currentTurn,
            status: room.status,
            roomId: roomId
        });
    });

    socket.on('join_solo', () => {
        const roomId = 'solo_' + socket.id;
        console.log(`[DEBUG] socket ${socket.id} creating solo room: ${roomId}`);
        if (socket.room) socket.leave(socket.room);
        socket.join(roomId);
        socket.room = roomId;

        rooms[roomId] = {
            board: createBoard(),
            players: [{ id: socket.id, color: 'solo' }],
            currentTurn: 'black',
            status: 'playing',
            isSolo: true
        };

        const room = rooms[roomId];

        socket.emit('init_game', {
            color: 'solo',
            board: room.board,
            turn: room.currentTurn,
            status: room.status,
            roomId: roomId
        });

        socket.emit('game_start', { message: 'Solo Game Started! You play both sides.' });
    });

    socket.on('place_stone', ({ roomId, row, col }) => {
        row = parseInt(row, 10);
        col = parseInt(col, 10);
        const room = rooms[roomId];
        if (!room || room.status !== 'playing') return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        if (!room.isSolo && player.color !== room.currentTurn) return; // Not your turn

        if (room.board[row][col] !== null) return; // Occupied

        const currentColor = room.currentTurn;

        // Check Forbidden Moves (Black only)
        if (currentColor === 'black') {
            room.board[row][col] = 'black'; // Temporarily place to check
            const forbiddenMsg = helper.checkForbidden(room.board, row, col);

            if (forbiddenMsg) {
                room.board[row][col] = null; // Revert
                socket.emit('forbidden_move', forbiddenMsg);
                return;
            }
            // If valid, keep it placed
        } else {
            room.board[row][col] = 'white';
        }

        // Broadcast move
        io.to(roomId).emit('update_board', { row, col, color: currentColor });

        // Check Win
        if (helper.checkWin(room.board, row, col, currentColor)) {
            room.status = 'finished';
            io.to(roomId).emit('game_over', { winner: currentColor });
        } else {
            // Turn Change
            room.currentTurn = currentColor === 'black' ? 'white' : 'black';
            io.to(roomId).emit('turn_change', { turn: room.currentTurn });
        }
    });

    socket.on('restart_game', (roomId) => {
        const room = rooms[roomId];
        // Only allow restart if game is finished (or maybe if requested? Let's allow anytime for simplicity but usually only on finish)
        if (room && room.status === 'finished') {
            room.board = createBoard();
            room.currentTurn = 'black';
            room.status = 'playing';
            io.to(roomId).emit('reset_game');
            io.to(roomId).emit('game_start', { message: 'New Game Started! Black to move.' });
            io.to(roomId).emit('turn_change', { turn: room.currentTurn });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (socket.room) {
            const room = rooms[socket.room];
            if (room) {
                room.players = room.players.filter(p => p.id !== socket.id);

                if (room.players.length < 2) {
                    room.status = 'waiting';
                    io.to(socket.room).emit('player_left', 'Opponent disconnected. Waiting...');
                }

                if (room.players.length === 0) {
                    delete rooms[socket.room];
                }
            }
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
