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

// Función para determinar si la URL es una playlist
const isPlaylist = (url) => {
    return url.includes('list=');
};

// Ruta para manejar la descarga (video o playlist)
app.post('/download', async (req, res) => {
    const url = req.body.url;
    const audioOnly = req.body.audioOnly === 'true';
    
    if (!url) {
        return res.status(400).send('URL no proporcionada');
    }

    try {
        if (isPlaylist(url)) {
            // Si es una playlist, redirigir a la ruta de descarga de playlists
            return handleLargePlaylistDownload(url, res, audioOnly);
        } else {
            // Si es un video, redirigir a la ruta de descarga de videos
            return handleVideoDownload(url, res, audioOnly);
        }
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        res.status(500).send('Error al procesar la solicitud');
    }
});

// Función para manejar la descarga de un video individual
const handleVideoDownload = async (url, res, audioOnly = false) => {
    try {
        // Definir la ruta de descarga
        const outputPath = path.join(__dirname, 'downloads', '%(title)s.%(ext)s');
        const ffmpegPath = path.join(__dirname, 'ffmpeg', 'bin', 'ffmpeg.exe');

        // Opciones de descarga
        const options = { 
            output: outputPath,
            ffmpegLocation: ffmpegPath, // Ajusta esta ruta
            ...(audioOnly && {
                extractAudio: true,
                audioFormat: 'mp3',
                audioQuality: '0'
            })
        };
        // Descargar el video o audio
        await exec(url, options);

        // Obtener el archivo descargado
        const files = fs.readdirSync(path.join(__dirname, 'downloads'));
        if (files.length === 0) {
            return res.status(404).send('No se encontró ningún archivo descargado');
        }

        // Encontrar el archivo más reciente
        const downloadedFile = files.reduce((prev, current) => {
            const prevPath = path.join(__dirname, 'downloads', prev);
            const currentPath = path.join(__dirname, 'downloads', current);
            return fs.statSync(prevPath).mtimeMs > fs.statSync(currentPath).mtimeMs ? prev : current;
        });

        // Enviar el archivo al cliente
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
};

// Función para manejar la descarga de una playlist
const handleLargePlaylistDownload = async (url, res, audioOnly = false) => {
    try {
        // Configuración inicial
        const playlistFolder = path.join(__dirname, 'downloads', `playlist_${Date.now()}`);
        fs.mkdirSync(playlistFolder, { recursive: true });
        const ffmpegPath = path.join(__dirname, 'ffmpeg', 'bin', 'ffmpeg.exe');

        // Opciones optimizadas para playlists largas
        const options = {
            output: path.join(playlistFolder, '%(title)s.%(ext)s'),
            ffmpegLocation: ffmpegPath,
            ignoreErrors: true,
            noWarnings: true,
            retries: 5,
            fragmentRetries: 5,
            limitRate: '1M', // Limitar velocidad para evitar bloqueos
            skipUnavailable: true,       // Omite videos eliminados/privados
            sleepInterval: 10, // Esperar entre descargas
            maxSleepInterval: 15,
            playlistItems: '1-100', // Limitar cantidad si es necesario
            concurrentFragments: 2, // Descargas concurrentes moderadas
            ...(audioOnly && {
                extractAudio: true,
                audioFormat: 'mp3',
                audioQuality: '0'
            })
        };

        // Verificar FFmpeg
        if (audioOnly && !fs.existsSync(ffmpegPath)) {
            throw new Error('Se requiere FFmpeg para conversión a MP3');
        }

        // Descargar en bloques (para playlists muy grandes)
        const MAX_ITEMS_PER_BLOCK = 100;
        let downloadedCount = 0;
        let errors = [];

        while (true) {
            const start = downloadedCount + 1;
            const end = start + MAX_ITEMS_PER_BLOCK - 1;
            
            try {
                await exec(url, {
                    ...options,
                    playlistItems: `${start}-${end}`
                });
                
                // Verificar progreso
                const currentFiles = fs.readdirSync(playlistFolder)
                    .filter(file => fs.statSync(path.join(playlistFolder, file)).size > 0);
                
                if (currentFiles.length <= downloadedCount) break; // No hay más progreso
                
                downloadedCount = currentFiles.length;
                console.log(`Descargados ${downloadedCount} items...`);
                
                if (downloadedCount % 50 === 0) {
                    // Crear ZIP parcial cada 50 items
                    await createPartialZip(playlistFolder, downloadedCount);
                }
            } catch (blockError) {
                console.error(`Error en bloque ${start}-${end}:`, blockError.message);
                errors.push(blockError.message);
                if (errors.length > 3) break;
            }
        }

        // Crear ZIP final
        const zipFilePath = path.join(__dirname, 'downloads', `playlist_partial_${Date.now()}.zip`);
        await createFinalZip(playlistFolder, zipFilePath);

        // Enviar respuesta
        res.download(zipFilePath, `playlist_partial.zip`, (err) => {
            if (err) console.error('Error al enviar ZIP:', err);
            // Limpieza
            fs.rmSync(playlistFolder, { recursive: true, force: true });
            fs.unlinkSync(zipFilePath);
        });

    } catch (error) {
        console.error('Error en playlist larga:', error);
        res.status(500).json({
            success: false,
            downloaded: downloadedCount,
            errors: error,
            message: `Se descargaron ${downloadedCount} items con ${error.length} errores`
        });
    }
};

// Funciones auxiliares
async function createPartialZip(folder, count) {
    const zipPath = path.join(__dirname, 'downloads', `playlist_partial_${count}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 6 } });
    
    return new Promise((resolve, reject) => {
        output.on('close', resolve);
        archive.on('error', reject);
        archive.pipe(output);
        archive.directory(folder, false);
        archive.finalize();
    });
}

async function createFinalZip(folder, zipPath) {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 6 } });
    
    return new Promise((resolve, reject) => {
        output.on('close', resolve);
        archive.on('error', reject);
        archive.pipe(output);
        archive.directory(folder, false);
        archive.finalize();
    });
}

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});