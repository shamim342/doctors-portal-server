const express = require('express')
const app = express()
const admin = require("firebase-admin");
const cors = require('cors')
require('dotenv').config()

// doctors-portal-firebase-adminsdk

const serviceAccount = require("./doctors-portal-firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const { MongoClient, ServerApiVersion } = require('mongodb');
const res = require('express/lib/response');


const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json())

const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.USER_PASS}@cluster0.q8coo.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith('Bearer ')) {
    const token = req.headers.authorization.split(' ')[1];

    try {
      const decodeUser = await admin.auth().verifyIdToken(token)
      req.decodeEmail = decodeUser.email;
    } catch {

    }

  }
  next();
}

async function run() {
  try {
    await client.connect();
    const dataBase = client.db('doctors_portal');
    const appoinmentCollection = dataBase.collection('appoinments');
    const userCollection = dataBase.collection('users');

    // Appoinment get method
    app.get('/appoinments', async (req, res) => {
      const email = req.query.email;
      const date = new Date(req.query.date).toLocaleDateString();
      const query = { email: email, date: date }
      const cursor = appoinmentCollection.find(query);
      const appoinments = await cursor.toArray();
      res.json(appoinments);
    })

    // appoinment postmethod
    app.post('/appoinments', async (req, res) => {
      const appoinment = req.body;
      const result = await appoinmentCollection.insertOne(appoinment);
      res.json(result)
    })
    // user postmethod
    app.post('/users', async (req, res) => {
      const users = req.body;
      const result = await userCollection.insertOne(users);
      res.json(result)
    })

    // ?user put method
    app.put('/users', async (req, res) => {
      const user = req.body;
      const filter = { email: user.email }
      const options = { upsert: true };
      const updateDoc = {
        $set: user
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.json(result)
    })

    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const user = await userCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === 'admin') {
        isAdmin = true;
      }
      res.json(isAdmin = { isAdmin })
    })

    // ?put admin
    app.put('/users/admin', verifyToken, async (req, res) => {
      const user = req.body;
      const requester = req.decodeEmail;
      if (requester) {
        const requesterAccount = await userCollection.findOne({ email: requester })
        if (requesterAccount.role === "admin") {
          const filter = { email: user.email }
          const updateDoc = {
            $set: { role: "admin" }
          };
          const result = await userCollection.updateOne(filter, updateDoc);
          
        }
      } else {
        res.status(401).json({ message: 'You do not have access to make Admin' })
      }
      res.json(result)

    })


  } finally {
    // Ensures that the client will close when you finish/error
    //   await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/me', (req, res) => {
  res.send('Hello mahmud!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})