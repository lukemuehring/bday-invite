/*
 * Preloading
 */
this.addEventListener("DOMContentLoaded", preloadImages, true);
var loadedImages = 0;
var imagePathArray = new Array(
  "./images/player/jump_0.png",
  "./images/player/stand1_0.png",
  "./images/player/stand1_1.png",
  "./images/player/stand1_2.png",
  "./images/player/walk1_0.png",
  "./images/player/walk1_1.png",
  "./images/player/walk1_2.png",
  "./images/player/walk1_3.png"
);

var imageCache = {};

function preloadImages(e) {
  for (var i = 0; i < imagePathArray.length; i++) {
    var tempImage = new Image();
    tempImage.addEventListener("load", trackProgress, true);
    tempImage.src = imagePathArray[i];
    imageCache[imagePathArray[i]] = tempImage;
  }
}

function trackProgress() {
  loadedImages++;
  if (loadedImages == imagePathArray.length) {
    window.requestAnimationFrame(loop);
  }
}

/*
 * Game Variables
 */
let canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");

c.canvas.width = window.innerWidth;
c.canvas.height = window.innerHeight;

const JumpHeight = 20;
const Gravity = 1.5;
const AnimationTimeBuffer = 30;

var FrameCount = 0;

/*
 *Background, Map, Floor
 */
var tileSheet = new Image();
tileSheet.src = "./images/tiles.png";

const Bg0 = {
  width: 1984,
  height: 1088,
  image: new Image(),
  locations: [],
  currentMaxLocationIndex: 0,
  moveRate: 0.3,
};

const Bg1 = {
  width: 1984,
  height: 1088,
  image: new Image(),
  locations: [],
  currentMaxLocationIndex: 0,
  moveRate: 1,
  color: "203 240 255",
};

const Map = {
  tsize: 64,
  cols: 888,
  rows: 2,
  tiles: [],
  getTile: function (col, row) {
    return this.tiles[row * Map.cols + col];
  },
};

if (c.canvas.height > Bg0.height) {
  Map.rows = Math.ceil((c.canvas.height - Floor.height) / Map.tsize);
}
Map.tiles = new Array(Map.cols * Map.rows);
Map.tiles.fill(0, 0, Map.cols);
Map.tiles.fill(1, Map.cols);
Map.length = Map.cols * Map.tsize;

const Floor = {
  height:
    c.canvas.height > Bg0.height
      ? Bg0.height - 1.5 * Map.tsize
      : c.canvas.height - 1.5 * Map.tsize,
  rightX: Map.length,
  leftX: -100,
};
var numBgImages = Math.ceil(Map.length / Bg0.width) + 1;
Bg0.locations = Array.from(
  { length: numBgImages },
  (_, index) => index * Bg0.width
);
Bg0.currentMaxLocationIndex = Bg0.locations.length - 1;
Bg0.image.src = "./images/bg_0.png";

Bg1.locations = Array.from(
  { length: numBgImages },
  (_, index) => index * Bg1.width
);
Bg1.currentMaxLocationIndex = Bg1.locations.length - 1;
Bg1.image.src = "./images/bg_1.png";

/*
 * Player
 */
const PlayerStates = {
  Idle: 0,
  Jumping: 1,
  Walking: 2,
};

const spawnX = c.canvas.width / 2;

const Player = {
  x: spawnX,
  screenX: spawnX,
  xVelocity: 0,
  y: 0,
  screenY: 0,
  yVelocity: 0,
  height: 160,
  width: 94,
  image: new Image(),
  state: PlayerStates.Jumping,
  idleSpriteFrame: 0,
  idleSpriteFrameIsIncreasing: true,
  walkSpriteFrame: 0,
  isGoingToTheRight: true,
};

/*
 * Camera
 */
function Camera(map, width, height) {
  this.x = 0;
  this.y = 0;
  this.width = width;
  this.height = height;
  this.minX = 0;
  this.maxX = width;
}

