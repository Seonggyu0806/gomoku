# Real-time Gomoku

A real-time, browser-based Gomoku (Five in a Row) game built with Node.js, Express, and Socket.IO.

## Features

- **Online Multiplayer**: Create or join a room using a custom Room ID to play against your friends in real-time.
- **Solo Play (Practice Mode)**: Play both Black and White sides yourself to practice strategies.
- **Spectator Mode**: If a room is full (2 players), additional users joining the same room will automatically become spectators and can watch the game live.
- **Renju Rules (Forbidden Moves)**: To balance the game, strict Renju rules are applied to the Black player:
  - **Overline (6+)**: Placing 6 or more stones in a row is forbidden.
  - **Double Four (4-4)**: Creating two simultaneous lines of four is forbidden.
  - **Double Three (3-3)**: Creating two simultaneous lines of open threes is forbidden.
- **Real-time Engine**: Powered by Socket.IO for instant move broadcasting, turn management, and game state synchronization.

## Tech Stack

- **Backend**: Node.js, Express
- **Real-time Communication**: Socket.IO
- **Frontend**: HTML, Vanilla CSS, JavaScript

## Installation and Run

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
   Or for development mode:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:3000`.

## How to Play

1. Enter a Room Name on the home screen and click "Join Game" to play online.
2. Alternatively, click "Play Alone (Practice)" to start a solo game.
3. Black moves first. Click on the board intersections to place your stones.
4. The first player to align exactly 5 stones horizontally, vertically, or diagonally wins.
