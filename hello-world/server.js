const express = require('express');
require('dotenv').config({ path: '../.env' });

const app = express();
const PORT = process.env.HELLO_WORLD_PORT || 3000;

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8" />
        <title>Hello World</title>
    </head>
    <body>
        <h1>Hello World!</h1>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});