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
  "./images/player/walk1_3.png",
  "./images/grass1.png"
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

const Floor = {
  height:
    c.canvas.height > Bg0.height
      ? Bg0.height - 1.5 * Map.tsize
      : c.canvas.height - 1.5 * Map.tsize,
  rightX: 0,
  leftX: -100,
};

if (c.canvas.height > Bg0.height) {
  Map.rows = Math.ceil((c.canvas.height - Floor.height) / Map.tsize);
}

Map.tiles = new Array(Map.cols * Map.rows);
Map.tiles.fill(0, 0, Map.cols);
Map.tiles.fill(1, Map.cols);

Map.length = Map.cols * Map.tsize;

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

const spawnX = 100;

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
  this.maxX = map.cols * map.tsize - width;
}

Camera.prototype.follow = function (player) {
  this.following = player;
};

Camera.prototype.update = function () {
  this.following.screenX = this.width / 2;
  this.x = this.following.x - this.width / 2;

  this.x = Math.max(this.minX, Math.min(this.x, this.maxX));

  if (
    this.following.x < this.width / 2 ||
    this.following.x > this.maxX + this.width / 2
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
 * Foreground and Background Objects
 */
var backgroundObjects = [];
var foregroundObjects = [];

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

const colors1 = ["#000000", "#98A4CA", "#A9ACCB", "#C9D7F2", "#ECEFF8"];
const colors2 = ["#000000", "#AFB5CF", "#CCD5E7", "#ECEFF8"];
const TextLeading = 10;
const ElementPadding = 10;

function TextBubble(text, x, y, minX, maxX) {
  this.text = text;
  this.x = x;
  this.y = y;
  (this.minX = minX), (this.maxX = maxX), (this.fontSize = FontHeadingLevels.P);
  this.maxLineWidth = Math.floor(c.canvas.width / 1.5);
  this.leading = TextLeading;
  this.elementPadding = ElementPadding;

  this.borderColorsTopBottom = colors1;
  this.borderColorsLeftRight = colors2;

  this.draw = drawTextBubble;
  this.drawWhiteBoxWithTextAndImage = drawWhiteBoxWithText;
}

const cornerImage = new Image();
const triangleImage = new Image();

cornerImage.src = "./images/DialogCorners.png";
triangleImage.src = "./images/DialogTriangle.png";

TextBubble.prototype.cornerImage = cornerImage;
TextBubble.prototype.triangleImage = triangleImage;

const codingStory = [
  "Welcome to my website! I'm a software engineer and climber based in Salt Lake City.",
  "If I am talking too slowly, feel free to use the scroll wheel.",
  "Here's what I've been working on recently.",
  "Let me tell you a little bit about myself:",
  "I'm a full-stack software engineer with 5+ years of experience. I've built SPAs with React and Angular, and APIs with C#.",
  "I was born and raised in Atlanta, Georgia. There, I graduated from Georgia Tech with a B.S. in Computational Media (and also Chinese).",
  "After graduating, I worked at Microsoft for two years as a software engineer in the M365 organization.",
  "I made the US Team for competitive rock climbing, so I quit my job and moved to Utah to give my professional athlete career a shot.",
  "Even though that didn't pan out the way I expected, I decided to stay for the mountains. Now, I'm building full stack applications for Utah's largest physician group, Revere Health.",
  "Outside of work, I like to pursue my interests in climbing and creative coding. I'm currently psyched on creative coding for the web and learning Swift to make VisionOS apps (I'm starting my Apple fanboy arc).",
  "If you have an idea to create something cool or just want to chat, I’d love to get to know you better, so feel free to reach me at muehring.luke@gmail.com",
  "Thanks for getting to know me a little.",
];

const textBubbleArray = [];
let startX = c.canvas.width - Math.floor(c.canvas.width * 0.4);
let endX;
const ReadingSpeedPixelsPerCharacter = 7;
const grassMarkerImage = new Image();
grassMarkerImage.src = "./images/grass1.png";

for (let i = 0; i < 2; i++) {
  endX = startX + codingStory[i].length * ReadingSpeedPixelsPerCharacter;
  textBubbleArray.push(
    new TextBubble(codingStory[i], Player.x, Player.y, startX, endX)
  );
  foregroundObjects.push(
    new imageObject(startX, Floor.height - 55, grassMarkerImage)
  );
  startX = endX;
}

/*
 * Project Demos
 */
class ProjectDemo {
  static demoModalOpen = false;
  constructor(x, y, images, headerText, text, link) {
    const ProjectDemoMaxLineWidth = Math.min(1000, c.canvas.width - 50);

    this.x = x;
    this.y = y;
    this.images = images;
    this.headerText = headerText;
    this.text = text;
    this.fontSize = calculateFontFitForLargeText(
      this.headerText,
      FontHeadingLevels.H1
    );
    this.link = link;

    this.maxLineWidth = ProjectDemoMaxLineWidth;
    this.leading = TextLeading;
    this.elementPadding = ElementPadding;

    this.borderColorsTopBottom = colors1;
    this.borderColorsLeftRight = colors2;

    let { whiteBoxWidth, whiteBoxHeight, lines } =
      this.calculateHeaderDimensions();
    this.whiteBoxWidth = whiteBoxWidth;
    this.whiteBoxHeight = whiteBoxHeight;
    this.lines = lines;

    this.width = whiteBoxWidth + this.borderColorsTopBottom.length * 2;
    this.height = whiteBoxHeight + this.borderColorsLeftRight.length * 2;

    this.draw = this.drawProjectDemo;
    this.drawWhiteBoxWithTextAndImage = drawWhiteBoxWithText;
    this.detectMouseHover = detectMouseHover;
    this.modalOpen = false;
  }

  calculateHeaderDimensions() {
    let lineDataObject = getLinesOfText(
      c,
      this.headerText,
      this.fontSize,
      this.leading,
      this.maxLineWidth
    );

    let whiteBoxWidth = lineDataObject.whiteBoxWidth + this.elementPadding * 2;

    let whiteBoxHeight =
      lineDataObject.whiteBoxHeight + this.elementPadding * 2;

    return {
      whiteBoxWidth: Math.floor(whiteBoxWidth),
      whiteBoxHeight: Math.floor(whiteBoxHeight),
      lines: lineDataObject.linesOfTextArray,
    };
  }

  drawProjectDemo(context) {
    if (!canShowText) {
      return;
    }

    const { width: demoWidth, height: demoHeight } =
      this.drawWhiteBoxWithTextAndImage(
        context,
        this.x - camera.x,
        this.y,
        this.whiteBoxHeight,
        this.whiteBoxWidth,
        this.lines,
        this.fontSize,
        this.leading,
        this.borderColorsLeftRight,
        this.borderColorsTopBottom,
        this.elementPadding
      );

    this.width = demoWidth;
    this.height = demoHeight;
  }
}

let imageURLS = [
  "./images/rr_images/rr1.webp",
  "./images/rr_images/rr2.webp",
  "./images/rr_images/rr3.webp",
  "./images/rr_images/rr4.webp",
  "./images/rr_images/rr5.webp",
  "./images/rr_images/rr6.webp",
];

let images = new Array(imageURLS.length);
for (let i = 0; i < images.length; i++) {
  images[i] = new Image();
  images[i].src = imageURLS[i];
}

let websiteDemo = new ProjectDemo(
  textBubbleArray[1].maxX,
  Math.floor(Floor.height / 2) - 100,
  images,
  "restandrelaxvacation.com",
  "a rental website for Rest & Relax Vacation in Gulf Shores, AL.\nBuilt with React 18 and Tailwind CSS.",
  "https://restandrelaxvacation.com"
);

websiteDemo.x += Math.floor(websiteDemo.width / 2);
let projectSpacing = 300;


var demos = new Array();
demos.push(websiteDemo);

// "Here are some of my projects"
endX =
  demos[demos.length - 1].x + Math.floor(demos[demos.length - 1].width / 2);
textBubbleArray.push(
  new TextBubble(codingStory[2], Player.x, Player.y, startX, endX)
);
foregroundObjects.push(
  new imageObject(startX, Floor.height - 55, grassMarkerImage)
);
startX = endX;

for (let i = 3; i < codingStory.length; i++) {
  if (i == codingStory.length - 1) {
    endX = startX + 500 - ((startX + 500) % Map.tsize);
    Floor.rightX = startX + 500 - ((startX + 500) % Map.tsize);
  } else {
    endX = startX + codingStory[i].length * ReadingSpeedPixelsPerCharacter;
  }
  textBubbleArray.push(
    new TextBubble(codingStory[i], Player.x, Player.y, startX, endX)
  );
  foregroundObjects.push(
    new imageObject(startX, Floor.height - 55, grassMarkerImage)
  );
  startX = endX;
}

// const climbingStory = [
//   "I've been climbing for 11 years now, and I love it more and more.",
//   "In the past decade, I've scrambled my way up boulders, routes, cracks, compeititon rounds, deep water solos, and even the 15 meter speed wall.",
//   "My climbing achievements always teach me how to think outside of the box, push myself to accomplish the epic, and find balance in life.",
//   "When I'm on the wall, and not freaking out about the height, my mind can find a focus where I don't think about anything else.",
//   "I started climbing in my first year of high school. Instead of doing intramural sports with classmates or going to football games after school, I would go to the climbing gym.",
//   'I didn\'t fit the mold of a "normal" high schooler. No one really did at the climbing gym, which made it so interesting to meet people.',
//   "After switching out my punch pass for a membership at the climbing gym, I joined a youth team and started training with them.",
//   "It was a fine balance to chase grades both in the climbing gym and in school. My time had to be handled more carefully, and I sacrificed other activities competing for my time. Including the Call of Duty.",
//   "I had an implicit agreement with my parents: they would keep sending me to the gym as long as I kept up my grades at school.",
//   "Little did I know back then that this was setting the framework of how I would find balance with climbing and the rest of my life while in college, and in developing my professional career.",
//   "In 2020, I made my first open Nationals final, which takes the top 8 athletes in the US.",
//   "Over a hundred competitors get filtered through the qualifier and semifinal rounds to make it to the final. It was a challenging competition requiring mastery in three climbing disciplines: speed, lead and bouldering. The winner would go on to take a ticket that sent them to the 2020 Olympics.",
//   "Although I didn't win that ticket, I felt like I broke through the barrier of making the final round in my climbing. I was also pushing through a challenging junior year in college, balancing a heavy course load with my responsibilities as an RA.",
//   "It's funny how my best competition result so far is when I was working full-time as a software engineer at Microsoft. At the 2022 US Open Nationals, I got 3rd in bouldering and 4th in lead 😁.",
//   "It seems like the formula for success in my climbing and my career requires balance. So I'm trying to continue my Hannah Montana lifestyle to this day.",
//   "But when I'm not training for competitions or grinding LeetCode, I love getting some fresh air outside and climbing on real rocks. Especially sandstone.",
//   "Thanks for getting to know me a little.",
// ];

cutOffFloorEdgesInMap(c);

const welcome = "HEY, I'M LUKE";
const welcomeText = new Text(
  welcome,
  Math.floor(c.canvas.width / 2),
  c.canvas.height <= 730 ? 200 : c.canvas.height / 2,
  calculateFontFitForLargeText(welcome, FontHeadingLevels.H1)
);

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
const arrowKeysImage = new Image();
arrowKeysImage.src = "./images/keys.png";
const arrowKeys = new imageObject(
  welcomeText.x - 102,
  welcomeText.y + 70,
  arrowKeysImage
);

arrowKeys.isVisible = false;

const UserGuidance = setInterval(() => {
  if (!Controller.userInputRegistered) {
    arrowKeys.isVisible = !arrowKeys.isVisible;
  } else {
    arrowKeys.isVisible = false;
    clearInterval(UserGuidance);
  }
}, 1500);

arrowKeys.draw = () => {
  if (arrowKeys.isVisible && !Controller.userInputRegistered) {
    c.drawImage(
      arrowKeys.image,
      arrowKeys.x - camera.x,
      arrowKeys.y - camera.y
    );
  }
};

var welcomeTextArray = [welcomeText];

// Animation to mitigate FOUT and fade in
var canShowText = false;
const fontInterval = setInterval(() => {
  if (document.fonts.check("12px 'VT323'")) {
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

const CircleRadius = 100;
const CircleCenter = {
  x: (textBubbleArray[6].minX + textBubbleArray[6].maxX) / 2,
  y: objectHeight,
};
let rect1 = {
  x: CircleCenter.x + Math.cos(0),
  y: CircleCenter.y + Math.sin(0),
  angle: 0,
  color: "243 83 37",
};
let rect2 = {
  x: CircleCenter.x + Math.cos(0),
  y: CircleCenter.y + Math.sin(1),
  angle: Math.PI / 2,
  color: "129 188 6",
};
let rect3 = {
  x: CircleCenter.x + Math.cos(-1),
  y: CircleCenter.y + Math.sin(0),
  angle: Math.PI,
  color: "5 166 240",
};
let rect4 = {
  x: CircleCenter.x + Math.cos(-1),
  y: CircleCenter.y + Math.sin(-1),
  angle: (Math.PI * 3) / 2,
  color: "255 186 8",
};
let microsoftRectangles = [rect1, rect2, rect3, rect4];

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

    if (FrameCount == 30) {
      demos.forEach((demo) => {
        let { whiteBoxWidth, whiteBoxHeight, lines } =
          demo.calculateHeaderDimensions();
        demo.whiteBoxWidth = whiteBoxWidth;
        demo.whiteBoxHeight = whiteBoxHeight;
        demo.lines = lines;
      });
    }
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

    // Constraining Player to x range [0, Map Size]
    Player.x = Math.max(0, Math.min(Player.x, Map.cols * Map.tsize));

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
    * Background Object Draw
    */
    for (let i = 0; i < backgroundObjects.length; i++) {
      c.drawImage(
        backgroundObjects[i].image,
        Math.floor(backgroundObjects[i].x - camera.x),
        Math.floor(backgroundObjects[i].y)
      );
    }

    if (arrowKeys.isVisible) {
      arrowKeys.draw();
    }

    drawRotatingMicrosoftLogo(c, microsoftRectangles);

    /*
    * Demos Draw
    */
    c.save();
    if (animateText) {
      c.globalAlpha = 100 * textAlpha ** 3;
      textAlpha += 0.01;
      if (c.globalAlpha >= 1) {
        animateText = false;
      }
    }

    for (let i = 0; i < demos.length; i++) {
      demos[i].draw(c);
      if (
        demos[i].detectMouseHover(
          demos[i].x,
          demos[i].y,
          demos[i].width,
          demos[i].height
        )
      ) {
        // draw transparent rectangle for demo
        drawHoverBox(
          c,
          demos[i].x,
          demos[i].y,
          demos[i].width,
          demos[i].height,
          demos[i].borderColorsTopBottom.length
        );
      }
    }

    /*
    * Text Draw
    */
    for (let i = 0; i < welcomeTextArray.length; i++) {
      welcomeTextArray[i].draw(c, welcomeTextArray[i]);
    }

    for (let i = 0; i < textBubbleArray.length; i++) {
      if (
        textBubbleArray[i].minX < Player.x &&
        textBubbleArray[i].maxX > Player.x
      ) {
        textBubbleArray[i].draw(c);
      }
    }
    c.restore();

    /*
    * Player Draw
    */
    drawPlayer(c);

    /*
    * Foreground Object Draw
    */
    for (let i = 0; i < foregroundObjects.length; i++) {
      foregroundObjects[i].draw(c);
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
    if (
      Mouse.x > Player.screenX - Player.width / 2 &&
      Mouse.x < Player.screenX + Player.width / 2
    ) {
      if (Mouse.y > Player.screenY - Player.height && Mouse.y < Player.screenY) {
        scrambleDrawPixelsAtMouse(c);
      }
    }

    FrameCount++;
    if (FrameCount >= Number.MAX_SAFE_INTEGER) {
      FrameCount = 0;
    }
  }

  /*
   * Animation
   */
  window.requestAnimationFrame(loop);
 
};

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

  resizeMap(context);

  for (let i = 0; i < textBubbleArray.length; i++) {
    textBubbleArray[i].maxLineWidth = context.canvas.width / 1.3;
  }

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
  let rightEndX = textBubbleArray[codingStory.length - 1].maxX;
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

function drawRotatingMicrosoftLogo(context, microsoftRectangles) {
  context.save();
  for (let i = 0; i < microsoftRectangles.length; i++) {
    microsoftRectangles[i].angle += 0.01;
    microsoftRectangles[i].x =
      CircleCenter.x + Math.cos(microsoftRectangles[i].angle) * CircleRadius;
    microsoftRectangles[i].y =
      CircleCenter.y + Math.sin(microsoftRectangles[i].angle) * CircleRadius;
    context.fillStyle = "rgb(" + microsoftRectangles[i].color + ")";
    context.fillRect(
      Math.floor(microsoftRectangles[i].x - camera.x),
      Math.floor(microsoftRectangles[i].y),
      150,
      150
    );
  }
  context.restore();
}

function drawInstagram(context, minX, maxX) {
  context.save();
  if (Player.x > minX && Player.x < maxX) {
    let igScreenX = instagram.x - camera.x + instagramImage.width / 2;
    let igScreenY = instagram.y - camera.y + instagramImage.height / 2;
    let playerX = Player.screenX;
    let playerY = Player.y - Player.height;
    context.strokeStyle = "red";
    context.lineWidth = 15;
    context.beginPath();
    context.moveTo(igScreenX, igScreenY);
    context.lineTo(playerX, playerY);
    context.stroke();
  }
  context.restore();
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

function drawTextBubble(context) {
  if (!canShowText) {
    return;
  }
  context.font = getFont(this.fontSize);
  const { whiteBoxHeight, whiteBoxWidth, linesOfTextArray } = getLinesOfText(
    context,
    this.text,
    this.fontSize,
    this.leading,
    this.maxLineWidth
  );

  let paddingBetweenDialogAndPlayer = 10;

  this.x = Player.screenX;
  this.y =
    Player.y -
    Player.image.naturalHeight -
    whiteBoxHeight -
    paddingBetweenDialogAndPlayer;

  this.drawWhiteBoxWithTextAndImage(
    context,
    this.x,
    this.y,
    whiteBoxHeight,
    whiteBoxWidth,
    linesOfTextArray,
    this.fontSize,
    this.leading,
    this.borderColorsLeftRight,
    this.borderColorsTopBottom
  );

  // TextBubble middle triangle above player
  if (!Player.isGoingToTheRight) {
    context.drawImage(this.triangleImage, this.x, this.y + whiteBoxHeight);
  } else {
    drawFlippedImage(
      context,
      this.triangleImage,
      this.x,
      this.y + whiteBoxHeight
    );
  }
}

function detectMouseHover(x, y, width, height) {
  if (
    Mouse.x >= x - width / 2 - camera.x &&
    Mouse.x <= x + width / 2 - camera.x
  ) {
    if (Mouse.y >= y && Mouse.y < y + height) {
      this.hover = true;
      return true;
    }
  }
  this.hover = false;
  return false;
}

function drawHoverBox(context, x, y, width, height, borderLength) {
  context.save();
  context.fillStyle = "rgb(0 0 0 / .5)";
  context.fillRect(
    Math.floor(x - camera.x) - width / 2,
    Math.floor(y - camera.y - borderLength),
    width,
    height + borderLength * 2
  );

  // context.fillStyle = "white";
  // let fontSize = FontHeadingLevels.P;
  // context.font = getFont(fontSize);

  // let textX = Math.floor(x - camera.x - context.measureText("learn more").width / 2);
  // let textY = Math.floor(y + height / 2);
  // let padding = Math.floor(fontSize / 10);
  // context.fillText("learn more", textX, textY);

  // context.strokeStyle = "white";
  // context.beginPath();
  // context.moveTo(textX, textY + padding);
  // context.lineTo(textX + context.measureText("learn more").width, textY + padding);
  // context.stroke();
  // context.restore();
}

function getLinesOfText(context, text, fontSize, leading, maxLineWidth) {
  context.save();
  context.font = getFont(fontSize);

  let words = text.split(" ");
  let linesOfTextArray = new Array();
  let i = 0;
  let currentMaxLineWidth = 0;
  while (i < words.length) {
    let currentLine = "";
    let currentLineWidth = context.measureText(currentLine).width;

    // In case the window gets scaled so small that you can't fit one word under the maxLineWidth
    if (currentLineWidth + context.measureText(words[i]).width > maxLineWidth) {
      maxLineWidth = currentLineWidth + context.measureText(words[i]).width;
    }

    while (
      currentLineWidth + context.measureText(words[i]).width <= maxLineWidth &&
      i < words.length
    ) {
      if (i != words.length - 1) {
        currentLine += words[i] + " ";
      } else {
        currentLine += words[i];
      }
      currentLineWidth = context.measureText(currentLine).width;
      i++;
    }

    linesOfTextArray.push(currentLine);

    if (currentMaxLineWidth < currentLineWidth) {
      currentMaxLineWidth = currentLineWidth;
    }
  }

  let whiteBoxHeight = (fontSize + leading) * linesOfTextArray.length;
  let whiteBoxWidth = Math.ceil(currentMaxLineWidth);

  context.restore();
  return {
    whiteBoxHeight: whiteBoxHeight,
    whiteBoxWidth: whiteBoxWidth,
    linesOfTextArray: linesOfTextArray,
  };
}

function drawWhiteBoxWithText(
  context,
  x,
  y,
  whiteBoxHeight,
  whiteBoxWidth,
  lines,
  fontSize,
  leading,
  borderColorsLeftRight,
  borderColorsTopBottom,
  padding
) {
  context.save();

  // White background
  context.fillStyle = "white";
  context.fillRect(
    Math.floor(x - whiteBoxWidth / 2),
    Math.floor(y),
    whiteBoxWidth,
    whiteBoxHeight
  );

  context.font = getFont(fontSize);

  // Drawing the text over the white box
  context.fillStyle = "black";

  if (padding != null) {
    for (let i = 0; i < lines.length; i++) {
      context.fillText(
        lines[i],
        Math.floor(x - whiteBoxWidth / 2 + padding),
        Math.floor(y + fontSize + i * (leading + fontSize))
      );
    }
  } else {
    for (let i = 0; i < lines.length; i++) {
      context.fillText(
        lines[i],
        Math.floor(x - whiteBoxWidth / 2),
        Math.floor(y + fontSize + i * (leading + fontSize))
      );
    }
  }

  // Top and Bottom borders of the white box
  for (let i = 0; i < borderColorsTopBottom.length; i++) {
    context.fillStyle = borderColorsTopBottom[i];
    context.fillRect(
      Math.floor(x - whiteBoxWidth / 2),
      Math.floor(y - borderColorsTopBottom.length + i),
      whiteBoxWidth,
      1
    );
    context.fillRect(
      Math.floor(x - whiteBoxWidth / 2),
      Math.floor(y + whiteBoxHeight - i + borderColorsTopBottom.length - 1),
      whiteBoxWidth,
      1
    );
  }

  // Left and Right
  for (let i = 0; i < borderColorsLeftRight.length; i++) {
    context.fillStyle = borderColorsLeftRight[i];
    context.fillRect(
      Math.floor(x - whiteBoxWidth / 2 - borderColorsLeftRight.length + i),
      Math.floor(y),
      1,
      whiteBoxHeight
    );
    context.fillRect(
      Math.floor(x + whiteBoxWidth / 2 + borderColorsLeftRight.length - 1 - i),
      Math.floor(y),
      1,
      whiteBoxHeight
    );
  }

  // Drawing the corners
  context.drawImage(
    cornerImage, // image
    0, // source x
    0, // source y
    4, // source width
    5, // source height
    Math.floor(x - whiteBoxWidth / 2 - borderColorsLeftRight.length), // target x
    Math.floor(y - borderColorsTopBottom.length), // target y
    4, // target width
    5 // target height
  );

  context.drawImage(
    cornerImage,
    4,
    0,
    4,
    5,
    Math.floor(x - whiteBoxWidth / 2 - borderColorsLeftRight.length),
    Math.floor(y + whiteBoxHeight),
    4,
    5
  );

  context.drawImage(
    cornerImage,
    8,
    0,
    4,
    5,
    Math.floor(x + whiteBoxWidth / 2),
    Math.floor(y - borderColorsTopBottom.length),
    4,
    5
  );

  context.drawImage(
    cornerImage,
    12,
    0,
    4,
    5,
    Math.floor(x + whiteBoxWidth / 2),
    Math.floor(y + whiteBoxHeight),
    4,
    5
  );

  context.restore();

  return {
    width: whiteBoxWidth + 2 * borderColorsLeftRight.length,
    height: whiteBoxHeight,
  };
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
  
  if (document.fonts.check("12px 'VT323'")) {
    return fontSize + "px 'VT323'";
  } 
  else {
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

function onClick(event) {
  let wasLinkClicked = checkIfLinkClicked(event);
  // if (!wasLinkClicked) {
  //   movePlayerToScreenCoords(event.screenX, event.screenY);
  // }
}

// todo fix
function movePlayerToScreenCoords(x, y) {
  console.log("moving to" + "(" + x + "," + y + ")");

  (Player.screenX = x), (Player.screenY = y);
}

function checkIfLinkClicked(event) {
  for (let i = 0; i < demos.length; i++) {
    if (demos[i].hover && !ProjectDemo.demoModalOpen) {
      injectDemoModal(demos[i]);
      return true;
    }
  }
  return false;
}

function injectDemoModal(demo) {
  // create a new div element
  const newDiv = document.createElement("div");

  // Header
  const headerElement = document.createElement("p");
  const headerTextNode = document.createTextNode(demo.headerText);
  headerElement.appendChild(headerTextNode);
  headerElement.style.cssText =
    "width: fit-content;" +
    "font-size: var(--font-size-xxl);" +
    "margin: 2rem;";

  // X to close modal
  const xButtonElement = document.createElement("button");
  xButtonElement.innerHTML = "&times";
  xButtonElement.setAttribute("class", "xModal");
  xButtonElement.addEventListener("click", () => {
    document.body.removeChild(newDiv);
    ProjectDemo.demoModalOpen = false;
    userInputIsAllowed = true;
  });

  //Images
  const imageContainer = document.createElement("div");
  imageContainer.setAttribute("class", "container");

  const sliderWrapper = document.createElement("div");
  sliderWrapper.setAttribute("class", "slider-wrapper");

  const imageList = document.createElement("div");
  imageList.setAttribute("class", "image-list");

  const imageElements = [];
  for (let i = 0; i < demo.images.length; i++) {
    let currentImageElement = document.createElement("img");
    currentImageElement.setAttribute("class", "image-item");
    currentImageElement.src = demo.images[i].src;
    imageList.appendChild(currentImageElement);
  }

  imageListContent = Array.from(imageList.children);
  imageListContent.forEach((item) => {
    const duplicatedItem = item.cloneNode(true);
    duplicatedItem.setAttribute("aria-hidden", true);
    imageList.appendChild(duplicatedItem);
  });

  sliderWrapper.appendChild(imageList);
  imageContainer.appendChild(sliderWrapper);

  // Text Div
  const textDiv = document.createElement("div");
  textDiv.style.cssText =
    "height: fit-content;" +
    "width: 100%;" +
    "position: relative;" +
    "padding: 1rem;" +
    "text-align: center;";

  const textElement = document.createElement("p");
  const textNode = document.createTextNode(demo.text);
  textElement.style.cssText =
    "font-size: var(--font-size-lg);" + "white-space: pre-line;";
  textElement.appendChild(textNode);

  const linkElement = document.createElement("a");
  linkElement.setAttribute("href", demo.link);
  linkElement.setAttribute("target", "_blank");
  linkElement.innerHTML = "See it live!";
  linkElement.style.cssText =
    "display: inline-block;" +
    "margin-top: 2rem;" +
    "font-size: var(--font-size-lg);";

  textDiv.appendChild(textElement);
  textDiv.appendChild(linkElement);

  newDiv.appendChild(headerElement);
  newDiv.appendChild(xButtonElement);
  newDiv.appendChild(imageContainer);
  newDiv.appendChild(textDiv);

  newDiv.style.cssText =
    "display:flex;" +
    "flex-direction: column;" +
    "align-items: center;" +
    "justify-content: center;" +
    "position:absolute;top:10%;left:50%;" +
    "transform: translateX(-50%);" +
    "width:80%;height:70%;" +
    "max-width:90%;" +
    "overflow: hidden;" +
    "border-radius: 8px;" +
    "background: linear-gradient(#F1F4FD 0%, #F1F4FD 50%, #FFF 80%);";

  // add the newly created element and its content into the DOM
  const currentDiv = document.getElementById("canvas");
  document.body.insertBefore(newDiv, currentDiv);

  ProjectDemo.demoModalOpen = true;
  userInputIsAllowed = false;
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
window.addEventListener("click", onClick);

window.addEventListener("touchstart", handleTouchStart);
window.addEventListener("touchend", handleTouchEnd);
window.addEventListener("touchcancel", handleTouchCancel);
window.addEventListener("touchmove", handleTouchMove);

/* CREDITS
 * Free - Adventure Pack - Grassland by Anokolisa
 *
 */

/*  TODO
 * improve the graphics for the story
* replace text bubble with actual html
 * add links for resume, github, and linked in (near the front)
 */
