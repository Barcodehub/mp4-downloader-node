const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

exports.downloadPDF = async (url) => {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const pdfLink = $('a[href$=".pdf"]').attr('href');

    if (pdfLink) {
      let pdfUrl = pdfLink;
      if (!pdfUrl.startsWith('http')) {
        const baseUrl = new URL(url);
        pdfUrl = new URL(pdfUrl, baseUrl).href;
      }

      const pdfResponse = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
      const filename = path.basename(pdfUrl);
      fs.writeFileSync(filename, pdfResponse.data);
      return filename;
    }
    return null;
  } catch (error) {
    console.error('Error downloading PDF:', error);
    return null;
  }
};

exports.deleteFile = (filename) => {
  fs.unlink(filename, (err) => {
    if (err) console.error('Error deleting file:', err);
  });
};