const express = require('express');
const path = require('path');
const { exec } = require('youtube-dl-exec');
const fs = require('fs');
const archiver = require('archiver');

const app = express();
const PORT = 3002;

// Configura Express para servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para descargar un video individual
app.post('/download', async (req, res) => {
    const url = req.body.url;
    if (!url) {
        return res.status(400).send('URL no proporcionada');
    }

    try {
        // Definir la ruta de descarga
        const outputPath = path.join(__dirname, 'downloads', '%(title)s.%(ext)s');

        // Descargar el video
        await exec(url, { output: outputPath });

        // Obtener el archivo descargado
        const files = fs.readdirSync(path.join(__dirname, 'downloads'));
        if (files.length === 0) {
            return res.status(404).send('No se encontró ningún archivo descargado');
        }

        // Enviar el archivo al cliente
        const downloadedFile = files[files.length - 1]; // Último archivo descargado
        res.download(path.join(__dirname, 'downloads', downloadedFile), downloadedFile, (err) => {
            if (err) {
                console.error('Error al enviar el archivo:', err);
                res.status(500).send('Error al enviar el archivo');
            }

            // Opcional: Eliminar el archivo del servidor después de enviarlo
            fs.unlinkSync(path.join(__dirname, 'downloads', downloadedFile));
        });
    } catch (error) {
        console.error('Error al descargar el video:', error);
        res.status(500).send('Error al descargar el video');
    }
});

// Ruta para descargar una playlist como .zip
app.post('/download-playlist', async (req, res) => {
    const url = req.body.url;
    if (!url) {
        return res.status(400).send('URL no proporcionada');
    }

    try {
        // Crear una carpeta temporal para la playlist
        const playlistFolder = path.join(__dirname, 'downloads', `playlist_${Date.now()}`);
        fs.mkdirSync(playlistFolder, { recursive: true });

        // Descargar la playlist en la carpeta temporal
        await exec(url, { output: path.join(playlistFolder, '%(title)s.%(ext)s') });

        // Crear un archivo .zip con los videos descargados
        const zipFilePath = path.join(__dirname, 'downloads', `playlist_${Date.now()}.zip`);
        const output = fs.createWriteStream(zipFilePath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        // Manejar eventos de la compresión
        output.on('close', () => {
            console.log(`Tamaño del archivo .zip: ${archive.pointer()} bytes`);
            // Enviar el archivo .zip al cliente
            res.download(zipFilePath, `playlist.zip`, (err) => {
                if (err) {
                    console.error('Error al enviar el archivo .zip:', err);
                    res.status(500).send('Error al enviar el archivo .zip');
                }

                // Eliminar la carpeta temporal y el archivo .zip después de enviarlo
                fs.rmdirSync(playlistFolder, { recursive: true });
                fs.unlinkSync(zipFilePath);
            });
        });

        archive.on('error', (err) => {
            throw err;
        });

        // Comprimir los archivos
        archive.pipe(output);
        archive.directory(playlistFolder, false);
        archive.finalize();
    } catch (error) {
        console.error('Error al descargar la playlist:', error);
        res.status(500).send('Error al descargar la playlist');
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});