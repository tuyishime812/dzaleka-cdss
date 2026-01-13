// fallback server for local development
const app = require('./api/index_simple');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`School Portal Server is running on port ${PORT}`);
});