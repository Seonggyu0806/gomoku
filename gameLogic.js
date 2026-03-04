// gameLogic.js

// Direction vectors: [dr, dc]
// Horizontal, Vertical, Diagonal \, Diagonal /
const DIRECTIONS = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1]
];

function isValidPos(r, c) {
    return r >= 0 && r < 15 && c >= 0 && c < 15;
}

function countSequence(board, r, c, dr, dc, color) {
    let count = 0;
    let nr = r + dr;
    let nc = c + dc;
    while (isValidPos(nr, nc) && board[nr][nc] === color) {
        count++;
        nr += dr;
        nc += dc;
    }
    return count;
}

// Check for exact 5 in a row (Win)
function checkWin(board, r, c, color) {
    for (const [dr, dc] of DIRECTIONS) {
        const countForward = countSequence(board, r, c, dr, dc, color);
        const countBackward = countSequence(board, r, c, -dr, -dc, color);
        const total = 1 + countForward + countBackward;

        if (total === 5) return true;
        // Note: For White, 6 or more is also a win usually, but for standard Gomoku 5 is the target.
        // In Freestyle, >5 is win. In Renju, White wins on >5, Black loses.
        // For simplicity: White wins on >= 5. Black wins ONLY on == 5.
        if (color === 'white' && total >= 5) return true;
    }
    return false;
}

// --- Renju Forbidden Moves (Black Only) ---

// Check if a line is "Open" (not blocked) at both ends of a sequence
// This is a simplified check. A true "Open 3" or "Open 4" requires analyzing empty spaces.
function getLineStatus(board, r, c, dr, dc, color) {
    // We are placing a stone at r,c.
    // Check the continuous line of stones including r,c
    let stones = 1;

    // Check forward
    let fr = r + dr;
    let fc = c + dc;
    while (isValidPos(fr, fc) && board[fr][fc] === color) {
        stones++;
        fr += dr;
        fc += dc;
    }

    // Check backward
    let br = r - dr;
    let bc = c - dc;
    while (isValidPos(br, bc) && board[br][bc] === color) {
        stones++;
        br -= dr;
        bc -= dc;
    }

    // Now check immediate boundaries (next to the sequence)
    // Front Boundary
    let frontOpen = false;
    if (isValidPos(fr, fc) && board[fr][fc] === null) frontOpen = true;

    // Back Boundary
    let backOpen = false;
    if (isValidPos(br, bc) && board[br][bc] === null) backOpen = true;

    return { stones, frontOpen, backOpen };
}

// Helper: Check if a "Three" can theoretically become a "Four" (i.e. not fully blocked)
function isOpenThree(board, r, c, color) {
    // This is complex. A "San-San" (3-3) is forbidden if TWO lines form "Open Threes".
    // An "Open Three" is a row of 3 stones that can become an "Open Four".
    // Simplified heuristic: Count lines that have 3 stones (including current) AND are open on both ends.
    // NOTE: This is a simplification. Real Renju rules are very subtle about "False Threes".

    let threeCount = 0;
    for (const [dr, dc] of DIRECTIONS) {
        const status = getLineStatus(board, r, c, dr, dc, color);
        // Basic Open 3: 3 stones, open on both sides.
        // Or 4 stones (if we formed a 4, it's not a 3-3 check, it's a 4-4 or win check)

        // Strict definition of Open 3 for 3-3 ban:
        // Pattern: .XXX.  (we just placed one of the X's)
        if (status.stones === 3 && status.frontOpen && status.backOpen) {
            // Check for checking 'Jump 3' (X.XX) is too hard for this snippet.
            // We focus on continuous 3.
            threeCount++;
        }
    }
    return threeCount >= 2;
}

function isDoubleFour(board, r, c, color) {
    let fourCount = 0;
    for (const [dr, dc] of DIRECTIONS) {
        const status = getLineStatus(board, r, c, dr, dc, color);
        // Open 4 or Closed 4 (4 stones)
        // In Renju, Double 4 is forbidden regardless of open/closed.
        if (status.stones === 4) {
            fourCount++;
        }
    }
    return fourCount >= 2;
}

function isOverline(board, r, c, color) {
    for (const [dr, dc] of DIRECTIONS) {
        const status = getLineStatus(board, r, c, dr, dc, color);
        if (status.stones > 5) return true;
    }
    return false;
}

function checkForbidden(board, r, c) {
    const color = 'black'; // Forbidden rules only apply to Black

    // 1. Overline (6+)
    if (isOverline(board, r, c, color)) return "Overline (6+) is forbidden for Black";

    // 2. Double Four (4-4)
    if (isDoubleFour(board, r, c, color)) return "Double 4 is forbidden for Black";

    // 3. Double Three (3-3)
    if (isOpenThree(board, r, c, color)) return "Double 3 is forbidden for Black";

    return null;
}

module.exports = {
    checkWin,
    checkForbidden
};
