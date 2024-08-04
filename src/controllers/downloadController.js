const videoService = require('../services/videoService');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

function findMediaFiles(dir, extensions = ['.mp4', '.mkv']) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(findMediaFiles(file, extensions));
    } else {
      if (extensions.includes(path.extname(file).toLowerCase())) {
        results.push(file);
      }
    }
  });
  return results;
}

exports.downloadFile = async (req, res, next) => {
  const { url, quality, type } = req.body;

  if (!url) {
    return res.status(400).json({ message: 'URL no proporcionada' });
  }

  console.log('Iniciando descarga para:', url);

  try {
    const isPlaylist = url.includes('list=');
    if (type === 'playlist' && !isPlaylist) {
      return res.status(400).json({ message: 'La URL proporcionada no es una playlist' });
    }

    if (type === 'video' && isPlaylist) {
      return res.status(400).json({ message: 'La URL proporcionada es una playlist, no un video individual' });
    }

    if (type === 'playlist' && isPlaylist) {
      try {
        const playlistDir = await videoService.downloadPlaylist(url, quality);
        console.log('Directorio de la playlist:', playlistDir);
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="playlist.zip"`);

        const mediaFiles = findMediaFiles(playlistDir);
        console.log('Archivos multimedia encontrados:', mediaFiles);

        if (mediaFiles.length === 0) {
          return res.status(404).json({ message: 'No se encontraron archivos para descargar' });
        }

        const zipFilename = 'playlist.zip';
        const output = fs.createWriteStream(zipFilename);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
          console.log('Archivo zip creado');
          res.download(zipFilename, (err) => {
            if (err) console.error('Error al enviar el archivo zip:', err);
            fs.unlinkSync(zipFilename);
            fs.rm(playlistDir, { recursive: true, force: true }, (err) => {
              if (err) console.error('Error al eliminar la carpeta de la lista de reproducción:', err);
            });
          });
        });

        archive.on('error', (err) => {
          console.error('Error al crear el archivo zip:', err);
          res.status(500).json({ message: 'Error al crear el archivo zip', error: err.message });
        });

        archive.pipe(output);

        mediaFiles.forEach(file => {
          console.log('Agregando al zip:', file);
          archive.file(file, { name: path.basename(file) });
        });

        await archive.finalize();
      } catch (error) {
        console.error('Error en el proceso de la playlist:', error);
        res.status(500).json({ message: 'Error en el proceso de la playlist', error: error.message });
      }
    } else {
      const videoFilePath = await videoService.downloadVideo(url, quality);
      console.log('Video descargado:', videoFilePath);
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', `attachment; filename="video.mp4"`);
    
      res.download(videoFilePath, (err) => {
        if (err) {
          console.error('Error al enviar el archivo:', err);
          res.status(500).json({ message: 'Error al enviar el archivo', error: err.message });
        } else {
          console.log('Archivo enviado correctamente');
        }
        videoService.deleteFile(videoFilePath);
      });
    }
  } catch (error) {
    console.error('Error en la descarga:', error);
    res.status(500).json({ message: 'Error en la descarga', error: error.message });
  }
};
