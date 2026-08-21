const express = require('express');
const path = require('path');
const app = express();

// Statik fayllarni (index.html) tarqatish
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
