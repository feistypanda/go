(() => {
	    
const [WIDTH, HEIGHT, SCALE] = ((EXPECTED_WIDTH = 600, EXPECTED_HEIGHT = 600, PADDING = 20) => {

	const ASPECT_RATIO = EXPECTED_WIDTH/EXPECTED_HEIGHT;

	// Source - https://stackoverflow.com/a/8876069
	// Posted by ryanve, modified by community. See post 'Timeline' for change history
	// Retrieved 2026-09-27, License - CC BY-SA 4.0

	// Get viewport WIDTH and HEIGHT
	let vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0) - PADDING * 2;
	let vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0) - PADDING * 2;

	// Scale the vh so that it would be equal to hw if they had the desired aspect ratio
	let scaledVH = vh * ASPECT_RATIO;

	// Find out which dimension is the constraining one;
	let min = Math.min(vw, scaledVH);

	if (min === vw) {
		return [vw, vw / ASPECT_RATIO, vw/EXPECTED_WIDTH];
	} else {
		return [vh * ASPECT_RATIO, vh, vh/EXPECTED_HEIGHT];
	}
})(600, 600);

const colors = {
	darkBlack: color(10, 5, 5),
	black: color(25, 20, 20),
	lightBlack: color(35, 25, 25),
	white: color(200),
};

let click = false;
let keys = {};

const copyObj = obj => JSON.parse(JSON.stringify(obj));
const clamp = (x, min, max) => Math.max(Math.min(x, max), min);

const images = (() => {

	const images = {

	};

	return images;
})();

const BoardState = (() => {
	class BoardState {

		#rows = 0;
		#columns = 0;
		#state = "0n";

		static splitState (state) {
			return state.match(/\d+\D*/g);
		}

		static validateState (state, numTiles) {

			if (!state) throw "state is falsy";
			if (!(typeof state === "string")) throw "state must be a string";
			state = state.toLowerCase();
			if (state.match(/[^nwb\d]/)) throw "invalid character";
			if (state.match(/[a-z][a-z]/)) throw "two letters in a row";
			if (state[0].match(/[^0-9]/)) throw "must start with number";
			if (state[state.length - 1].match(/[^a-z]/)) throw "must end with letter";
			
			let split = BoardState.splitState(state);

			let n = 0;
			for (const i of split) {
				n += +i.slice(0, -1);
			}

			if (n !== numTiles) throw "Length mismatch";

			return state;
		}

		static validateCoords (state, x, y) {
			return x >= 0 && x < state.columns && y >= 0 && y < state.rows;
		}

		static cleanUpSplitState (split) {
			let res = [];
			let final = [];

			for (const i of split) {
				let type = i.slice(-1);
				let num = +i.slice(0, -1);
				res.push([num, type]);
			}

			for (let i = 0; i < res.length; i ++) {
				if (final.length > 0 && final[final.length - 1][1] === res[i][1]) final[final.length - 1][0] += res[i][0];
				else if (res[i][0] > 0) final.push(res[i]);
			}

			final = final.map(x => x[0] + x[1]);

			return final.join("");
		}

		static cleanUpState (state) {
			return BoardState.cleanUpSplitState(BoardState.splitState(state));
		}

		constructor (config) {
			this.#rows = config.rows;
			this.#columns = config.columns;

			this.state = config.state ?? this.rows * this.columns + "n";

		}

		get state () {
			return this.#state;
		}

		set state (state) {
			this.#state = BoardState.validateState(state, this.rows * this.columns);
		}

		get rows () {
			return this.#rows;
		}

		get columns () {
			return this.#columns;
		}

		get expandedState () {

			let res = "";

			let split = this.splitState;

			for (const i of split) {
				let type = i.slice(-1);
				let num = +i.slice(0, -1);

				for (let j = 0; j < num; j ++) res += type;
			}

			return res;
		}

		get splitState () {
			return BoardState.splitState(this.state);
		}

		setAtCoords (x, y, type) {
			if (!BoardState.validateCoords(this, x, y)) throw "invalid coords";

			if ((typeof type) !== "string") throw "type must be a string";
			if (type.length !== 1) throw "type must have length 1";
			if (type.match(/[^wbn]/)) throw "type must be char w, b, or n";

			let split = this.splitState;
			let newSplit = [];

			let target = y * this.columns + x;

			let curInd = 0;

			let done = false;

			for (let i = 0; i < split.length; i ++) {
				let curType = split[i].slice(-1);
				let num = +split[i].slice(0, -1);

				if (curInd + num > target && !done) {

					done = true;

					let diff = target - curInd;

					newSplit.push(diff + curType);
					newSplit.push("1" + type);
					newSplit.push((num - diff - 1) + curType);

				} else {
					newSplit.push(split[i]);
				}

				curInd += num;
			}

			this.state = BoardState.cleanUpSplitState(newSplit);
		}

		getAtCoords (x, y) {
			if (!BoardState.validateCoords(this, x, y)) throw "invalid coords";

			let target = y * this.columns + x;

			return this.expandedState[target];
		}
	}

	return BoardState;
})();