Camera.prototype.follow = function (player) {
  this.following = player;
};

Camera.prototype.update = function () {
  this.following.screenX = this.width / 2;
  if (
    this.following.x < this.width / 2 ||
    this.following.x > this.maxX - this.width / 2
  ) {
    this.following.screenX = this.following.x - this.x;
    this.following.screenY = this.following.y - this.y;
  }
};

const camera = new Camera(Map, c.canvas.width, c.canvas.height);
camera.follow(Player);

/*
 * Controller
 */
let userInputIsAllowed = true;

const Controller = {
  left: false,
  right: false,
  up: false,
  userInputRegistered: false,

  keyListener: function (event) {
    let keyState = event.type == "keydown";
    switch (event.keyCode) {
      case 37: // left arrow
        Controller.left = keyState;
        break;
      case 38: // up arrow
        Controller.up = keyState;
        break;
      case 39: // right arrow
        Controller.right = keyState;
        break;
    }
  },
};

/*
 * Mouse
 */
const Mouse = {
  x: 0,
  y: 0,
  prevX: 0,
  prevY: 0,
  dx: 0,
  dy: 0,
};

/*
 * Image Objects
 */
function imageObject(x, y, img) {
  this.x = x;
  this.y = y;
  this.image = img;
  this.draw = (context) => {
    context.drawImage(
      this.image,
      Math.floor(this.x - camera.x),
      Math.floor(this.y)
    );
  };
}

/*
 * Text
 */
const FontHeadingLevels = {
  H1: c.canvas.width <= 500 ? 80 : 100,
  H2: c.canvas.width <= 500 ? 33 : 48,
  P: c.canvas.width <= 500 ? 25 : 38,
};

function Text(words, x, y, fontSize) {
  this.words = words;
  this.x = x;
  this.y = y;
  this.fontSize = fontSize;
  this.isVisible = true;
  this.draw = drawText;
}

cutOffFloorEdgesInMap(c);

// const welcome = "HEY, I'M LUKE";
// const welcomeText = new Text(
//   welcome,
//   Math.floor(c.canvas.width / 2),
//   c.canvas.height <= 730 ? 200 : c.canvas.height / 2,
//   calculateFontFitForLargeText(welcome, FontHeadingLevels.H1)
// );

function calculateFontFitForLargeText(text, initialFontSize) {
  c.save();
  let currentFontSize = initialFontSize;
  c.font = getFont(currentFontSize);
  let currentWidth = c.measureText(text).width;
  while (currentWidth > c.canvas.width - 50) {
    currentFontSize -= 10;
    c.font = getFont(currentFontSize);
    currentWidth = c.measureText(text).width;
  }
  return currentFontSize;
}

// const arrowKeysImage = new Image();
// arrowKeysImage.src = "./images/keys.png";
// const arrowKeys = new imageObject(
//   welcomeText.x - 102,
//   welcomeText.y + 70,
//   arrowKeysImage
// );

// arrowKeys.isVisible = false;

// var welcomeTextArray = [welcomeText];

// Animation to mitigate FOUT and fade in
var canShowText = false;
const fontInterval = setInterval(() => {
  if (document.fonts.check("12px 'Segoe UI'")) {
    canShowText = true;
    animateText = true;
    clearInterval(fontInterval);
  }
}, 100);

const fontTimeout = setTimeout(() => {
  canShowText = true;
  animateText = true;
}, 1000);

var animateText = false;
var textAlpha = 0;

const objectHeight = Math.floor(c.canvas.height * 0.2);

let buttonClicked = false;

function clickMeButtonClicked() {
  if (!buttonClicked) {
    buttonClicked = true;
    Player.y = 0;

    button.disabled = true;

    setTimeout(() => {
      bdayInvite.style.display = "block";
      bdayInvite.offsetHeight;
      bdayInvite.classList.add("show");
    }, 500);
    button.classList.add("fade-away");

    spawnConfetti();
  } else {
    return;
  }
}

