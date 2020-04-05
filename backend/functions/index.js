const functions = require('firebase-functions');
const express = require('express');
const firebase = require('firebase');
const func = require('./databaseFunctions');

const app = express();

var config = {
    apiKey: "AIzaSyD6_v5q5Yuwki5-C9uBie551bEHTBtBNcY",
    databaseURL: "https://mtaa-cc329.firebaseio.com/",
    authDomain: "mtaa-cc329.firebaseapp.com"
};

firebase.initializeApp(config);

// Get a reference to the database service
var auth = firebase.auth();

app.get('/helloWorld', (request, response) => {
    writeUserData("0","1","2","3")
    response.status(200).json({ message : "Hello world"})
});

app.post('/user/register', (req, res) => {
    const { name, password, email } = req.body
     
    auth.fetchSignInMethodsForEmail(email).then(
        function(value) {        
            if (value.length > 0) 
            {
                response.status(400).json({ message : "Unable to register, email is allready in use" })
            }
            else 
            {
                auth.createUserWithEmailAndPassword(email, password).catch(function(error) {    
                    response.status(400).json({ 
                        message : error.message,
                        errorCode : error.code
                    })
                }).then(function(value) {
                    
                    func.someFunction(name, email, "customer", value.user.uid)
                    response.status(201).json({
                        message : "User was succesfully created",
                        userId : value.user.uid,
                    })
                });
            }
    });
});

app.post('/user/login', (req, res) => {
    const { password, email } = req.body
    
    auth.signInWithEmailAndPassword(email, password).then(
        function(value) {
            response.status(200).json({
                message : "User " + email + " succesfully signed in",
                userId : value.user.uid
            })
        }, 
        function(error){
            response.status(400).json({
                errorCode : error.code,
                message : error.message
            })
        });
});

app.post('/order/createNew', (req, res) => {
    const { userId, restaurandId, tableId } = req.body;
    var isTableEmpty
    func.checkTableIfFree(restaurandId, tableId).then(function (value) {
        isTableEmpty = value
        console.log(isTableEmpty)
        if (isTableEmpty == true)
        {
            var v = func.createNewOrder(restaurandId, tableId, userId).then(function (value){
                console.log(value)
                res.status(201).json({ 
                    message : "New order was created",
                    order : value
                })
            }, function (error){
                console.log(error)
                res.status(500)
            });
        }
        else
        {
            res.status(403).json({
                order : isTableEmpty,
                message : "Table already has opened order."
            })
        }
    }, function (error){
        console.log(error)
        res.status(500)
    });
 })

app.post('/order/joinRequest', (req, res) => {
    const { userId, restaurandId, tableId, orderId } = req.body;
    func.createJoinTableRequest(restaurandId, tableId, userId, orderId);
})

app.put('/order/addNewUser', (req, res) => {

})

app.get('/restaurant/getMenu', (req, res) => {
    
})

app.get('/restaurant/getFood', (req, res) => {
    
})

app.put('/order/addNewIdem', (req, res) => {
    
})

app.get('/order', (req, res) => {

})

app.get('/order/allItems', (req, res) => {
    
})

app.get('/order/allItemsByUser', (req, res) => {
    
})

app.get('/order/getAllUsers', (req, res) => {
    
})

app.get('/order/itemToSend', (req, res) => {
    
})

app.post('/order/transferRequest', (req, res) => {
    
})

app.put('/odrer/acceptTransfer', (req, res) => {
    
})

app.post('/payment/', (req, res) => {
    
})

exports.app = functions.https.onRequest(app);

