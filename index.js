const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const app = express()
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2ogi1ob.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'UnAuthorized access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' })
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();
    const serviceCollection = client.db('manufacturer').collection('services');
    const ordersCollection = client.db('manufacturer').collection('orders');
    const userCollection = client.db('manufacturer').collection('users');

    app.get('/store', async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    app.get('/store/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const store = await serviceCollection.findOne(query);
      res.send(store);
    });
    //  my orders from dashboard
    app.get('/order/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      const authorization = req.headers.authorization;
      const decodedEmail = req.decoded.email;
      if (email === decodedEmail) {
        const query = { email: email };
        const store = await ordersCollection.find(query).toArray();
        res.send(store);
      }
      else{
        return res.status(403).send({message: 'forbidden access'});
      }

    });

    //all users
    app.get('/user', async(req, res) =>{
      const users = await userCollection.find().toArray();
      res.send(users);
    })

    // admin mail 
    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ result, token });
    });

    // app.get('/purchase', async (req, res) => {
    //   const query = {};
    //   const cursor = serviceCollection.find(query);
    //   const services = await cursor.toArray();
    //   res.send(services);
    // });

    // Post
    app.post('/store', async (req, res) => {
      const newService = req.body;
      const result = await ordersCollection.insertOne(newService)
      res.send(result);
    });

    app.put('/delivered/:id', async (req, res) => {
      const id = req.params.id;
      const updataquantity = req.body.quantity
      const updateSell = req.body.sell
      // console.log(req.body);
      const filter = { _id: ObjectId(id) }
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          quantity: updataquantity,
          sell: updateSell
        },
      };
      const result = await serviceCollection.updateOne(filter, updateDoc, options);
      res.send(result)
    })


  }
  finally {

  }

}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Manufacturer server!')
});

app.get('/server', (req, res) => {
  res.send('run server')
});

app.listen(port, () => {
  console.log(`Manufacturer app listening on port ${port}`)
})