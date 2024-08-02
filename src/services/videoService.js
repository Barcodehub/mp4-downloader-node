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
      format: quality === 'hd' ? 'bestvideo[height<=1080]+bestaudio/best' : 'best',
      noCheckCertificates: true,
      noWarnings: true,
      addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
      yesPlaylist: true
    };

    const result = await youtubeDl(url, options);
    console.log('Descarga de la lista de reproducción completada:', result);
    
    return 'downloads';
  } catch (error) {
    console.error('Error en downloadPlaylist:', error);
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