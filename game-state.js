export class GameState {
  constructor() {
    // Number of maze chunks the player has cleared
    this.clearedMazes = 0;
  }

  // Increase cleared maze count when player exits a maze
  incrementMazeCount() {
    this.clearedMazes += 1;
  }

  // Reset the game progress
  reset() {
    this.clearedMazes = 0;
  }
}

const gameState = new GameState();
export default gameState;
