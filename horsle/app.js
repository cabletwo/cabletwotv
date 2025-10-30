const $ = (s, e = document.body) => e.querySelector(s);
const $$ = (s, e = document.body) => [...e.querySelectorAll(s)];
const wait = (ms) => new Promise((done) => setTimeout(done, ms));

const dom = (tag, attrs, ...children) => {
  const el = document.createElement(tag);
  if (attrs instanceof HTMLElement) {
    children.unshift(attrs);
  } else {
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === "class" && value instanceof Array) {
        value = value.join(" ");
      }
      el.setAttribute(key, value);
    });
  }
  el.append(...children.flat());
  return el;
};

const KEYS = ["QWERTYUIOP", "ASDFGHJKL", "+ZXCVBNM-"];
const PRETTY_KEYS = {
  "+": "Enter",
  "-": "Del",
};

const ROUNDS = 6;
const LENGTH = 5;

const dictionaryRequest = fetch("/dictionary.txt").then((r) => r.text());
const board = $(".board");
const keyboard = $(".keyboard");

async function init() {
  const board = generateBoard();
  const kb = generateKeyboard();

  const words = (await dictionaryRequest).split("\n");
  const word = 'HORSE';

  await startGame({ word, kb, board, words });
}


window.onload = () => init().catch((e) => console.error(e));

async function animate(el, name, ms) {
  el.style.animation = `${ms}ms ${name}`;
  await wait(ms * 1.2);
  el.style.animation = "none";
}

async function startGame({ word, kb, board, words }) {
  let guesses = [];
  const solution = word.split("");
  let round = 0;
  for (round = 0; round < ROUNDS; round++) {
    const guess = await collectGuess({ kb, board, round, words });
    const hints = guess.map((letter, i) => {
      let pos = solution.indexOf(letter);
      if (solution[i] === letter) {
        return "correct";
      } else if (pos > -1) {
        return "close";
      }
      return "wrong";
    });
    board.revealHint(round, hints);
    kb.revealHint(guess, hints);
    if (guess.join("") === word) {
      $(".feedback").innerText = `Nice Work!`;
      return;
    }
  }
  $(".feedback").innerText = `GAME OVER\nCorrect Answer was: ${word}`;
}

function collectGuess({ kb, board, round, words }) {
  return new Promise((submit) => {
    let letters = [];
    async function keyHandler(key) 
    
    {
      if (key === "+") {
        if (letters.length === 5) {
          const guessIsValid = words.includes(letters.join(""));
          if (!guessIsValid) {
            $(".feedback").innerText = "Invalid Word";
            await animate($$(".round")[round], "shake", 800);
          } else {
            $(".feedback").innerText = "";
            kb.off(keyHandler);
            document.removeEventListener('keydown', keyDownHandler);
            submit(letters);
          }
         
          function keyDownHandler(e) {
			const key = e.key.toLowerCase();

			if (key === 'enter') { keyHandler('+') }
			if (key === 'backspace') { keyHandler('-') }

			if (KEYS.some(k => k.includes(key.toUpperCase()))) {
				keyHandler(key.toUpperCase());
			}
		}

		document.addEventListener('keydown', keyDownHandler);
          
        }
      } else if (key === "-") {
        if (letters.length > 0) {
          letters.pop();
        }
        board.updateGuess(round, letters);
      } else {
        if (letters.length < 5) {
          letters.push(key);
        }
        board.updateGuess(round, letters);
      }
    }
    kb.on(keyHandler);
  });
}

function generateBoard() {
  const rows = [];
  for (let i = 0; i < ROUNDS; i++) {
    const row = dom("div", {
      class: "round",
      "data-round": i,
    });
    for (let j = 0; j < LENGTH; j++) {
      row.append(
        dom("div", {
          class: "letter",
          "data-pos": j,
        })
      );
    }
    board.append(row);
  }
  return {
    updateGuess: (round, letters) => {
      const blanks = $$(".letter", $$(".round")[round]);
      blanks.forEach((b, i) => (b.innerText = letters[i] || ""));
    },
    revealHint: (round, hints) => {
      const blanks = $$(".letter", $$(".round")[round]);
      hints.forEach((hint, i) => {
        if (hint) {
          blanks[i].classList.add("letter--hint-" + hint);
        }
      });
    },
  };
}

function generateKeyboard() {
  keyboard.append(
    ...KEYS.map((row) =>
      dom(
        "div",
        {
          class: "keyboard__row",
        },
        row.split("").map((key) =>
          dom(
            "button",
            {
              class: `key${PRETTY_KEYS[key] ? " key--pretty" : ""}`,
              "data-key": key,
            },
            PRETTY_KEYS[key] || key
          )
        )
      )
    )
  );
  const keyListeners = new Set();
  keyboard.addEventListener("click", (e) => {
    e.preventDefault();
    const key = e.target.getAttribute("data-key");
    if (key) {
      keyListeners.forEach((l) => l(key));
    }
  });
  return {
    on: (l) => keyListeners.add(l),
    off: (l) => keyListeners.delete(l),
    revealHint: (guess, hints) => {
      hints.forEach((hint, i) => {
        $(`[data-key="${guess[i]}"]`).classList.add("key--hint-" + hint);
      });
    },
  };
}
