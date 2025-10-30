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

window.onload = () => init().catch((e) => console.error(e));

async function init() {
  const board = generateBoard();
  const kb = generateKeyboard();

  const words = (await dictionaryRequest).split("\n");
  const word = 'HORSE';

  await startGame({ word, kb, board, words });
}

async function animate(el, name, ms) {
  el.style.animation = `${ms}ms ${name}`;
  await wait(ms * 1.2);
  el.style.animation = "none";
}

async function startGame({ word, kb, board, words }) {
  const solution = word.split("");
  for (let round = 0; round < ROUNDS; round++) {
    const guess = await collectGuess({ kb, board, round, words });
    const hints = guess.map((letter, i) => {
      if (solution[i] === letter) {
        return "correct";
      } else if (solution.includes(letter)) {
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
  let letters = [];
  

  const keyboardClickHandler = (key) => keyHandler(key);
  const keyDownHandler = (e) => {
    const key = e.key;
    if (key === 'Enter') {
      keyHandler('+');
    } else if (key === 'Backspace') {
      keyHandler('-');
    } else if (key.length === 1 && key.match(/[a-zA-Z]/)) {
      keyHandler(key.toUpperCase());
    }
  };

  const cleanup = () => {
    kb.off(keyboardClickHandler);
    document.removeEventListener('keydown', keyDownHandler);
  };
  
  return new Promise((submit) => {
    const keyHandler = async (key) => {
      if (key === "+") { // Submit guess
        if (letters.length === LENGTH) {
          const guessIsValid = words.includes(letters.join("").toLowerCase());
          if (!guessIsValid) {
            $(".feedback").innerText = "Invalid Word";
            await animate($$(".round")[round], "shake", 800);
            $(".feedback").innerText = ""; // Clear feedback after shake
          } else {
            cleanup();
            submit(letters);
          }
        }
      } else if (key === "-") { // Delete letter
        if (letters.length > 0) {
          letters.pop();
        }
        board.updateGuess(round, letters);
      } else { // Add letter
        if (letters.length < LENGTH) {
          letters.push(key);
        }
        board.updateGuess(round, letters);
      }
    };
    
    // Register the handlers once at the start of the round
    kb.on(keyboardClickHandler);
    document.addEventListener('keydown', keyDownHandler);
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
