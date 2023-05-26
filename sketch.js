
// Classes

class Cell {
  constructor() {
    this.value = 0;
    this.revealed = 0;
    this.flagged = 0;
  }

  color() {
    if (this.flagged) {
      return 'gray';
    }

    if (this.revealed) {
      return this.value === Emoji.Mine ? 'maroon' : 'silver';
    }

    return 'gray';
  }

  flag() {
    this.flagged = !this.flagged;
  }

  draw(x, y) {
    fill(this.color());
    rect(x, y, CELL_SIZE, CELL_SIZE);

    fill('black')
    if (this.flagged) {
      text(Emoji.Flag, x + CELL_SIZE/2, y + CELL_SIZE/2)
    } else if (this.revealed) {
      if (this.value !== Emoji.Mine) {
        fill(COLORS[this.value])
      }
      text(this.value, x + CELL_SIZE/2, y + CELL_SIZE/2);
    }
  }
}

class Grid {
  constructor(size) {
    this.size = size;
    this.grid = new Array(this.size).fill(0).map(v => new Array(this.size).fill(0).map(v => new Cell()));
    this.generated = false;
  }

  adjacentMineCount(x, y) {
    let v = 0;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {

      if (i === 0 && j === 0) {
        continue;
      }

      let xx = x + i;
      let yy = y + j;

      if (xx < 0 || yy < 0 || xx >= this.size || yy >= this.size) {
        continue;
      }

      v += (this.grid[xx][yy].value === Emoji.Mine);
      }
    }

    return v;
  }

  cell(x, y) {
    return this.grid[x][y];
  }

  flaggedMineCount() {
    return this.grid.flat().reduce((total, cur) => {
      return total + (cur.value === Emoji.Mine && cur.flagged);
    }, 0)
  }

  generate(initialX, initialY) {

    // Place mines
    let remainingMines = MINE_COUNT;
    
    while (remainingMines > 0) {
      let x = 0;
      let y = 0;

      do {
        x = Math.floor(random(0, this.size));
        y = Math.floor(random(0, this.size));
      } while(this.grid[x][y].value === Emoji.Mine || (x === initialX && y === initialY));

      this.grid[x][y].value = Emoji.Mine;
      remainingMines--;
    }

    // Assign values to cells
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
  
        // Only care about mines
        if (this.grid[i][j].value === Emoji.Mine) {
          continue;
        }

        this.grid[i][j].value = this.adjacentMineCount(i, j);
      }
    }
    this.generated = true;
  }

  reset() {
    this.grid = new Array(this.size).fill(0).map(v => new Array(this.size).fill(0).map(v => new Cell()));
    this.generated = false;    
  }

  reveal(x, y) {

    this.grid[x][y].revealed = true;

    if (this.grid[x][y].value === Emoji.Mine) {

      for (let i = 0; i < this.size; i++) {
        for (let j = 0; j < this.size; j++) {
          this.grid[i][j].revealed = true;
        }
      }
      state = State.Lose;
      surpriseFrames = 0;

      return;

    }

    // Reveal other cells only if it's a 0
    if (this.grid[x][y].value !== 0) {
      return;
    }

    let xOff = [ -1, 0, 0, 1 ];
    let yOff = [ 0, 1, -1, 0 ];
    for (let i = 0; i < 4; i++) {
      let newX = x + xOff[i];
      let newY = y + yOff[i];
      if (newX < 0 || newX >= this.size || newY < 0 || newY >= this.size) {
        continue;
      }

      if (this.grid[newX][newY].revealed || this.grid[newX][newY].flagged) {
        continue;
      }

      this.reveal(newX, newY);

    }

  }

  unrevealedCount() {
    return this.grid.flat().reduce((total, cell) => {
      return total + !cell.revealed;
    }, 0);
  }

  draw() {
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        this.grid[i][j].draw(i*CELL_SIZE, j*CELL_SIZE);
      }
    }
  }
}





// Global constants

const CANVAS_SIZE = 720;
const CELL_COUNT = 16;
const CELL_SIZE = CANVAS_SIZE / CELL_COUNT;
const MINE_COUNT = 40;
const COLORS = [ 'silver', 'blue', 'red', 'navy', 'maroon', 'teal', 'black', 'gray' ];
const Emoji = {
  Mine : '💣',
  Flag : '🚩',
  Neutral : '🙂',
  Surprise : '😯',
  Dead : '😵',
  Cool : '😎'
};
const State = {
  Play : 0,
  Win : 1,
  Lose : 2
};





// Global variables

let grid = new Grid(CELL_COUNT);
let state = State.Play;
let surpriseFrames = 0;
let emoji = undefined;





// p5.js functions

function setup() {
  createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  textAlign(CENTER, CENTER);
  textSize(24)

  // Disable right click menu hack
  // Source: bluelhf via https://stackoverflow.com/a/66956463
  for (let element of document.getElementsByClassName("p5Canvas")) {
    element.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  // Create other DOM elements
  emoji = createElement('h1', Emoji.Neutral);
  replayButton = createButton('Replay');
  replayButton.mousePressed(() => {
    state = State.Play;
    grid.reset();
  });
}

function mousePressed() {

  // Only check for clicks during the gmae
  if (state === State.Win || state === State.Lose) {
    return;
  }

  // Reject clicks outside of the canvas bounds
  if (!within(mouseX, 0, CANVAS_SIZE) || !within(mouseY, 0, CANVAS_SIZE)) {
    return;
  } 

  // Get the cell index from the mouse position
  let xPos = Math.floor(mouseX / CELL_SIZE) * CELL_SIZE;
  let yPos = Math.floor(mouseY / CELL_SIZE) * CELL_SIZE;
  let xIdx = xPos / CELL_SIZE;
  let yIdx = yPos / CELL_SIZE;

  // Generate the grid on the first reveal so we know where to not generate a mine
  if (!grid.generated) {
    grid.generate(xIdx, yIdx);
  }

  // Check for reveal/flagging
  if (mouseButton === LEFT) {
    let cell = grid.cell(xIdx, yIdx);

    // Only allow the user to reveal if the cell is not flagged
    if (cell.flagged || cell.revealed) {
      return
    }

    surpriseFrames = 30;
    grid.reveal(xIdx, yIdx);

    if (grid.unrevealedCount() == MINE_COUNT) {
      state = State.Win;

      // Flag all the mines if we are in a win condition
      for (let i = 0; i < CELL_COUNT; i++) {
        for (let j = 0; j < CELL_COUNT; j++) {
          let cell = grid.cell(i, j);
          if (cell.value === Emoji.Mine && !cell.flagged) {
            cell.flag();
          }
        }
      }

      surpriseFrames = 0;
    }

  } else if (mouseButton === RIGHT) {
    let cell = grid.cell(xIdx, yIdx);
    if (cell.revealed) {
      return
    }

    cell.flag();
  }
}

function draw() {
  background(220);

  if (state === State.Play) {
    if (surpriseFrames > 0) {
      emoji.html(Emoji.Surprise);
      surpriseFrames--;
    } else {
      emoji.html(Emoji.Neutral);
    }
  } else if (state === State.Win) {
    emoji.html(Emoji.Cool);
  } else if (state === State.Lose) {
    emoji.html(Emoji.Dead);
  }

  grid.draw();
}





// Helper functions

function within(val, start, end) {
  return val > start && val < end;
}