function Conf(x, y, color, size) {
  this.x = x;
  this.y = y;
  this.color = color;
  this.size = size;
}

const confetti = [];

function spawnConfetti() {
  const numberOfConfetti = 500; // Number of confetti pieces to spawn
  for (let i = 0; i < numberOfConfetti; i++) {
    // Random position for each confetti
    const x = Math.random() * c.canvas.width;
    const y = Math.random() * c.canvas.height;

    // Random color for each confetti
    const color = `hsl(${Math.random() * 360}, 100%, 50%)`;

    // Random size for each confetti
    const size = Math.random() * 10 + 5;

    const confettiPiece = new Conf(x, y, color, size);
    confetti.push(confettiPiece);
  }
}

function drawConf() {
  c.save();

  for (let i = 0; i < confetti.length; i++) {
    // Draw the confetti rectangle
    c.fillStyle = confetti[i].color;
    c.fillRect(
      confetti[i].x,
      confetti[i].y,
      confetti[i].size,
      confetti[i].size / 2
    );

    //update pos
    confetti[i].y++;
    if (confetti[i].y > c.canvas.height) {
      confetti[i].y = 0;
    }
  }
  c.restore();
}

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const message = urlParams.get("invite");
const messageDisplay = document.getElementById("message-display");
if (message) {
  messageDisplay.textContent = message; // Displays "Hello World"
}

/*
 * Animation Loop
 */
let lastTime = 0;
const targetFPS = 60;
const frameDuration = 1000 / targetFPS; // 16.67 per frame, of 60 frames per second

function loop(timestamp) {
  // calculate time elapsed since last frame
  const deltaTime = timestamp - lastTime;
  if (deltaTime >= frameDuration) {
    lastTime = timestamp - (deltaTime % frameDuration);

    /*
     * Responsive Scaling
     */
    if (
      window.innerWidth != c.canvas.width ||
      window.innerHeight != c.canvas.height
    ) {
      handleCanvasResize(c);
    }

    /*
     * Controller Input
     */
    if (Player.y > Floor.height && userInputIsAllowed) {
      userInputIsAllowed = false;
      setTimeout(() => {
        Player.x = spawnX;
        Player.y = 0;
        Player.xVelocity = 0;
        Player.yVelocity = 0;
        userInputIsAllowed = true;
      }, 1000);
    }

    if (
      (Controller.up || Controller.left || Controller.right) &&
      userInputIsAllowed
    ) {
      Controller.userInputRegistered = true;
      if (Controller.up && Player.state != PlayerStates.Jumping) {
        Player.yVelocity -= JumpHeight;
      }
      if (Controller.left) {
        Player.xVelocity -= 0.5;
      }

      if (Controller.right) {
        Player.xVelocity += 0.5;
      }
    }

    /*
     * Gravity and Friction
     */
    Player.yVelocity += Gravity;
    Player.x += Player.xVelocity;
    Player.y += Player.yVelocity;

    Player.xVelocity *= 0.9;

    // If the xVelocity is close enough to 0, we set it to 0 for animation purposes.
    if (Player.xVelocity <= 0.2 && Player.xVelocity >= -0.2) {
      Player.xVelocity = 0;
    }
    Player.yVelocity += 0.9;

    /*
     * Floor Collision
     */
    if (
      Player.y > Floor.height &&
      Player.x < Floor.rightX &&
      Player.x > Floor.leftX
    ) {
      Player.y = Floor.height;
      Player.yVelocity = 0;
    }

    // Constraining Player to x range [0, Camera Width]
    Player.x = Math.max(0, Math.min(Player.x, camera.width));
    camera.update();

    /*
     * Background Draw
     */
    c.save();
    c.fillStyle = "rgb(" + Bg1.color + ")";
    c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    c.restore();

    drawBackground(c, Bg0);
    drawBackground(c, Bg1);
    /*
     * Text Alpha
     */
    c.save();
    if (animateText) {
      c.globalAlpha = 100 * textAlpha ** 3;
      textAlpha += 0.01;
      if (c.globalAlpha >= 1) {
        animateText = false;
      }
    }

    /*
     * Text Draw
     */

    c.restore();

    if (buttonClicked) {
      drawConf();
    }

    /*
     * Player Draw
     */
    if (buttonClicked) {
      drawPlayer(c);
    }

    /*
     * Floor Draw
     */
    var startCol = Math.floor(camera.x / Map.tsize);
    var endCol = startCol + camera.width / Map.tsize + 2;
    var offsetX = -camera.x + startCol * Map.tsize;

    for (let column = startCol; column < endCol; column++) {
      for (let row = 0; row < Map.rows; row++) {
        const tile = Map.getTile(column, row);
        const x = (column - startCol) * Map.tsize + offsetX;
        const y = row * Map.tsize;

        c.drawImage(
          tileSheet, // image
          tile * Map.tsize, // source x
          0, // source y
          Map.tsize, // source width
          Map.tsize, // source height
          Math.floor(x), // target x
          y + Floor.height, // target y
          Map.tsize, // target width
          Map.tsize // target height
        );
      }
    }

    // Mouse Draw
    // if (
    //   Mouse.x > Player.screenX - Player.width / 2 &&
    //   Mouse.x < Player.screenX + Player.width / 2
    // ) {
    // if (Mouse.y > Player.screenY - Player.height && Mouse.y < Player.screenY) {
    //   scrambleDrawPixelsAtMouse(c);
    // }
    // }

    FrameCount++;
    if (FrameCount >= Number.MAX_SAFE_INTEGER) {
      FrameCount = 0;
    }
  }

  /*
   * Animation
   */
  window.requestAnimationFrame(loop);
}