const BoardDisplayer = (() => {
	class BoardDisplayer {

		#boardState = null;
		#gameHandler = null; // gameHandler to get rows and columns from

		constructor (config = {}) {

			this.x = config.x ?? 0;
			this.y = config.y ?? 0;

			this.width = config.width ?? 600 * SCALE;
			this.height = config.height ?? 600 * SCALE;

			this.padding = config.padding ?? 1;
		}

		set gameHandler (handler) {
			this.#gameHandler = handler;

			this.rows = handler.rows;
			this.columns = handler.columns;

			this.#boardState = new BoardState({
				rows: handler.rows,
				columns: handler.columns,
			})
		}

		get gameHandler () {
			return this.#gameHandler;
		}

		set boardState (newState) {
			this.#boardState.state = newState;
		}

		get boardState () {
			return this.#boardState.state;
		}

		get startX () {
			return this.tileWidth * (0.5 + this.padding/2);
		}

		get startY () {
			return this.tileHeight * (0.5 + this.padding/2);
		}

		get gridX () {
			return this.startX - this.tileWidth/2;
		}

		get gridY () {
			return this.startY - this.tileHeight/2;
		}

		get gridWidth () {
			return this.columns * this.tileWidth;
		}

		get gridHeight () {
			return this.rows * this.tileHeight;
		}

		get expandedBoardState () {
			if (!this.#boardState) throw "no board state";
			return this.#boardState.expandedState;
		}

		get tileWidth () {
			return this.width/(this.columns + this.padding);
		}

		get tileHeight () {
			return this.height/(this.rows + this.padding);
		}

		displayBackground () {
			noStroke();
			fill(200, 150, 150);
			rect(this.x, this.y, this.width, this.height);
		}

		displayIntersections () {
			stroke(0);
			strokeWeight(2 * SCALE);

			for (let i = 0; i < this.rows; i ++) {
				let y = this.y + this.startY + this.tileHeight * i;
				line(this.x + this.startX, y, this.x + this.width - this.startX, y);
			}

			for (let i = 0; i < this.columns; i ++) {
				let x = this.x + this.startX + this.tileWidth * i;
				line(x, this.y + this.startY, x, this.y + this.height - this.startY);
			}
		}

		displayTiles () {
			noStroke();

			let expanded = this.expandedBoardState;

			for (let i = 0; i < expanded.length; i ++) {
				let cur = expanded[i];

				if (cur === "n") continue;
				if (cur === "w") fill(255);
				if (cur === "b") fill(0);

				let x = this.startX + (i % this.columns) * this.tileWidth;
				let y = this.startY + (~~(i / this.columns)) * this.tileHeight;

				ellipse(x, y, this.tileWidth * 0.7, this.tileHeight * 0.7);
			}
		}

		display () {

			push();
			
			this.displayBackground();
			this.displayIntersections();
			this.displayTiles();

			pop();
		}
	}

	return BoardDisplayer;
})();

const GameHandler = (() => {
	class GameHandler {

		#displayer = null;
		#state = "0n";

		#rows = 0;
		#columns = 0;

		#boardDisplayer = null;

		constructor (config) {
			this.#rows = config.rows;
			this.#columns = config.columns;
			
			this.state = new BoardState({
				rows: this.#rows,
				columns: this.#columns,
			});
		}

		get rows () {
			return this.#rows;
		}

		get columns () {
			return this.#columns;
		}

		get boardDisplayer () {
			return this.#boardDisplayer;
		}

		set boardDisplayer (displayer)  {
			this.#boardDisplayer = displayer;
		}

		playMove (x, y, color) {
			if (this.state.getAtCoords(x, y) === "n") {
				this.state.setAtCoords(x, y, color);
				this.boardDisplayer.boardState = this.state.state;
			}
		}
	}

	return GameHandler;
})();

