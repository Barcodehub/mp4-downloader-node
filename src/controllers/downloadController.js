const pdfService = require('../services/pdfService');
const videoService = require('../services/videoService');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

exports.downloadFile = async (req, res, next) => {
  const { url, quality, type } = req.body;

  if (!url) {
    return res.status(400).json({ message: 'URL no proporcionada' });
  }

  console.log('Iniciando descarga para:', url);

  try {
    if (type === 'playlist') {
      const playlistDir = await videoService.downloadPlaylist(url, quality);
      const zipFilename = 'playlist.zip';
      const output = fs.createWriteStream(zipFilename);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        console.log('Archivo zip creado');
        res.download(zipFilename, (err) => {
          if (err) console.error('Error al enviar el archivo zip:', err);
          fs.unlinkSync(zipFilename);
          fs.rmdir(playlistDir, { recursive: true }, (err) => {
            if (err) console.error('Error al eliminar la carpeta de la lista de reproducción:', err);
          });
        });
      });

      archive.on('error', (err) => {
        throw err;
      });

      archive.pipe(output);
      archive.directory(playlistDir, false);
      archive.finalize();
    } else {
      const videoFilePath = await videoService.downloadVideo(url, quality);
      console.log('Video descargado:', videoFilePath);

      res.download(videoFilePath, (err) => {
        if (err) {
          console.error('Error al enviar el archivo:', err);
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