// ---------------------------------------------------------END ANIMATION LOOP----------------------------------------

/*
 * Scrambles the pixels around the mouse as a visual effect
 * https://developer.mozilla.org/en-US/docs/Web/API/ImageData
 * imageData gives back a one-dimensional array containing the data in the RGBA order,
 * which is why we skip by 4 in the for loop.
 */
function scrambleDrawPixelsAtMouse(context) {
  let c = context;
  c.save();

  let mouseSquareLength = 32;
  let imageData = c.getImageData(
    Mouse.x - mouseSquareLength / 2,
    Mouse.y - mouseSquareLength / 2,
    mouseSquareLength,
    mouseSquareLength
  ).data;
  for (let i = 0; i < imageData.length; i += 4) {
    c.fillStyle = `rgb(
      ${imageData[i]}
      ${imageData[i + 1]}
      ${imageData[i + 2]})`;

    let pixelIndex = i / 4;
    let rowToFlip, colToFlip;
    rowToFlip = colToFlip = 0;
    rowToFlip += Math.floor(pixelIndex / mouseSquareLength);
    colToFlip += pixelIndex % mouseSquareLength;

    c.fillRect(
      Mouse.x + 0.5 * Mouse.dx - mouseSquareLength / 2 + colToFlip,
      Mouse.y + 0.5 * Mouse.dy - mouseSquareLength / 2 + rowToFlip,
      1,
      1
    );
  }

  c.restore();
}

function handleCanvasResize(context) {
  context.canvas.width = window.innerWidth;
  context.canvas.height = window.innerHeight;

  camera.width = window.innerWidth;
  camera.height = window.innerHeight;

  console.log(`new camera dimensions: ${camera.width}, ${camera.height}`);

  resizeMap(context);

  FontHeadingLevels.H1.value = context.canvas.width <= 500 ? 80 : 100;
  FontHeadingLevels.H2.value = context.canvas.width <= 500 ? 33 : 38;
  FontHeadingLevels.P.value = context.canvas.width <= 500 ? 25 : 30;
}

