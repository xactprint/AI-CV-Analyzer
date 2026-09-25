const dns = require("dns");
const mongoose = require("mongoose");

/**
 * Some networks (corporate DNS, certain ISPs, Windows with a filtered
 * resolver) answer SRV queries with REFUSED, which breaks every `mongodb+srv://`
 * connection with `querySrv ECONNREFUSED` even though the cluster is reachable.
 * Setting MONGO_DNS_SERVERS (comma separated) points the driver at resolvers
 * that do answer them. Optional: without it the system resolver is used.
 */
const applyDnsServers = () => {
  const servers = (process.env.MONGO_DNS_SERVERS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (servers.length) dns.setServers(servers);
};

/**
 * Connects to MongoDB Atlas / local MongoDB.
 * Mongoose 9 no longer needs useNewUrlParser / useUnifiedTopology.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI is missing. Copy .env.example to .env and add your MongoDB connection string."
    );
  }

  applyDnsServers();

  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log(`MongoDB connected: ${conn.connection.host}`);
  return conn;
};

module.exports = connectDB;
