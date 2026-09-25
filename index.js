const http = require("http");
const fs = require("fs");

const TEST_CONFIG_STR = process.env.TEST_CONFIG_STR;
const CERT_FILE_PATH = process.env.CERT_FILE_PATH;

if (!TEST_CONFIG_STR || !CERT_FILE_PATH) {
  console.error("Missing TEST_CONFIG_STR or CERT_FILE_PATH");
  process.exit(1);
}

let certContent;
try {
  certContent = fs.readFileSync(CERT_FILE_PATH, "utf8");
} catch (e) {
  console.error(`Cannot read cert at ${CERT_FILE_PATH}: ${e.message}`);
  process.exit(1);
}

const albums = [
  { title: "Blue Train", artist: "John Coltrane" },
  { title: "Jeru", artist: "Gerry Mulligan" },
];

http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/albums") {
    console.log("*".repeat(60));
    console.log(`Test config value: ${TEST_CONFIG_STR}`);
    console.log(`Cert file loaded: path=${CERT_FILE_PATH} length=${certContent.length}`);
    certContent.split("\n").forEach((l) => console.log(l));
    console.log("*".repeat(60));
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(albums));
  }
  res.writeHead(404);
  res.end();
}).listen(8080, () => console.log("Listening on 8080"));