function resizeMap(context) {
  if (context.canvas.height >= Floor.height + Map.tsize * 1.5) {
    Map.rows = Math.ceil((context.canvas.height - Floor.height) / Map.tsize);
  } else {
    Map.rows = 2;
  }

  Map.tiles = new Array(Map.cols * Map.rows);
  Map.tiles.fill(0, 0, Map.cols);
  Map.tiles.fill(1, Map.cols);

  Map.length = Map.cols * Map.tsize;

  cutOffFloorEdgesInMap(context);
}

function cutOffFloorEdgesInMap(context) {
  let row = 0;
  // let rightEndX = textBubbleArray[codingStory.length - 1].maxX;
  let rightEndX = window.width;
  for (
    let j = Math.floor(rightEndX / Map.tsize);
    j < Map.tiles.length;
    j += Map.cols
  ) {
    row++;
    Map.tiles.fill(2, j, Map.cols * row);
  }
}

function drawPlayer(context) {
  if (Player.y < Floor.height) {
    Player.state = PlayerStates.Jumping;
  } else if (
    (Player.xVelocity <= -1 || Player.xVelocity) >= 1 &&
    Player.y != PlayerStates.Jumping
  ) {
    Player.state = PlayerStates.Walking;
    Player.isGoingToTheRight = Player.xVelocity > 0;
  } else {
    Player.state = PlayerStates.Idle;
  }

  switch (Player.state) {
    case PlayerStates.Jumping:
      Player.image = imageCache["./images/player/jump_0.png"];
      break;
    case PlayerStates.Walking:
      if (FrameCount % (AnimationTimeBuffer / 5) == 0) {
        Player.walkSpriteFrame = (Player.walkSpriteFrame + 1) % 4;
      }
      Player.image =
        imageCache["./images/player/walk1_" + Player.walkSpriteFrame + ".png"];
      break;
    case PlayerStates.Idle:
      if (FrameCount % AnimationTimeBuffer == 0 && Player.xVelocity == 0) {
        if (Player.idleSpriteFrame == 2) {
          idle_sprite_frame_is_increasing = false;
        } else if (Player.idleSpriteFrame == 0) {
          idle_sprite_frame_is_increasing = true;
        }

        if (idle_sprite_frame_is_increasing) {
          Player.idleSpriteFrame = Player.idleSpriteFrame + 1;
        } else {
          Player.idleSpriteFrame = Player.idleSpriteFrame - 1;
        }
        Player.image =
          imageCache[
            "./images/player/stand1_" + Player.idleSpriteFrame + ".png"
          ];
      }
      break;
  }

  if (Player.isGoingToTheRight) {
    drawFlippedImage(
      c,
      Player.image,
      Player.screenX - Player.width / 2,
      Player.y - Player.image.naturalHeight
    );
  } else {
    c.drawImage(
      Player.image,
      Player.screenX - Player.width / 2,
      Player.y - Player.image.naturalHeight
    );
  }
}

function drawBackground(context, background) {
  for (let i = 0; i < background.locations.length; i++) {
    if (background.locations[i] + background.width < 0) {
      background.locations[i] =
        background.locations[background.currentMaxLocationIndex] +
        background.width;
      background.currentMaxLocationIndex = i;
    }

    background.locations[i] -= background.moveRate;

    context.drawImage(background.image, background.locations[i], 0);
  }
}

function drawText(context, text) {
  if (!canShowText) {
    return;
  }

  context.font = getFont(text.fontSize);
  context.fillText(
    text.words,
    text.x - camera.x - context.measureText(text.words).width / 2,
    text.y
  );
}

function drawFlippedImage(context, image, x, y) {
  context.save();
  context.translate(x + image.width / 2, 0);
  context.scale(-1, 1);
  context.translate(-(x + image.width / 2), 0);
  context.drawImage(image, x, y);
  context.restore();
}