const MoveHandler = (() => {
	class MoveHandler {

		#gameHandler = null; // To send moves to
		#boardDisplayer = null; // To figure out input areas

		constructor (config) {

		}

		set gameHandler (gameHandler) {
			this.#gameHandler = gameHandler;
		}

		get gameHandler () {
			return this.#gameHandler;
		}

		set boardDisplayer (boardDisplayer) {
			this.#boardDisplayer = boardDisplayer;
		}

		get boardDisplayer () {
			return this.#boardDisplayer;
		}

		update (mouseX, mouseY, click) {

			let xPercent = (mouseX - this.boardDisplayer.gridX) / this.boardDisplayer.gridWidth;
			let yPercent = (mouseY - this.boardDisplayer.gridY) / this.boardDisplayer.gridHeight;

			let xInd = clamp(Math.floor(xPercent * this.boardDisplayer.columns), 0, this.boardDisplayer.columns - 1);
			let yInd = clamp(Math.floor(yPercent * this.boardDisplayer.rows), 0, this.boardDisplayer.rows - 1);

			noStroke();
			fill(0, 50);
			rect(this.boardDisplayer.gridX + this.boardDisplayer.tileWidth * xInd, 0, this.boardDisplayer.tileWidth, 600);
			rect(0, this.boardDisplayer.gridY + this.boardDisplayer.tileHeight * yInd, 600, this.boardDisplayer.tileHeight);

			if (!click) return;

			this.gameHandler.playMove(xInd, yInd, "w");
		}
	}

	return MoveHandler;
})();

const scenes = (() => {

	const sceneAfterLoading = "play";
	
	let nextTransitionData = { transition: false };

	function resetTransitionData (data) {
		data.transition = false;
		data.to = null;
		data.getImage = null;
		data.image = null;
		data.speed = null;
		data.type = null;
	}
	
	// Let the buttons know if they need to be displayed during the transition
	let nextScene = null;

	let currentScene = "loading";

	const defaults = {
		transitionType: "slide",
		transitionSpeed: 1,
		transitionGetImage: get,

		colors: {
			transition: color(220),
			loading: {
				background: color(240),
				text: color(20),
			}
		}
	};

	const scenes = {

		// Use getters to only allow read only access
		get currentScene () {
			return currentScene;
		},

		get nextScene () {
			return nextScene;
		},

		get defaults () {
			return defaults;
		},

		setDefault (property, value) {
			const split = property.split(".");

			let current = defaults[split[0]];
			for (let i = 1; i < split.length - 1; i ++) current = current[split[i]];

			current[split[split.length - 1]] = value;
			return value;
		},

		run (deltaTime) {
			this[currentScene]({ deltaTime }); // run the current scene

			click = false;

			if (nextTransitionData.transition) {

				// Capture the image of the canvas at the end of the frame so that everythin is drawn
				if (nextTransitionData.getImage) nextTransitionData.image = nextTransitionData.getImage();

				this.runTransition({ deltaTime, transitionData: nextTransitionData });
			};
		},

		transition: (() => {
			return function (data) {
				const dataOut = nextTransitionData;
				
				if (data.to != null) dataOut.to = data.to;
				else throw "data.to is required";

				if (data.getImage != null) dataOut.getImage = data.getImage;
				else if (data.image != null) dataOut.image = data.image;
				else dataOut.getImage = scenes.defaults.transitionGetImage;

				dataOut.speed = data.speed ?? scenes.defaults.transitionSpeed;
				
				dataOut.type = data.type ?? scenes.defaults.transitionType;

				dataOut.color = data.color ?? scenes.defaults.colors.transition;

				dataOut.transition = true;
			}			
		})(),
	
		runTransition: (() => {

			let amt = 0;
			let data;

			const transitionFunctions = (() => {
				const anim1 = x => 4 *(x - 0.5) ** 3 + 0.5;

				return {
					slide (amt, color) {
						fill(color);
						noStroke();
						rect(-WIDTH + WIDTH * anim1(amt) * 2, 0, WIDTH, HEIGHT);
					},
				}
			})();

			const resetData = (() => {

				function copyData (data) {
					const result = {};

					for (const i in data) {

						// Copy everything except for getImage
						if (i === "getImage") continue;

						result[i] = data[i];
					}

					return result;
				}

				return function (_data) {

					// Reset data for the transition
					amt = 0;
					data = copyData(_data);
					nextScene = data.to;
					currentScene = "runTransition";

					// Validate data
					const validated = validateData(data);
					if (!validated.success) throw validated.errors.join(", ");

					// Don't try to transition twice
					resetTransitionData(nextTransitionData);
				}
			})();

			const validateData = (() => {

				return function (data) {

					const errors = [];

					if (typeof data.to !== "string") errors.push("invalid data.to");

					if (typeof data.image !== "object") errors.push("invalid data.image");

					if (typeof data.speed !== "number") errors.push("invalid data.speed");

					if (typeof data.type !== "string") errors.push("invalid data.type");

					if (!Object.keys(transitionFunctions).includes(data.type)) errors.push("invalid data.type");

					if (errors.length === 0) return { success: true };
					else return { errors };
				}
			})();

			const handleScene = (() => {
				return function (amt, data) {
					
					// Display image from last scene
					if (amt < 0.5) image(data.image, 0, 0, WIDTH, HEIGHT);

					// Run the next scene
					else if (amt < 1) scenes[data.to]();
					
					// Switch to next scene
					else currentScene = data.to;
				}
			})();

			const displayTransition = (() => {

				return function (amt, data) {

					push();

					for (const i in transitionFunctions) if (data.type === i) {
						transitionFunctions[i](amt, data.color);
						break;
					}

					pop();
				}
			})();

			function changeInAmt(dt, speed) {
				return dt/1000/speed;
			}
	
			return function (_data) {
	
				if (_data.transitionData) resetData(_data.transitionData);

				amt += changeInAmt(_data.deltaTime ?? 17, data?.speed ?? 1);

				handleScene(amt, data);
			
				displayTransition(amt, data);
			}
		})(),
	
		loading: (() => {
			
			// Convert image functions into image objects and return the progress of the loading
			const convertImages = (() => {
				
				let keys = Object.keys(images);
				let curInd = 0;
				let maxInd = keys.length;

				return function () {

					// Calculate the progress and return early if already done
					const progress = (curInd + 1)/maxInd;
					if (progress > 1) return progress;
					
					// replace the functions in the image objects with what they return
					const imageName = keys[curInd];
					if (images[imageName]) images[imageName] = images[imageName]();	

					curInd ++;

					return progress;
				}
			})();

			const displayLoadingProgress = (() => {

				function displayCircle (progress) {
					noFill();

					strokeWeight(15 * SCALE);
					stroke(scenes.defaults.colors.loading.text);

					let offset = PI/2 + progress * 0.9 * PI * 2;
					let circleProgress = 2 * PI * progress
					arc(WIDTH/2, HEIGHT/2.5, 200 * SCALE, 200 * SCALE, offset, circleProgress + offset);
				}

				function displayText (progress) {
					textAlign(CENTER, CENTER);
					textSize(100 * SCALE);
					textFont('Anton');

					fill(scenes.defaults.colors.loading.text);
					noStroke();

					text(`Loading: ${Math.round(progress * 100)}%`, WIDTH/2, HEIGHT/1.5);
				}

				return function (progress) {
					push();

					displayCircle(progress);
					displayText(progress);

					pop();
				}
			})();

			function handleTransition (progress) {
				if (progress >= 1) scenes.transition({ to: sceneAfterLoading });
			}
	
			return function () {

				push();
				
				background(scenes.defaults.colors.loading.background);

				const progress = Math.min(1, convertImages());
								
				displayLoadingProgress(progress);
				handleTransition(progress);

				pop();
			}
		})(),
	};

	scenes.setDefault("colors.transition", colors.darkBlack);
	scenes.setDefault("colors.loading.background", colors.black);
	scenes.setDefault("colors.loading.text", colors.white);

	return scenes;
})();

