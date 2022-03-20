import { jest } from "@jest/globals";

import { Readable, Writable } from "stream";

export default class TestUtil {
  //para testar implementa;cão do codigo vamos emular daods
  // Criamos MOCK
  static generateReadableStream(data) {
    return new Readable({
      read() {
        // leu 10% do arquivo e vai repassando
        for (const item of data) {
          this.push(item);
        }

        //quando termina de ler o arquivo faz push de um null
        this.push(null);
      },
    });
  }

  static generateWritableStream(onData) {
    return new Writable({
      //pedaço do arquivo, encode, callback
      write(chunk, enc, cb) {
        onData(chunk);
        cb(null, chunk);
      },
    });
  }

  static defaultHandleParams() {
    const requestStream = TestUtil.generateReadableStream(["bodys requsition"]);
    const response = TestUtil.generateWritableStream(() => {});
    const data = {
      req: Object.assign(requestStream, {
        headers: {},
        method: "",
        url: "",
      }),
      res: Object.assign(response, {
        writeHead: jest.fn(),
        end: jest.fn(),
      }),
    };

    // handler(...data.values());
    return { values: () => Object.values(data), ...data };
  }
}
