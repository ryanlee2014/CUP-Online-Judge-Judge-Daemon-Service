import http from "http";
import app from '../http/app';
import config from '../lib/config';
const httpServer = http.createServer(app);
const port = config.port;
httpServer.listen(port, () => {
  console.log("Server listening at port %d", port);
});

export default httpServer;
