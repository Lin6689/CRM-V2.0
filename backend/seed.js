// Client accounts seed script — run once: node seed.js
// Har client ke liye neeche entry add karo, phir script chalao.
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
require("dotenv").config();

const SUPER_ADMIN = {
  name: "Super Admin",
  email: "",
  password: "Admin@123",
  businessName: "CRM HQ",
};

// 👇 Naye client yahan add karo — email + password yahin set hota hai
const CLIENTS = [
  {
    name: "Client Owner",
    email: "client@gmail.com",
    password: "Client@123",
    businessName: "Client Business Name",
    address: "Client Shop Address",
  },
  {
  name: "Owner Name",
  email: "manish@gmail.com",
  password: "Manish@123",
  businessName: "Shop Name",
  address: "Shop Address",
},
{
  name: "ketan",
  email: "ketan@gmail.com",
  password: "Ketann@123",
  businessName: "Shop Name",
  address: "Shop Address",
},
{
  name: "ketands",
  email: "ketands@gmail.com",
  password: "Ketannsd@123",
  businessName: "Shop Name",
  address: "Shop Address",
},

];

(async () => {
  await mongoose.connect(
    process.env.MONGODB_URI ||
      "mongodb+srv://dhavalll852004_db_user:HAy6x0lelQWI4WvP@cluster0.1okxzjw.mongodb.net/CRM"
  );

  // Super admin (sirf ek baar banega)
  const saHash = await bcrypt.hash(SUPER_ADMIN.password, 10);
  const sa = await User.findOneAndUpdate(
    { email: SUPER_ADMIN.email },
    {
      name: SUPER_ADMIN.name,
      passwordHash: saHash,
      businessName: SUPER_ADMIN.businessName,
      role: "superadmin",
    },
    { upsert: true, new: true }
  );
  sa.businessId = sa._id;
  await sa.save();
  console.log(`Super admin ready: ${SUPER_ADMIN.email} / ${SUPER_ADMIN.password}`);

  // Clients
  for (const c of CLIENTS) {
    const exists = await User.findOne({ email: c.email });
    if (exists) { console.log(`Skip (exists): ${c.email}`); continue; }
    const hash = await bcrypt.hash(c.password, 10);
    const bizId = new mongoose.Types.ObjectId();
    await User.create({
      name: c.name, email: c.email, passwordHash: hash,
      businessName: c.businessName, address: c.address || "",
      role: "admin", businessId: bizId,
    });
    console.log(`Client created: ${c.email} / ${c.password} — ${c.businessName}`);
  }

  await mongoose.disconnect();
  console.log("Done!");
})();