scenes.play = (() => {

	const rows = 19;
	const columns = rows;

	const gameHandler = new GameHandler({
		rows,
		columns,
	})

	const boardDisplayer = new BoardDisplayer({
		width: 600 * SCALE,
		height: 600 * SCALE,
	});

	const moveHandler = new MoveHandler();

	gameHandler.boardDisplayer = boardDisplayer;
	boardDisplayer.gameHandler = gameHandler;

	moveHandler.gameHandler = gameHandler;
	moveHandler.boardDisplayer = boardDisplayer;

	return function () {
		background(colors.white);

		boardDisplayer.display();
		moveHandler.update(mouseX, mouseY, click);
	}
})();

const drawFunction = (() => {

	// Delta time calculations
	let deltaTime = 17;
	let then = performance.now();

	function getDeltaTime () {
		const now = performance.now();
		const delataTime = now - then;
		then = now;

		// Limit delta time so that physics arent unpredictable when really laggy
		return Math.max(1000/30, delataTime);
	}

	// not using function x() {} notation because iife. iife is simply for organization here
	setup = function() {
	
		// this clears all animation frames preventing them from stacking up if the webpage is reloaded
		// sourced from stack overflow somewhere
		let id = window.requestAnimationFrame(function(){});
		while (id--) {
			window.cancelAnimationFrame(id);
		}
		
		createCanvas(WIDTH, HEIGHT);
	};
	
	draw = function() {
		deltaTime = getDeltaTime();
		scenes.run(deltaTime);
	};
})();

const userInput = (() => {
	// not using function x() {} notation because iife. iife is simply for organization here

	mousePressed = function() {
		click = true;
	}

	keyPressed = function() {
		keys[key] = keys[key.toString().toLowerCase()] = true;
	}
	
	keyReleased = function() {
		keys[key] = keys[key.toString().toLowerCase()] = false;
	}
})();

})();