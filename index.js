const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 5000

// middelwer
app.use(cors({
  origin: [
    'http://localhost:5173'
  ],
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ovcfici.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const verifyJWT = (req, res,  next) => {
   const authorization = req.headers.authorization;
   if(!authorization){
    return res.status(401).send({error:true, message:'Not veled access'})
   }
   const token = authorization.split(' ')[1];

   // verify a token symmetric
   jwt.verify(token, process.env.ACCESS_TOKEN, (error, decoded) => {
    if(error){
      return res.status(401).send({error:true, message:'Not veled access'})
    }
    req.decoded = decoded;
    next();
  });
  }

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db("carService").collection("services")
    const productsCollection = client.db("carService").collection("products")
    const bookingsCollection = client.db("carService").collection("Bookings")

    //jwt
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      console.log(user)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: '72h'
      });
      res.cookie('token', token,{
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      })
      .send({success: true});
    })

    app.post('/logout', async(req, res) =>{
      const user = req.body;
      res.clearCookie('token', {maxAge:0}).send({success: true})
    })

    // services api
    app.get('/services', async(req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result)
    })

    app.get('/services/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await serviceCollection.findOne(query)
      res.send(result)
    })

    // bookings

    app.get('/bookings', verifyJWT,  async(req, res) => {
      const decoded = req.decoded
      
      if(decoded.email !== req.query.email){
        return res.status(403).send({error: 1, message: 'unothorez access'})
      }
      let query = {};
      if(req.query?.email){
        query = { email: req.query.email }
      }
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/bookings', async(req, res) => {
      const booking = req.body;
      const result = await bookingsCollection.insertOne(booking);
      res.send(result)
    })

    app.delete('/bookings/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await bookingsCollection.deleteOne(query)
      res.send(result)
    })

    app.patch('/bookings/:id', async(req, res) =>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updateBooking = req.body;
      console.log(updateBooking)
      const updateDoc = {
        $set: {
          status: updateBooking.status
        },
      };
      const result = await bookingsCollection.updateOne(filter, updateDoc)
      res.send(result)
    })


    app.get('/products', async(req, res) => {
      const cursor = productsCollection.find();
      const result = await cursor.toArray();
      res.send(result)
    })
    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})