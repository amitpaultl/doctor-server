const express = require('express');
const cors = require('cors');
const prot = process.env.PROT || 5000;
require('dotenv').config();
const app = express();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// password = 3lzI8bs8rNHfTiWD
// user = doctorProtal

//middleware
app.use(cors());
app.use(express.json());

const key_stripe = 'sk_test_51M64lzDCOyG8s9oVPLEDn9rEoxHohqozjL00OF3Kn2OFMwI6XW0Mu0DdhqrvtvSVZUG0363NlghTfsxDUypd2xap00fEcnGxCT'

const stripe = require("stripe")(key_stripe)

// mongodb

const uri = `mongodb+srv://${process.env.Db_USER}:${process.env.Db_PASSWORD}@cluster0.acij04d.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



// mongodb connect  
const dbConnent = async () => {
    try {
        await client.connect();


    }
    catch (error) {
        console.log(error);

    }

}
dbConnent()

// get data 
const doctor = client.db('doctoprotal').collection('service');
const booking = client.db('doctoprotal').collection('booking');
const user = client.db('doctoprotal').collection('user');
const doctorCullation = client.db('doctoprotal').collection('doctorCullation');
const paymentColletion = client.db('doctoprotal').collection('payment');

// jwt 
function veriFJwt(req, res, next) {
    const authHeader = req.headers.authorization;
   
    if (!authHeader) {
        return res.status(401).send('unauthorized')
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.Jwt_Token, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })
}

// pamment 
app.post("/create-payment-intent", async (req, res) =>{
    const booking = req.body;
    const price = booking.price;
    const amount = price * 100;
    console.log('booking',booking);
    const paymentIntent = await stripe.paymentIntents.create({
        currency:'usd',
        amount:amount,
        "payment_method_types":[
            "card"
        ]
    });
    res.send({
        clientSecret:paymentIntent.client_secret,
    })
})

// jwtAdmin
const verifyAdmin = async(req,res,next)=>{
    const decodedEmail =req.decoded.email;
    const query ={email:decodedEmail};
    const usersAdmin = await user.findOne(query)
    if(usersAdmin?.role !== 'admin'){
        return res.status(403).send({message:'Forbidden access'})
    }

    next()
}

// get data
app.get("/option", async (req, res) => {

    try {
        const dates = req.query.date;

        const query = {};
        const cursor = doctor.find(query);
        const service = await cursor.toArray()
        const bookingQuery = { appintmentDate: dates };
        const alreadyBooking = await booking.find(bookingQuery).toArray();


        service.forEach(option => {
            const optionBooked = alreadyBooking.filter(book => book.treatment === option.name)
            const bookedSlort = optionBooked.map(book => book.slots)
            const remainingSlotes = option.slots.filter(slot => !bookedSlort.includes(slot))
            option.slots = remainingSlotes


            // console.log(date, service.name,bookedSlort);
            // console.log(bookedSlort);
        })

        res.send({
            success: true,
            data: service,
            message: 'Successfully get data'
        })

    } catch (error) {
        res.send({
            success: false,
            error: error.message,
        })

    }




})

// option specialty
app.get('/optionSpecialty',async(req, res)=>{
    const query = {};
    const resust = await doctor.find(query).project({name:1}).toArray()
    res.send(resust)

})

// post doctor caution
app.post('/doctors', veriFJwt,verifyAdmin, async(req,res)=>{
    try {
        const doctor = req.body;
        const result = await doctorCullation.insertOne(doctor);
        res.send({
            success: true,
            data: result,
            message: 'Successfully get data'
        })
        
    } catch (error) {
        res.send({
            success: false,
            error: error.message,
        })
    }
})
// get doctor caution
app.get('/doctors', veriFJwt,verifyAdmin, async(req,res)=>{
    try {
        const doctor = {};
        const result = await doctorCullation.find(doctor).toArray();
        res.send({
            success: true,
            data: result,
            message: 'Successfully get data'
        })
        
    } catch (error) {
        res.send({
            success: false,
            error: error.message,
        })
    }
})
// delete doctor
app.delete('/doctors/:id', veriFJwt,verifyAdmin, async(req,res)=>{
    try {
        const id =req.params.id;
        const filter = {_id:ObjectId(id)}
        const query = await doctorCullation.deleteOne(filter);
        res.send({
            success: true,
            data: query,
            message: 'Successfully get data'
        })
        
    } catch (error) {
        res.send({
            success: false,
            error: error.message,
        })
    }
})

// jwt 
app.get('/jwt', async (req, res) => {
    const email = req.query.email;
    const query = { email: email };
    const usere = await user.findOne(query);
    if (usere) {
        const token = jwt.sign({ email }, process.env.Jwt_Token);
        return res.send({ accessToken: token });
    }
    res.status(403).send({ accessToken: ' ' })
})

// post 
app.post('/booking', async (req, res) => {
    try {
        const book = req.body;
        const result = await booking.insertOne(book);
        const query = {
            appintmentDate: book.appintmentDate
        }
        // const alreadybook = await booking.find(query).toArray()
        // if(alreadybook.length){
        //     const message = `you already have book`
        //     return res.send (message)
        // }
        res.send({
            success: true,
            data: result,
            message: 'Successfully get data'
        })

    } catch (error) {
        res.send({
            success: false,
            error: error.message,
        })
    }
})

// get booking
app.get('/booking', veriFJwt, async (req, res) => {
    try {
        const decodeeEmail = req.decoded.email;
        const email = req.query.email;
        if (email !== decodeeEmail) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        const query = { email: email }

        const bookings = await booking.find(query).toArray()

        res.send({
            success: true,
            data: bookings,
            message: 'Successfully get data'
        })

    } catch (error) {
        res.send({
            success: false,
            error: error.message,
        })
    }
})
// get booking
app.get('/booking/:id', async (req, res) => {
    try {
        const id = req.params.id
        const query = {_id:ObjectId(id)}

        const bookings = await booking.find(query).toArray()

        res.send({
            success: true,
            data: bookings,
            message: 'Successfully get data'
        })

    } catch (error) {
        res.send({
            success: false,
            error: error.message,
        })
    }
})

// user post 
app.post('/createUser', async (req, res) => {
    try {
        const createUser = req.body;
        const result = await user.insertOne(createUser);
        res.send({
            success: true,
            data: result,
            message: 'Successfully get data'
        })

    } catch (error) {
        res.send({
            success: false,
            error: error.message,
        })

    }
})

// user get 
app.get('/createUser', async (req, res) => {
    try {
        const query = {};
        const users = await user.find(query).toArray()
      
        res.send({
            success: true,
            data: users,
            
        })
    } catch (error) {
        res.send({
            success: false,
            error: error.message,
        })
    }
})

// get admin user 
app.get('/createUser/admin/:email', async (req,res)=>{
    try {
        const email = req.params.email;
        const query = {email};
        const users = await user.findOne(query)
        res.send({isAdmin: users?.role === 'admin'});
        
    } catch (error) {
        res.send({
            success: false,
            error: error.message,
        })
    }
})

// put admin
app.put('/createUser/admin/:id', veriFJwt, async (req,res)=>{
    try {
        const decodedEmail =req.decoded.email;
        const query ={email:decodedEmail};
        const usersAdmin = await user.findOne(query)
        if(usersAdmin?.role !== 'admin'){
            return res.status(403).send({message:'Forbidden access'})
        }


        const id = req.params.id;
        const filter = {_id:ObjectId(id)};
     
        const option = {upsert : true};
        const updateId = {
            $set:{
                role: 'admin'
            }
        }
        const result = await user.updateOne(filter,updateId,option)
        res.send({
            success: true,
            data: result,
            
        })
    } catch (error) {
        res.send({
            success: false,
            error: error.message,
        })
        
    }
})

// pament 

app.post('/payments',async(req,res)=>{
    const payment = req.body;
    const result = await paymentColletion.insertOne(payment);
    const id = payment.bookingId;
    const filter = {_id:ObjectId(id)}
    const updateDoc = {
        $set:{
            paid:true,
            transactionId:payment.transactionId
        }
    }
    const updateResult = await booking.updateOne(filter,updateDoc)
    res.send(result)
})

// app.get('/addprice', async(req,res)=>{
//     const filter = {};
//     const option = {upsert:true};
//     const updateDoc = {
//         $set:{
//             price:99
//         }
//     }
//     const resust = await doctor.updateMany(filter,updateDoc,option)
//     res.send(resust)
// })





app.get('/', (req, res) => {
    res.send('doctor portal server running')
})

app.listen(prot, () => {
    console.log('Doctor portal log');
})