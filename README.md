# YouTube Video and Playlist Downloader

A Node.js application that allows users to download individual YouTube videos or entire playlists in various qualities.

## Features

- Download individual YouTube videos
- Download entire YouTube playlists
- Choose video quality (best or HD)
- Automatic conversion to MP4 format
- Embedded video thumbnails and metadata
- Zip compression for playlist downloads

## Usage

Start the server:

 ```
  npm start
  ```

The server will start running on `http://localhost:3000` (or your configured port).


 ## API endpoints

- To download a single video:
  ```
  POST /api/download
  {
    "url": "https://www.youtube.com/watch?v=VIDEO_ID",
    "quality": "best",
    "type": "video"
  }
  ```

- To download a playlist:
  ```
  POST /download
  {
    "url": "https://www.youtube.com/playlist?list=PLAYLIST_ID",
    "quality": "hd",
    "type": "playlist"
  }
  ```

The server will process the request and send the downloaded file(s) as a response.


## Acknowledgments

- [youtube-dl](httpsgithub.comytdl-orgyoutube-dlbl.txt) for providing the core downloading functionality
