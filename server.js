const express = require('express');
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();

app.use(express.static('public'));

app.get('/', (req, res) => {
  fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
      return;
    }
    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
});

app.post('/upload', async (req, res) => {
    const form = formidable.formidable({});
    let fields;
    let files;
    try {
        [fields, files] = await form.parse(req);
        
        files.upload.forEach(file => {
          const oldPath = file.filepath;
          const newPath = path.join(__dirname, file.originalFilename);
          fs.renameSync(oldPath, newPath);
          file.newFilename = file.originalFilename; // Update file object with new filename
          delete file.filepath; // Remove the temporary filepath property
        });
        exec(`sh ${path.join(__dirname, 'input.sh')} "${'file'}"`, (error, stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`);
            res.status(500).send('Internal Server Error');
            return;
          }

          console.log(`stdout: ${stdout}`);
          console.error(`stderr: ${stderr}`);

          // Send command output to the client
          res.status(200).send(stdout);
        });

    } catch (err) {
        if (err.code === formidable.Errors.MAX_FIELDS) {
            // Handle specific error
        }
        console.error(err);
        res.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' });
        res.end(String(err));
        return;
    }
    // res.status(200).send({
    //     fields,
    //     files
    // });
});

// Handle text upload and execute shell command
app.post('/uploadText', (req, res) => {
  let data = '';

  req.on('data', chunk => {
    // Append incoming data chunks to form a complete string
    data += chunk.toString();
  });

  req.on('end', () => {
    // Execute input.sh script
    exec(`sh ${path.join(__dirname, 'input.sh')} "${data}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        res.status(500).send('Internal Server Error');
        return;
      }

      console.log(`stdout: ${stdout}`);
      console.error(`stderr: ${stderr}`);

      // Send command output to the client
      res.status(200).send(stdout);
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
