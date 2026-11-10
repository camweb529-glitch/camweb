// Servidor temporal en localhost para completar la recuperación de Auth.
// Sirve los archivos existentes y envía la ruta raíz a la pantalla de Vehículos.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const mimeTypes = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml"
};

http.createServer((request, response) => {
    let pathname;
    try {
        pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    } catch {
        response.writeHead(400).end("Solicitud inválida");
        return;
    }

    if (pathname === "/") {
        response.writeHead(302, { Location: "/VEHICULOS/index.html", "Cache-Control": "no-store" });
        response.end();
        return;
    }

    const filename = path.resolve(root, `.${pathname}`);
    if (!filename.startsWith(root + path.sep)) {
        response.writeHead(403).end("Acceso denegado");
        return;
    }

    fs.stat(filename, (statError, stats) => {
        if (statError || !stats.isFile()) {
            response.writeHead(404).end("No encontrado");
            return;
        }
        response.writeHead(200, {
            "Content-Type": mimeTypes[path.extname(filename).toLowerCase()] || "application/octet-stream",
            "Cache-Control": "no-store"
        });
        fs.createReadStream(filename).pipe(response);
    });
}).listen(3000, "127.0.0.1", () => {
    console.log("CAMWEB local: http://localhost:3000/VEHICULOS/index.html");
});
