const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');

const mongodb = require('mongodb');
eval(`Grid.prototype.findOne = ${Grid.prototype.findOne.toString().replace('nextObject', 'next')}`);


const app = express();

// Middleware
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

const dbName = 'games-db';
const user = 'admin';
const password = '1234';
// Mongo URI
const mongoURI = `mongodb+srv://${user}:${password}@clustergames.x6nub.mongodb.net/${dbName}?retryWrites=true&w=majority`;

// Create mongo connection
const conn = mongoose.createConnection(mongoURI);

// Init gfs
let gfs;

conn.once('open', () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});

// Create storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });
const download = multer({ storage });

// @route GET /
// @desc Loads form
app.get('/', (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      res.render('index', { files: false });
    } else {
      files.map(file => {
        if (
          file.contentType === 'image/jpeg' ||
          file.contentType === 'image/png'
        ) {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });
      res.render('index', { files: files });
    }
  });
});

// @route POST /upload
// @desc  Uploads file to DB
app.post('/upload', upload.single('file'), (req, res) => {
  //res.json({ file: req.file });
  res.redirect('/');
  console.log('subido');
});


app.get('/download', download.single('file'), (req, res) => {
    // res.json({ file: req.file });
    res.redirect('/');
    console.log('descarga');
  });

// @route GET /files
// @desc  Display all files in JSON
app.get('/files', (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: 'No files exist'
      });
    }

    // Files exist
    return res.json(files);
  });
});

// @route GET /files/:filename
// @desc  Display single file object
app.get('/files/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }
    // File exists
    return res.json(file);
  });
});

// @route GET /image/:filename
// @desc Display Image
app.get('/image/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }

    // Check if image
    if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
      // Read output to browser
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: 'Not an image'
      });
    }
  });
});

// @route DELETE /files/:id
// @desc  Delete file
app.delete('/files/:id', (req, res) => {
  gfs.remove({ _id: req.params.id, root: 'uploads' }, (err, gridStore) => {
    if (err) {
      return res.status(404).json({ err: err });
    }

    res.redirect('/');
  });
});

//Aquí comienza el download

app.get('/download', async (req, res) => {
    var id = "<file_id_xyz>";
    gfs = Grid(conn.db, mongoose.mongo);
    console.log('Descarga');

    gfs.collection("<name_of_collection>").findOne({ "_id": mongodb.ObjectId(id) }, (err, file) => {
        console.log('Descarga');
        if (err) {
            // report the error
            console.log(err);
        } else {
            // detect the content type and set the appropriate response headers.
            let mimeType = file.contentType;
            if (!mimeType) {
                mimeType = mime.lookup(file.filename);
            }
            res.set({
                'Content-Type': mimeType,
                'Content-Disposition': 'attachment; filename=' + file.filename
            });

            const readStream = gfs.createReadStream({
                _id: id
            });
            readStream.on('error', err => {
                // report stream error
                console.log(err);
            });
            // the response will be the file itself.
            readStream.pipe(res);
        }
    });
    console.log('Descarga');
});


const port = 5000;

app.listen(port, () => console.log(`listening at: http://localhost:${port}`));