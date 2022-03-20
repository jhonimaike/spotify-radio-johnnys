import { jest, expect, test, describe, beforeEach } from "@jest/globals";
import config from "../../../server/config.js";
import { Controller } from "../../../server/controller.js";
import { handler } from "../../../server/routes.js";
import TestUtil from "../_util/testUtil.js";

describe("#Routes - test site for api response", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });
  // test("my test", () => {
  //   expect(true).toBeTruthy();
  // });

  // TESTES UNITARIOS
  // test.todo("GET / - should redirect to home page");
  test("GET / - should redirect to home page", async () => {
    const params = TestUtil.defaultHandleParams();
    params.req.method = "GET";
    params.req.url = "/";

    // jest.spyOn(
    //   params.res,
    //   params.res.writeHead.name,
    // )
    await handler(...params.values());
    expect(params.res.writeHead).toBeCalledWith(302, {
      Location: config.location.home,
    });
    expect(params.res.end).toHaveBeenCalled();
  });

  // ================================================================
  test("GET /home - should response with home/index.html file stream", async () => {
    const params = TestUtil.defaultHandleParams();
    params.req.method = "GET";
    params.req.url = "/home";

    const mockFileStream = TestUtil.generateReadableStream(["data"]);
    //vamos interceptar
    jest
      .spyOn(Controller.prototype, Controller.prototype.getFileStream.name)
      .mockResolvedValue({
        stream: mockFileStream,
      });

    jest.spyOn(mockFileStream, "pipe").mockReturnValue;

    await handler(...params.values());
    expect(Controller.prototype.getFileStream).toBeCalledWith(
      config.pages.homeHTML
    );
    expect(mockFileStream.pipe).toHaveBeenCalledWith(params.res);
  });

  // ============================================================================
  test("GET /controller - should response with controller/index.html file stream", async () => {
    const params = TestUtil.defaultHandleParams();
    params.req.method = "GET";
    params.req.url = "/controller";

    const mockFileStream = TestUtil.generateReadableStream(["data"]);
    //vamos interceptar
    jest
      .spyOn(Controller.prototype, Controller.prototype.getFileStream.name)
      .mockResolvedValue({
        stream: mockFileStream,
      });

    jest.spyOn(mockFileStream, "pipe").mockReturnValue;

    await handler(...params.values());
    expect(Controller.prototype.getFileStream).toBeCalledWith(
      config.pages.controllerHTML
    );
    expect(mockFileStream.pipe).toHaveBeenCalledWith(params.res);
  });

  // ===========================================================================
  test("GET /index.html - should response with file stream", async () => {
    const params = TestUtil.defaultHandleParams();
    params.req.method = "GET";
    params.req.url = "/index.html";

    const expectedType = ".html";
    const mockFileStream = TestUtil.generateReadableStream(["data"]);
    //vamos interceptar
    jest
      .spyOn(Controller.prototype, Controller.prototype.getFileStream.name)
      .mockResolvedValue({
        stream: mockFileStream,
        type: expectedType,
      });

    jest.spyOn(mockFileStream, "pipe").mockReturnValue;

    await handler(...params.values());
    expect(Controller.prototype.getFileStream).toBeCalledWith("/index.html");
    expect(mockFileStream.pipe).toHaveBeenCalledWith(params.res);
    expect(params.res.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": config.constants.CONTENT_TYPE[expectedType],
    });
  });

  // ===========================================================================
  test("GET /file.ext - should response with file stream", async () => {
    const params = TestUtil.defaultHandleParams();
    params.req.method = "GET";
    params.req.url = "/file.ext";

    const expectedType = ".ext";
    const mockFileStream = TestUtil.generateReadableStream(["data"]);
    //vamos interceptar
    jest
      .spyOn(Controller.prototype, Controller.prototype.getFileStream.name)
      .mockResolvedValue({
        stream: mockFileStream,
        type: expectedType,
      });

    jest.spyOn(mockFileStream, "pipe").mockReturnValue;

    await handler(...params.values());
    expect(Controller.prototype.getFileStream).toBeCalledWith("/file.ext");
    expect(mockFileStream.pipe).toHaveBeenCalledWith(params.res);
    expect(params.res.writeHead).not.toHaveBeenCalled();
  });

  // ===========================================================================
  test("POST /unknown - given an inexistent route it should response with 404", async () => {
    const params = TestUtil.defaultHandleParams();
    params.req.method = "POST";
    params.req.url = "/unknown";
    await handler(...params.values());
    expect(params.res.writeHead).toHaveBeenCalledWith(404);
    expect(params.res.end).toHaveBeenCalled();
  });

  // ============================================================================
  test("GET /stream?id=123 - should call createClientStream", async () => {
    const params = TestUtil.defaultHandleParams();

    params.req.method = "GET";
    params.req.url = "/stream";
    const stream = TestUtil.generateReadableStream(["test"]);
    jest.spyOn(stream, "pipe").mockReturnValue();

    const onClose = jest.fn();
    jest
      .spyOn(Controller.prototype, Controller.prototype.createClientStream.name)
      .mockReturnValue({
        onClose,
        stream,
      });

    await handler(...params.values());
    params.req.emit("close");

    expect(params.res.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "audio/mpeg",
      "Accept-Ranges": "bytes",
    });

    expect(Controller.prototype.createClientStream).toHaveBeenCalled();
    expect(stream.pipe).toHaveBeenCalledWith(params.res);
    expect(onClose).toHaveBeenCalled();
  });

  // ==============================================================================
  test("POST /controller - should call handleCommand", async () => {
    const params = TestUtil.defaultHandleParams();

    params.req.method = "POST";
    params.req.url = "/controller";
    const body = {
      command: "start",
    };

    params.req.push(JSON.stringify(body));

    const jsonResult = {
      ok: "1",
    };
    jest
      .spyOn(Controller.prototype, Controller.prototype.handleCommand.name)
      .mockResolvedValue(jsonResult);

    await handler(...params.values());

    expect(Controller.prototype.handleCommand).toHaveBeenCalledWith(body);
    expect(params.res.end).toHaveBeenCalledWith(JSON.stringify(jsonResult));
  });

  // ============================================================================
  describe("exceptions", () => {
    test("given inexistent file it should respond with 404", async () => {
      const params = TestUtil.defaultHandleParams();

      params.req.method = "GET";
      params.req.url = "/index.png";
      jest
        .spyOn(Controller.prototype, Controller.prototype.getFileStream.name)
        .mockRejectedValue(new Error("Error: ENOENT: no such file or directy"));
      await handler(...params.values());
      expect(params.res.writeHead).toHaveBeenCalledWith(404);
      expect(params.res.end).toHaveBeenCalled();
    });

    // ====================================================================
    test("given an error it should response with 500", async () => {
      const params = TestUtil.defaultHandleParams();

      params.req.method = "GET";
      params.req.url = "/index.png";
      jest
        .spyOn(Controller.prototype, Controller.prototype.getFileStream.name)
        .mockRejectedValue(new Error("Error:"));

      await handler(...params.values());

      expect(params.res.writeHead).toHaveBeenCalledWith(500);
      expect(params.res.end).toHaveBeenCalled();
    });
  });
});
