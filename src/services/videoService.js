const youtubeDl = require('youtube-dl-exec');
const fs = require('fs');
const path = require('path');

exports.downloadVideo = async (url, quality = 'best') => {
  try {
    console.log('Iniciando descarga del video...');
    const outputTemplate = 'downloads/%(title)s.%(ext)s';
    
    if (!fs.existsSync('downloads')) {
      fs.mkdirSync('downloads');
    }

    const options = {
      output: outputTemplate,
      format: quality === 'hd' ? 'bestvideo[height<=1080]+bestaudio/best' : 'best',
      noCheckCertificates: true,
      noWarnings: true,
      addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
      mergeOutputFormat: 'mp4'  // Forzar la salida a MP4
    };

    const result = await youtubeDl(url, options);
    console.log('Descarga completada:', result);
    
    // Buscar el archivo descargado
    const files = fs.readdirSync('downloads');
    console.log('Archivos en el directorio de descargas:', files);

    // Buscar cualquier archivo que no sea un directorio
    const downloadedFile = files.find(file => {
      const filePath = path.join('downloads', file);
      return fs.statSync(filePath).isFile();
    });
    
    if (!downloadedFile) {
      throw new Error('No se pudo encontrar el archivo descargado');
    }

    const filePath = path.join('downloads', downloadedFile);
    console.log('Archivo encontrado:', filePath);

    return filePath;
  } catch (error) {
    console.error('Error en downloadVideo:', error);
    throw error;
  }
};

exports.deleteFile = (filename) => {
  try {
    fs.unlinkSync(filename);
    console.log('Archivo eliminado:', filename);
  } catch (err) {
    console.error('Error al eliminar el archivo:', err);
  }
};


exports.downloadPlaylist = async (url, quality = 'best') => {
  try {
    console.log('Iniciando descarga de la lista de reproducción...');
    const outputTemplate = 'downloads/%(playlist)s/%(title)s.%(ext)s';
    
    if (!fs.existsSync('downloads')) {
      fs.mkdirSync('downloads');
    }

    const options = {
      output: outputTemplate,
      format: quality === 'hd' 
        ? 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best' 
        : 'best[ext=mp4]/best',
      mergeOutputFormat: 'mp4',
      noCheckCertificate: true,
      noWarnings: true,
      addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
      yesPlaylist: true,
      embedThumbnail: true,
      addMetadata: true,
      // Eliminamos la opción postProcessors
    };

    const result = await youtubeDl(url, options);
    console.log('Descarga de la lista de reproducción completada:', result);
    
    // Listar los archivos descargados
    const downloadsDir = path.join(process.cwd(), 'downloads');
    const files = fs.readdirSync(downloadsDir);
    console.log('Archivos descargados:', files);

    return downloadsDir;
  } catch (error) {
    console.error('Error en downloadPlaylist:', error);
    throw error;
  }
};