function getFont(fontSize) {
  if (document.fonts.check("12px 'Segoe UI'")) {
    return fontSize + "px 'Segoe UI'";
  } else {
    return fontSize - 8 + "px sans-serif";
  }
}

function scrollPlayer(event) {
  Controller.userInputRegistered = true;
  event.preventDefault();
  if (userInputIsAllowed) {
    Player.xVelocity += event.deltaY * 0.1;
  }
}

function updateMousePosition(event) {
  if (Mouse.x != event.clientX) {
    Mouse.prevX = Mouse.x;
    Mouse.x = event.clientX;
    Mouse.dx = Mouse.x - Mouse.prevX;
  }
  if (Mouse.y != event.clientY) {
    Mouse.prevY = Mouse.y;
    Mouse.y = event.clientY;
    Mouse.dy = Mouse.y - Mouse.prevY;
  }
}

// todo fix
function movePlayerToScreenCoords(x, y) {
  console.log("moving to" + "(" + x + "," + y + ")");

  (Player.screenX = x), (Player.screenY = y);
}

const ongoingTouches = [];

function copyTouch({ identifier, clientX, clientY }) {
  return { identifier, clientX, clientY };
}

function ongoingTouchIndexById(idToFind) {
  for (let i = 0; i < ongoingTouches.length; i++) {
    const id = ongoingTouches[i].identifier;

    if (id === idToFind) {
      return i;
    }
  }
  return -1; // not found
}

function handleTouchStart(evt) {
  Controller.userInputRegistered = true;

  const touches = evt.changedTouches;
  Mouse.x = touches[0].clientX;
  Mouse.y = touches[0].clientY;

  for (let i = 0; i < touches.length; i++) {
    ongoingTouches.push(copyTouch(touches[i]));
  }
}

function handleTouchMove(evt) {
  evt.preventDefault();
  const touches = evt.changedTouches;

  for (let i = 0; i < touches.length; i++) {
    const idx = ongoingTouchIndexById(touches[i].identifier);

    if (idx >= 0) {
      if (userInputIsAllowed) {
        Player.xVelocity +=
          0.3 * (ongoingTouches[idx].clientX - touches[i].clientX);
      }
      ongoingTouches.splice(idx, 1, copyTouch(touches[i])); // swap in the new touch record
    } else {
      console.error("can't figure out which touch to continue");
    }
  }
}

function handleTouchEnd(evt) {
  const touches = evt.changedTouches;

  for (let i = 0; i < touches.length; i++) {
    let idx = ongoingTouchIndexById(touches[i].identifier);

    if (idx >= 0) {
      ongoingTouches.splice(idx, 1); // remove it; we're done
    } else {
      console.error("can't figure out which touch to end");
    }
  }
}

function handleTouchCancel(evt) {
  evt.preventDefault();
  const touches = evt.changedTouches;

  for (let i = 0; i < touches.length; i++) {
    let idx = ongoingTouchIndexById(touches[i].identifier);
    ongoingTouches.splice(idx, 1); // remove it; we're done
  }
}

// Event Listeners
window.addEventListener("keydown", Controller.keyListener);
window.addEventListener("keyup", Controller.keyListener);

window.addEventListener("wheel", scrollPlayer, { passive: false });

window.addEventListener("mousemove", updateMousePosition);

window.addEventListener("touchstart", handleTouchStart);
window.addEventListener("touchend", handleTouchEnd);
window.addEventListener("touchcancel", handleTouchCancel);
window.addEventListener("touchmove", handleTouchMove);

const button = document.querySelector(".click-me");
const bdayInvite = document.querySelector(".bday-invite");
// Add an event listener to the button
button.addEventListener("click", clickMeButtonClicked);

/* CREDITS
 * Free - Adventure Pack - Grassland by Anokolisa
 *
 */

/*  TODO
 * improve the graphics for the story
 * replace text bubble with actual html
 * add links for resume, github, and linked in (near the front)
 */
