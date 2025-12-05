const app = require('./app');

const PORT = process.env.PORT || 4000;

const statsRoutes = require('./routes/stats.routes');
app.use('/stats', statsRoutes);

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
