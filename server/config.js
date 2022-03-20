import { dirname, join } from "path";
import { fileURLToPath } from "url";

// ja que nao existe mais o __dirname e tampouco o __filepath
// temos que obter de outra formatting

// obtemos o dirname apartir da pasta que estamos
const currentDir = dirname(fileURLToPath(import.meta.url));

// sabendo a paste onde estamos voltamos a uma superior e chegamos ao root
const root = join(currentDir, "../");

//pasta audio
const audioDirectory = join(root, "audio");

//pasta public
const pulicDirectory = join(root, "public");
// console.log(`${pulicDirectory}/home/index.html`);

const songsDirectory = join(audioDirectory, "songs");

const fxDirectory = join(audioDirectory, "fx");

export default {
  port: process.env.PORT || 3000,
  dir: {
    root,
    pulicDirectory,
    audioDirectory,
    songsDirectory: songsDirectory,
    fxDirectory: fxDirectory,
  },
  pages: {
    homeHTML: "home/index.html",
    controllerHTML: "controller/index.html",
  },
  location: {
    home: "/home",
  },
  constants: {
    CONTENT_TYPE: {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "text/javascript",
    },
    audioMediaType: "mp3",
    songVolume: "0.99",
    fxVolume: "0.1",
    fallbackBitRate: "128000",
    bitRateDivisor: 8,
    englishConversation: join(songsDirectory, "conversation.mp3"),
  },
};
