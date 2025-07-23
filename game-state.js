(function(global){
  class GameState {
    constructor() {
      // Number of maze chunks the player has cleared
      this.clearedMazes = 0;
      // Placeholder for future expansion such as score or items
      this.score = 0;
    }

    // Increase cleared maze count when player exits a maze
    incrementMazeCount() {
      this.clearedMazes += 1;
    }

    // Reset the game progress
    reset() {
      this.clearedMazes = 0;
      this.score = 0;
    }
  }

  global.GameState = GameState;
})(typeof window !== 'undefined' ? window : global);
