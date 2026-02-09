const boardElement = document.getElementById("board");
const minesLeftElement = document.getElementById("mines-left");
const timerElement = document.getElementById("timer");
const statusElement = document.getElementById("game-status");
const newGameButton = document.getElementById("new-game");
const difficultySelect = document.getElementById("difficulty");

const DIFFICULTIES = {
  easy: { rows: 8, cols: 8, mines: 10 },
  medium: { rows: 12, cols: 12, mines: 25 },
  hard: { rows: 16, cols: 16, mines: 40 },
};

let board = [];
let mineCount = 0;
let flagsPlaced = 0;
let revealedCount = 0;
let timer = 0;
let timerInterval = null;
let gameOver = false;
let firstClick = true;

function startTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    timer += 1;
    timerElement.textContent = timer;
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function setStatus(message, type = "") {
  statusElement.textContent = message;
  statusElement.style.color = type === "win" ? "var(--success)" : type === "lose" ? "var(--danger)" : "var(--text)";
}

function shuffle(array) {
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
  }
  return array;
}

function createBoard({ rows, cols, mines }) {
  board = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => ({
      row,
      col,
      hasMine: false,
      revealed: false,
      flagged: false,
      adjacent: 0,
    }))
  );
  mineCount = mines;
  flagsPlaced = 0;
  revealedCount = 0;
  timer = 0;
  firstClick = true;
  gameOver = false;
  stopTimer();
  timerElement.textContent = "0";
  minesLeftElement.textContent = mineCount;
  setStatus("Ready");
  renderBoard();
}

function plantMines(safeRow, safeCol) {
  const cells = [];
  board.forEach((row) => row.forEach((cell) => cells.push(cell)));

  const safeCells = cells.filter((cell) =>
    Math.abs(cell.row - safeRow) <= 1 && Math.abs(cell.col - safeCol) <= 1
  );
  const safeSet = new Set(safeCells.map((cell) => `${cell.row}-${cell.col}`));
  const candidates = cells.filter((cell) => !safeSet.has(`${cell.row}-${cell.col}`));

  shuffle(candidates)
    .slice(0, mineCount)
    .forEach((cell) => {
      cell.hasMine = true;
    });

  calculateAdjacents();
}

function calculateAdjacents() {
  for (const row of board) {
    for (const cell of row) {
      if (cell.hasMine) {
        cell.adjacent = 0;
        continue;
      }
      let count = 0;
      forEachNeighbor(cell.row, cell.col, (neighbor) => {
        if (neighbor.hasMine) count += 1;
      });
      cell.adjacent = count;
    }
  }
}

function forEachNeighbor(row, col, callback) {
  for (let r = row - 1; r <= row + 1; r += 1) {
    for (let c = col - 1; c <= col + 1; c += 1) {
      if (r < 0 || c < 0 || r >= board.length || c >= board[0].length) continue;
      if (r === row && c === col) continue;
      callback(board[r][c]);
    }
  }
}

function renderBoard() {
  boardElement.style.gridTemplateColumns = `repeat(${board[0].length}, 36px)`;
  boardElement.innerHTML = "";
  board.forEach((row) => {
    row.forEach((cell) => {
      const tile = document.createElement("button");
      tile.className = "tile";
      tile.setAttribute("type", "button");
      tile.dataset.row = cell.row;
      tile.dataset.col = cell.col;
      tile.addEventListener("click", handleReveal);
      tile.addEventListener("contextmenu", handleFlag);
      boardElement.appendChild(tile);
    });
  });
  updateBoardDisplay();
}

function updateBoardDisplay() {
  for (const tile of boardElement.children) {
    const row = Number(tile.dataset.row);
    const col = Number(tile.dataset.col);
    const cell = board[row][col];

    tile.classList.toggle("revealed", cell.revealed);
    tile.classList.toggle("flagged", cell.flagged);
    tile.classList.toggle("mine", cell.hasMine);
    tile.classList.toggle("safe", cell.revealed && cell.adjacent > 0 && !cell.hasMine);
    tile.textContent = "";

    if (cell.flagged) {
      tile.textContent = "🚩";
      continue;
    }

    if (cell.revealed) {
      if (cell.hasMine) {
        tile.textContent = "💣";
      } else if (cell.adjacent > 0) {
        tile.textContent = cell.adjacent;
      }
    }
  }
}

function handleReveal(event) {
  if (gameOver) return;
  const row = Number(event.currentTarget.dataset.row);
  const col = Number(event.currentTarget.dataset.col);
  const cell = board[row][col];

  if (cell.flagged || cell.revealed) return;

  if (firstClick) {
    plantMines(row, col);
    startTimer();
    firstClick = false;
  }

  revealCell(cell);
  updateBoardDisplay();
  checkWinCondition();
}

function handleFlag(event) {
  event.preventDefault();
  if (gameOver || firstClick) return;
  const row = Number(event.currentTarget.dataset.row);
  const col = Number(event.currentTarget.dataset.col);
  const cell = board[row][col];

  if (cell.revealed) return;
  cell.flagged = !cell.flagged;
  flagsPlaced += cell.flagged ? 1 : -1;
  minesLeftElement.textContent = Math.max(mineCount - flagsPlaced, 0);
  updateBoardDisplay();
}

function revealCell(cell) {
  if (cell.revealed || cell.flagged) return;
  cell.revealed = true;
  revealedCount += 1;

  if (cell.hasMine) {
    endGame(false, cell);
    return;
  }

  if (cell.adjacent === 0) {
    forEachNeighbor(cell.row, cell.col, (neighbor) => {
      if (!neighbor.revealed && !neighbor.hasMine) {
        revealCell(neighbor);
      }
    });
  }
}

function endGame(won, explodedCell = null) {
  gameOver = true;
  stopTimer();
  setStatus(won ? "You cleared the field!" : "Boom! You hit a mine.", won ? "win" : "lose");

  board.forEach((row) => {
    row.forEach((cell) => {
      if (cell.hasMine) cell.revealed = true;
    });
  });

  if (explodedCell) {
    const tile = [...boardElement.children].find(
      (element) => Number(element.dataset.row) === explodedCell.row && Number(element.dataset.col) === explodedCell.col
    );
    if (tile) tile.classList.add("exploded");
  }

  updateBoardDisplay();
}

function checkWinCondition() {
  const totalCells = board.length * board[0].length;
  if (revealedCount === totalCells - mineCount) {
    endGame(true);
  }
}

function setupListeners() {
  newGameButton.addEventListener("click", () => {
    createBoard(DIFFICULTIES[difficultySelect.value]);
  });

  difficultySelect.addEventListener("change", () => {
    createBoard(DIFFICULTIES[difficultySelect.value]);
  });
}

setupListeners();
createBoard(DIFFICULTIES[difficultySelect.value]);
