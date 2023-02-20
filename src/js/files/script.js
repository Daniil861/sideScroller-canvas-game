window.addEventListener('load', () => {
	const canvas = document.getElementById('canvas1');
	const ctx = canvas.getContext('2d');

	canvas.width = 1300;
	canvas.height = 720;

	let enemies = [];
	let score = 0;
	let gameOver = false;

	const fullscreenButton = document.getElementById('fullScreenButton');


	// в данном классе слушем событие нажатия клавиатуры
	// если нажимаем вверх/вниз/влево/вправо - добавляем название клавишы в массив
	// когда отпускаем эту клавишу - удаляем это название из массива
	// таким образом мы получаем массив с текущими нажатыми кнопками, т.е. - то что нажато в текущий момент
	class InputHandler {
		constructor() {
			this.keys = [];
			this.touchY = 0;

			// Параметр, по которому будем вычислять допустимую длину свайпа, после которого будем что-то делать
			this.touchTreshold = 30;
			window.addEventListener('keydown', (e) => {
				if ((e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !this.keys.includes(e.key)) {
					this.keys.push(e.key);
				} else if (e.key === 'Enter' && gameOver) restartGame();
			})
			window.addEventListener('keyup', (e) => {
				if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
					this.keys.splice(this.keys.indexOf(e.key), 1);
				}
			})
			window.addEventListener('touchstart', (e) => {
				this.touchY = e.changedTouches[0].pageY;
			})
			window.addEventListener('touchmove', (e) => {
				const swipeDistance = e.changedTouches[0].pageY - this.touchY;

				// Если мы проскролили больше 30px - регистрируем событие свайпа вверх
				if (swipeDistance < -this.touchTreshold && !this.keys.includes('swipe up')) this.keys.push('swipe up');
				else if (swipeDistance > this.touchTreshold && !this.keys.includes('swipe down')) {
					this.keys.push('swipe down');
					if (gameOver) restartGame();
				}
			})
			window.addEventListener('touchend', (e) => {
				this.keys.splice(this.keys.indexOf('swipe up'), 1);
				this.keys.splice(this.keys.indexOf('swipe down'), 1);
			})
		}
	}

	class Player {
		constructor(gameWidth, gameHeight) {
			this.gameWidth = gameWidth;
			this.gameHeight = gameHeight;
			this.width = 200;
			this.height = 200;
			this.x = 100;
			this.y = this.gameHeight - this.height;

			this.frameX = 0;
			this.frameY = 0;
			this.maxFrame = 8;

			this.speed = 0;

			this.vy = 0;
			this.weight = 1;

			this.fps = 20;
			this.frameTimer = 0;
			this.frameInterval = 1000 / this.fps;

			this.image = document.getElementById('playerImage');
		}

		restart() {
			this.x = 100;
			this.y = this.gameHeight - this.height;
			this.frameY = 0;
			this.maxFrame = 8;
		}

		draw(context) {
			context.drawImage(this.image, this.frameX * this.width, this.frameY * this.height, this.width, this.height, this.x, this.y, this.width, this.height);
		}
		update(input, deltaTime, enemies) {
			// collision detection
			enemies.forEach(enemy => {
				const dx = (enemy.x + enemy.width / 2 - 20) - (this.x + this.width / 2);
				const dy = (enemy.y + enemy.height / 2) - (this.y + this.height / 2 + 20);
				const distance = Math.sqrt(dx * dx + dy * dy);
				// const distance2 = Math.hypot(dy, dx); // можно таким способом, вычисление то же - ищем гипотенузу

				if (distance < enemy.width / 3 + this.width / 3) {
					gameOver = true;
				}
			})

			// sprite animation
			if (this.frameTimer > this.frameInterval) {
				if (this.frameX >= this.maxFrame) this.frameX = 0;
				else this.frameX++;
				this.frameTimer = 0;
			} else {
				this.frameTimer += deltaTime;
			}


			// controls
			if (input.keys.includes("ArrowRight")) this.speed = 5;
			else if (input.keys.includes("ArrowLeft")) this.speed = -5;
			else if ((input.keys.includes("ArrowUp") || input.keys.includes("swipe up")) && this.onGround()) this.vy -= 30;
			else this.speed = 0;

			// Горизонтальное движение
			this.x += this.speed;

			if (this.x < 0) this.x = 0;
			if (this.x > this.gameWidth - this.width) this.x = this.gameWidth - this.width;

			// Вертикальное движение
			// Мы постоянно прибавляем коэффициент прыжка. По умолчанию он равен 0, но если нажимаем кнопку вверх - тогда равен -30.
			this.y += this.vy;

			// Проверяем, находится ли на земле игрок
			if (!this.onGround()) {
				// Если не находится - замедляем прыжок, путем уменьшения коэффициента прыжка (30) и меняем картинку на прыгующего героя
				this.vy += this.weight;
				this.maxFrame = 5;
				this.frameY = 1;
			} else {
				// Когда призмелился на землю - коэффициент прыжка делаем равным 0, чтобы игрок не двигался по вертикали и меняем обратно картинку
				this.vy = 0;
				this.maxFrame = 8;
				this.frameY = 0;
			}

			// Когда игрок приземлился после прыжка - выравниваем его положение по оси Y
			if (this.y > this.gameHeight - this.height) this.y = this.gameHeight - this.height;
		}

		// проверка, находится ли игрок на земле
		onGround() {
			return this.y >= this.gameHeight - this.height;
		}
	}

	class Background {
		constructor(gameWidth, gameHeight) {
			this.gameWidth = gameWidth;
			this.gameHeight = gameHeight;
			this.width = 2400;
			this.height = 700;
			this.x = 0;
			this.y = 0;

			this.speed = 10;

			this.image = document.getElementById('backgroundImage');
		}

		restart() {
			this.x = 0;
		}
		draw(context) {

			// Таким образом реализовывается движение фона - две последовательно идущие картинки
			context.drawImage(this.image, this.x, this.y, this.width, this.height);
			context.drawImage(this.image, this.x + this.width - this.speed, this.y, this.width, this.height);
		}
		update() {
			this.x -= this.speed;
			// Когда первая картинка полностью прошла, возвращаем все на нулевые позиции. 
			if (this.x < 0 - this.width) this.x = 0;
		}
	}

	class Enemy {
		constructor(gameWidth, gameHeight) {
			this.gameWidth = gameWidth;
			this.gameHeight = gameHeight;
			this.width = 160;
			this.height = 119;
			this.x = this.gameWidth;
			this.y = this.gameHeight - this.height;

			this.frameX = 0;
			this.maxFrame = 5;
			this.fps = 20;
			this.frameTimer = 0;
			this.frameInterval = 1000 / this.fps;
			this.speed = 8;

			this.markedForDelition = false;

			this.image = document.getElementById('enemyImage');
		}
		draw(context) {
			context.drawImage(this.image, this.frameX * this.width, 0 * this.height, this.width, this.height, this.x, this.y, this.width, this.height, this.width, this.height);
		}

		update(deltaTime) {
			if (this.frameTimer > this.frameInterval) {
				if (this.frameX >= this.maxFrame) this.frameX = 0;
				else this.frameX++;
				this.frameTimer = 0;
			} else {
				this.frameTimer += deltaTime;
			}

			this.x -= this.speed;
			if (this.x < 0 - this.width) {
				this.markedForDelition = true;
				score++;
			}
		}
	}



	function handleEnemies(deltaTime) {
		if (enemyTimer > enemyInterval + randomEnemyInterval) {
			enemies.push(new Enemy(canvas.width, canvas.height));
			enemyTimer = 0;
		} else {
			enemyTimer += deltaTime;
		}

		enemies.forEach(enemy => {
			enemy.draw(ctx);
			enemy.update(deltaTime);
		})
		enemies = enemies.filter(enemy => !enemy.markedForDelition);
	}

	function displayStatusText(context) {
		context.textAlign = 'left';
		context.fillStyle = '#000';
		context.font = '40px Helvetica';
		context.fillText(`Score: ${score}`, 20, 50);

		context.fillStyle = '#fff';
		context.fillText(`Score: ${score}`, 22, 52);

		if (gameOver) {
			context.textAlign = 'center';
			context.fillStyle = '#000';
			context.fillText('GAME OVER, press enter or swipe down to restart!', canvas.width / 2, 200);
			context.fillStyle = '#fff';
			context.fillText('GAME OVER, press enter or swipe down to restart!', canvas.width / 2 + 2, 202);
		}
	}

	const input = new InputHandler();
	const player = new Player(canvas.width, canvas.height);
	const background = new Background(canvas.width, canvas.height);

	function restartGame() {
		player.restart();
		background.restart();

		enemies = [];
		score = 0;
		gameOver = false;

		// После сброса всех параметров - заново нужно запустить перерисовку канваса
		animate(0);
	}

	function toggleFullScreen() {
		if (!document.fullscreenElement) {
			canvas.requestFullscreen().catch(err => {
				alert(`Error, can't enable full-screen mode: ${err.message}`);
			});
		} else {
			document.exitFullscreen();
		}
	}

	fullscreenButton.addEventListener('click', toggleFullScreen);

	let lastTime = 0;
	let enemyTimer = 0;
	let enemyInterval = 1000;
	let randomEnemyInterval = Math.random() * 1000 + 500;

	function animate(timeStamp) {
		const deltaTime = timeStamp - lastTime;
		lastTime = timeStamp;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		background.draw(ctx);
		background.update();

		player.draw(ctx);
		player.update(input, deltaTime, enemies);

		handleEnemies(deltaTime);
		displayStatusText(ctx);

		if (!gameOver) window.requestAnimationFrame(animate);
	}
	animate(0);
})
