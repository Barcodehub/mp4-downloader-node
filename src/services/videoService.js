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
      addHeader: ['referer:youtube.com', 'user-agent:googlebot']
    };

    const result = await youtubeDl(url, options);
    console.log('Descarga completada:', result);
    
    const files = fs.readdirSync('downloads');
    const downloadedFile = files.find(file => file.includes(path.parse(result).name));
    
    if (!downloadedFile) {
      throw new Error('No se pudo encontrar el archivo descargado');
    }

    return path.join('downloads', downloadedFile);
  } catch (error) {
    console.error('Error en downloadVideo:', error);
    throw error;
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