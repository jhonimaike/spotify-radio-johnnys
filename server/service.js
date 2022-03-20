import fs from "fs";
import fsPromises from "fs/promises";
import streamsPromises from "stream/promises";
import { randomUUID } from "crypto";
import config from "./config.js";
import { PassThrough, Writable } from "stream";
import path, { join, extname } from "path";
import childProcess from "child_process";
import { logger } from "./util.js";
import Throttle from "throttle";
import { once } from "events";

// const {
//   dir: { publicDirectory },
// } = config;

export class Service {
  constructor() {
    this.clientStreams = new Map();
    this.currentSong = config.constants.englishConversation;
    this.currentBitRate = 0;
    this.throttleTransform = {};
    this.currentReadable = {};

    // this.startStreaming(); //provisorio
  }

  createClientStream() {
    const id = randomUUID();
    // Uma stream chegue e seja repassada
    // similar a uma corrente sem ninguém alterar nada uma
    // isso é um canal de comunicação
    const clientStream = new PassThrough();
    this.clientStreams.set(id, clientStream);

    return {
      id,
      clientStream,
    };
  }

  removeClientStream(id) {
    this.clientStreams.delete(id);
  }

  // underline para indicar que é PRIVADO por convenção
  //acessar sox e ver bitrate e manipular bytes de retornando
  _executeClientStream(args) {
    //executar comandos no sistema operacional, dentro do node
    return childProcess.spawn("sox", args);
  }

  // a medida que chega o dado ele vai mandar aqui para o Writable string
  // e o Writable string nao vai mandar pra lugar nenhum.
  // A ultima etapa é notificar nossos clientes
  broadCast() {
    return new Writable({
      // write(chunk, enc, cb) {
      // assim para pegar o contexto
      write: (chunk, enc, cb) => {
        for (const [id, stream] of this.clientStreams) {
          //se o cliente desconectou, não devemos mais enviar dados
          if (stream.writableEnded) {
            this.clientStreams.delete(id); //retiramos o cliente
            continue;
          }
          stream.write(chunk); //chegou um pedacinho, notificamos o cliente
        }

        //para dizer que ja terminou e receber o prox chunk
        cb();
      },
    });
  }

  async startStreaming() {
    //inicializar stream
    logger.info(`starting with ${this.currentSong}`);

    const bitRate = (this.currentBitRate =
      (await this.getBitRate(this.currentSong)) /
      config.constants.bitRateDivisor);

    //controlar quantos bits estamos enviando
    // ele controla o fluxo de aplicações
    // envés de ler e enviar por partes rapidamente, ele vai leendo e enviando
    // de a pouco para que possamos manipular o audio antes de enviar para o cliente
    const throttleTransform = (this.throttleTransform = new Throttle(bitRate));

    // stream do arquivo
    const songReadable = (this.currentReadable = this.createFileStream(
      this.currentSong
    ));

    //queremos ler a stream até o final
    return streamsPromises.pipeline(
      songReadable, //recebeu 20kb/s
      //backpressure
      throttleTransform, // mas esse disse que só vai enviar 10kb/s
      this.broadCast() //notificar clientes
    );
  }

  stopStreaming() {
    //se nao existir nao tem problema
    this.throttleTransform?.end?.();
    // this.throttleTransform.end();
  }
  async getBitRate(song) {
    try {
      const args = [
        "--i", //info
        "-B", // bitrate
        song,
      ];

      const {
        stderr, //erro,
        stdout, //log
        stdin, // enviar dados como stream
      } = this._executeClientStream(args);

      // para forçar aguardar que tenha terminado o stderr e stdout
      await Promise.all([once(stderr, "readable"), once(stdout, "readable")]);

      //ler stream
      const [success, error] = [stdout, stderr].map((stream) => stream.read());

      // se der error vai cair no catch aqui e nao lá na camada de rotas
      if (error) return await Promise.reject();

      // regex para trocar K por 0 e retornar
      return success.toString().trim().replace(/k/, "000");
    } catch (error) {
      logger.error(`error no bitrate: ${error}`);
      return config.constants.fallbackBitRate;
    }
  }

  //retornando a stream do arquivo
  createFileStream(filename) {
    //vamos ler um arquivo em pequenos pedaços
    return fs.createReadStream(filename);
  }

  async getFileInfo(file) {
    //file = home/index.html
    const fullFilePath = join(config.dir.pulicDirectory, file);

    // validar se existe, se não, lançar erro
    await fsPromises.access(fullFilePath);

    //obter extensão
    const fileType = extname(fullFilePath);

    return {
      type: fileType,
      // type: "",
      name: fullFilePath,
      // name: "",
    };
  }

  // retornar a stream com o createFileStream,
  // porque temos que normalizar o arquivo e content-Type
  async getFileStream(file) {
    const { type, name } = await this.getFileInfo(file);

    return {
      stream: this.createFileStream(name),
      type,
    };
  }

  async readFxByName(fxName) {
    const songs = await fsPromises.readdir(config.dir.fxDirectory);
    const chosenSong = songs.find((filename) =>
      filename.toLowerCase().includes(fxName)
    );
    if (!chosenSong) return Promise.reject(`the song ${fxName} wasn't found!`);

    return path.join(config.dir.fxDirectory, chosenSong);
  }

  appendFxStream(fx) {
    //gerar uma nova Stream
    const throttleTransformable = new Throttle(this.currentBitRate);

    //novo controlador de fluxo
    streamsPromises.pipeline(throttleTransformable, this.broadCast()); //broadCast avisa que ta chegando coisa nova)

    //remover algo
    const unpipe = () => {
      //guarda o som mergeado
      const transformStream = this.mergeAudioStreams(fx, this.currentReadable);

      //fazer switch
      this.throttleTransform = throttleTransformable;
      this.currentReadable = transformStream;

      //parar de ouvir essa função para não estourar memoria
      this.currentReadable.removeListener("unpipe", unpipe);

      //enviando o som mergeado para o novo stream criado
      streamsPromises.pipeline(transformStream, throttleTransformable);
    };

    this.throttleTransform.on("unpipe", unpipe);
    //clietne nao deixa de ouvir, pausar muito rapidamente
    this.throttleTransform.pause();

    //pegando oque esta sendo executado e retirar uma parte
    //pensar que eram 2 partes, e no inicio juntamos e agora separamos com unpipe
    this.currentReadable.unpipe(this.throttleTransform);
  }

  mergeAudioStreams(song, readable) {
    //ler do disco
    const transformStream = PassThrough();

    //a medida que chegar dados do SOX, ja vamos repassando, sem precisar guardar em diso
    const args = [
      "-t",
      config.constants.audioMediaType,
      "-v",
      config.constants.songVolume,
      "-m", //fazer merge
      "-", // para receber como Stream
      "-t",
      config.constants.audioMediaType,
      "-v",
      config.constants.fxVolume,
      song,
      "-t",
      config.constants.fxVolume,
      "-t",
      config.constants.audioMediaType,
      "-", // saida como Stream
    ];

    //juntar 2 streams e uma tera o volume mais baixo

    // nao usar await pq essas stream nunca acabam

    const { stdout, stdin } = this._executeClientStream(args);

    //plugamos a stream de conversação na entrada de dados do terminal
    streamsPromises
      .pipeline(readable, stdin)
      .catch((error) =>
        logger.error(`error on sending stream to sox ${error}`)
      );

    streamsPromises
      .pipeline(stdout, transformStream)
      .catch((error) =>
        logger.error(`error on receiving stream from sox ${error}`)
      );

    //retornando para frontend
    return transformStream;
  }
}
