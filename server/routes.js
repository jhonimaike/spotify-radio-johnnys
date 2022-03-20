import { once } from "events";
import config from "./config.js";
import { Controller } from "./controller.js";
import { logger } from "./util.js";

const controller = new Controller();

async function routes(req, res) {
  const { method, url } = req;

  // redireccionar para a home
  if (method === "GET" && url === "/") {
    //Status Code Found
    res.writeHead(302, { Location: config.location.home });
    return res.end();
  }

  if (method === "GET" && url === "/home") {
    const { stream } = await controller.getFileStream(config.pages.homeHTML);

    // padraão do response é text/html
    // res.writeHead(200, {"Content-Type": "text/html"})

    //enviar para um consumidor sob demanda (front-end)
    return stream.pipe(res);
  }

  if (method === "GET" && url === "/controller") {
    const { stream } = await controller.getFileStream(
      config.pages.controllerHTML
    );

    return stream.pipe(res);
  }

  //devido a que o browser faz cache de audio, vamos ter fazer
  // um truque na rota com o includes
  if (method === "GET" && url.includes("/stream")) {
    const { stream, onClose } = controller.createClientStream();
    //quando o cliente fechar o browser, vamos saber pelo once
    req.once("close", onClose);
    res.writeHead(200, {
      "Content-Type": "audio/mpeg",
      "Accept-Ranges": "bytes",
    });

    return stream.pipe(res);
  }

  if (method === "POST" && url === "/controller") {
    // REQUEST E RESPONSE são STREAMS, e pegar

    const data = await once(req, "data");
    const item = JSON.parse(data);
    const result = await controller.handleCommand(item);

    return res.end(JSON.stringify(result));

    //inicializar nosso comando
  }

  // ============================================================
  //files
  if (method === "GET") {
    const { stream, type } = await controller.getFileStream(url);

    const contentType = config.constants.CONTENT_TYPE[type];
    if (contentType) {
      res.writeHead(200, { "Content-Type": contentType });
    }
    return stream.pipe(res);
    // return res.end();
  }

  //curl -X POST -i localhost:3000/home123
  res.writeHead(404);
  return res.end();

  // return res.end("hello");
}

function handleError(res, error) {
  //ENOENT = nao encontrou o arquivo
  if (error.message.includes("ENOENT")) {
    logger.warn(`asset not found ${error.stack}`);
    res.writeHead(404);
    return res.end();
  }

  logger.error(`caught error on API ${error.stack}`);
  res.writeHead(500);
  return res.end();
}

//funciona como um try catch global
export function handler(req, res) {
  //aqui capturamos o erro
  return routes(req, res).catch(
    (error) => handleError(res, error)
    // logger.error(`stack error: ${error.stack}`)
  );
}
